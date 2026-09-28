import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Echo from 'laravel-echo';
import PusherModule from 'pusher-js/react-native';
import { getToken, deleteToken } from './authStorage';
import { deleteUser } from './userStorage';

/* ================================================================== */
/* Central backend configuration                                       */
/*                                                                    */
/* EXPO_PUBLIC_* values are inlined by Metro when the JS bundle is    */
/* built, so they must be present in the EAS build profile (eas.json) */
/* or in a local .env -- changing a .env after a build has no effect  */
/* until the app is rebuilt.                                           */
/*                                                                    */
/* Local development: API and Reverb share one host on ports 8000     */
/* and 8080.                                                           */
/* Production: they are separate origins behind TLS, so the REST API  */
/* and the WebSocket server need their own variables.                  */
/* ================================================================== */

const DEV_HOST = 'https://nmlmlh5.onrender.com/';

const parseOrigin = (value: string) => {
  const match = /^(https?|wss?):\/\/([^/:?#]+)(?::(\d+))?/i.exec(value);
  const scheme = match ? match[1].toLowerCase() : 'http';
  const secure = scheme === 'https' || scheme === 'wss';
  return {
    host: match ? match[2] : DEV_HOST,
    port: match && match[3] ? Number(match[3]) : secure ? 443 : 80,
    secure,
  };
};

const apiEndpoint = parseOrigin(
  process.env.EXPO_PUBLIC_BACKEND_URL || `http://${DEV_HOST}:8000`
);

const wsEndpoint = parseOrigin(
  process.env.EXPO_PUBLIC_WS_URL || `ws://${DEV_HOST}:8080`
);

const authority = (host: string, port: number, secure: boolean) =>
  port === (secure ? 443 : 80) ? host : `${host}:${port}`;

export const BACKEND_IP = apiEndpoint.host;
export const WEBSOCKET_HOST = wsEndpoint.host;

export const API_PORT = apiEndpoint.port;
export const WEBSOCKET_PORT = wsEndpoint.port;

export const BACKEND_ORIGIN = `${apiEndpoint.secure ? 'https' : 'http'}://${authority(
  BACKEND_IP,
  API_PORT,
  apiEndpoint.secure
)}`;

export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;

export const BROADCAST_AUTH_URL = `${BACKEND_ORIGIN}/broadcasting/auth`;

export const STORAGE_URL = `${BACKEND_ORIGIN}/storage`;

/* ------------------------------------------------------------------ */
/* REST API (Axios)                                                    */
/* ------------------------------------------------------------------ */

let onAuthError: (() => void) | null = null;

export const setOnAuthError = (cb: (() => void) | null) => {
  onAuthError = cb;
};

/* ------------------------------------------------------------------ */
/* Session guard                                                        */
/*                                                                     */
/* Once the session ends (explicit logout, or a 401/403 that revokes  */
/* the token) every screen still running its own async loaders keeps  */
/* firing requests. Those requests are rejected with 401, which used to */
/* surface as scary console warnings and left dead screens mounted.    */
/*                                                                     */
/* A single flag lets the interceptor short-circuit the whole app: no  */
/* network call, no token wipe, no auth-error broadcast.               */
/* ------------------------------------------------------------------ */

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Send this request even while the session has ended (used by POST /logout). */
    allowWhileSignedOut?: boolean;
  }
}

export class SessionEndedError extends Error {
  readonly code = 'SESSION_ENDED';

  constructor() {
    super('Session ended');
    this.name = 'SessionEndedError';
  }
}

export const isSessionEndedError = (error: unknown): boolean =>
  error instanceof SessionEndedError ||
  (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'SESSION_ENDED');

let sessionEnded = false;

export const isSignedOut = () => sessionEnded;

export const setSignedOut = (value: boolean) => {
  sessionEnded = value;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (sessionEnded && !config.allowWhileSignedOut) {
    throw new SessionEndedError();
  }
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    // An intentional logout already wiped the token and told the auth
    // context, so a late 401 from a request that was still in flight is not a
    // real failure. Report it as "session ended" so callers stay quiet.
    if (sessionEnded) {
      return Promise.reject(status === 401 || status === 403 ? new SessionEndedError() : error);
    }
    if (status === 401 || status === 403) {
      sessionEnded = true;
      await deleteToken();
      await deleteUser();
      if (onAuthError) onAuthError();
    }
    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ */
/* WebSocket (Laravel Reverb via Pusher + Laravel Echo)                */
/* ------------------------------------------------------------------ */

const WS_HOST = WEBSOCKET_HOST;
const WS_PORT = WEBSOCKET_PORT;
const WS_FORCE_TLS = wsEndpoint.secure;
const REVERB_KEY = process.env.EXPO_PUBLIC_REVERB_KEY || 'newmoon-app-key';

const Pusher = (PusherModule as any).Pusher ?? PusherModule;

let echo: Echo<any> | null = null;
let echoConnecting: Promise<Echo<any> | null> | null = null;

/**
 * Pusher reads `auth.headers` at the moment it calls authEndpoint, not when
 * the client is constructed. Passing one long-lived object means mutating it
 * refreshes the bearer token for every later private-channel auth without
 * rebuilding Echo.
 */
const authHeaders: Record<string, string> = { Accept: 'application/json' };

const syncAuthHeaders = async () => {
  const token = await getToken();
  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  } else {
    // Never send "Bearer null" or an empty Authorization value: Laravel
    // answers either with 401 and the private channel never opens.
    delete authHeaders.Authorization;
  }
};

export const getEcho = async (): Promise<Echo<any> | null> => {
  // Reuse the live instance. Rebuilding per caller left several Echo objects
  // fighting over one socket, so only the last one received events.
  if (echo) return echo;

  // Screens that mount in the same tick all await getEcho(). Without a shared
  // in-flight promise each one would build its own client.
  if (echoConnecting) return echoConnecting;

  echoConnecting = (async () => {
    await syncAuthHeaders();

    const instance: Echo<any> = new Echo({
      broadcaster: 'pusher',
      client: new Pusher(REVERB_KEY, {
        cluster: 'mt1',
        wsHost: WS_HOST,
        wsPort: WS_PORT,
        wssPort: WS_PORT,
        forceTLS: WS_FORCE_TLS,
        enabledTransports: WS_FORCE_TLS ? ['wss'] : ['ws'],
        authEndpoint: BROADCAST_AUTH_URL,
        auth: { headers: authHeaders },
      }),
      disableStats: true,
    });

    // Reverb drops idle sockets and Render sleeps free-tier services, so the
    // connection is re-established on its own. Re-read the token here: Echo may
    // have been built before the token reached SecureStore, or a re-login may
    // have replaced it in the meantime.
    instance.connector.pusher.connection.bind('connected', () => {
      void syncAuthHeaders();
    });

    echo = instance;
    return instance;
  })();

  try {
    return await echoConnecting;
  } finally {
    echoConnecting = null;
  }
};

/* ------------------------------------------------------------------ */
/* Channel reference counting                                          */
/*                                                                     */
/* Echo's stopListening(event) drops every handler registered for that */
/* event, and leave(channel) unsubscribes the whole channel. Several   */
/* screens watch the same channel -- the rider tabs both listen on     */
/* rider.{id} -- so a naive teardown silently unsubscribed the        */
/* siblings that were still mounted.                                   */
/* ------------------------------------------------------------------ */

const eventRefs = new Map<string, number>();
const channelRefs = new Map<string, number>();

const eventKey = (channel: string, event: string) => `${channel}|${event}`;

const bump = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

/** Returns true when other subscribers still hold a reference. */
const drop = (map: Map<string, number>, key: string) => {
  const next = (map.get(key) ?? 0) - 1;
  if (next > 0) {
    map.set(key, next);
    return true;
  }
  map.delete(key);
  return false;
};

const subscribe = (channelName: string, events: string[], callback: (data: any) => void): (() => void) => {
  let instance: Echo<any> | null = null;
  let channel: any = null;
  let cancelled = false;

  // Counted synchronously so two screens subscribing in one tick cannot race
  // into a duplicate listen() or an early teardown.
  events.forEach((event) => bump(eventRefs, eventKey(channelName, event)));
  bump(channelRefs, channelName);

  const release = () => {
    const releaseChannel = drop(channelRefs, channelName);
    const unreferenced = events.filter((event) => !drop(eventRefs, eventKey(channelName, event)));

    // Other screens are still watching: leave the socket and their handlers alone.
    if (unreferenced.length === 0) return;

    if (channel) {
      unreferenced.forEach((event) => channel.stopListening(event));
    }
    if (releaseChannel && instance) {
      instance.leave(channelName);
    }
  };

  const init = async () => {
    const resolved = echo || (await getEcho());
    if (!resolved || cancelled) {
      release();
      return;
    }
    instance = resolved;
    channel = instance.private(channelName);
    events.forEach((event) => {
      channel.listen(event, (data: any) => callback(data));
    });
  };

  void init();

  return () => {
    if (cancelled) return;
    cancelled = true;
    release();
  };
};

/**
 * Connect to a private channel for an order.
 * Returns a cleanup function.
 */
export const listenToOrder = (
  orderId: number | string,
  event: string,
  callback: (data: any) => void
): (() => void) => subscribe(`order.${orderId}`, [event], callback);

/**
 * Connect to the staff orders channel.
 * Returns a cleanup function.
 */
export const listenToStaffOrders = (callback: (data: any) => void): (() => void) =>
  subscribe('staff.orders', ['.OrderStatusUpdated', '.NewOrderCreated'], callback);

/**
 * Connect to the rider channel.
 * Returns a cleanup function.
 */
export const listenToRider = (riderId: number | string, callback: (data: any) => void): (() => void) =>
  subscribe(`rider.${riderId}`, ['.OrderStatusUpdated', '.NewOrderCreated', '.RiderAssigned'], callback);

export const disconnectEcho = () => {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
  // A teardown in flight would otherwise keep the disposed instance alive.
  echoConnecting = null;
  eventRefs.clear();
  channelRefs.clear();
};

export default api;
