import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Echo from 'laravel-echo';
import PusherModule from 'pusher-js/react-native';
import { getToken, deleteToken } from './authStorage';
import { deleteUser } from './userStorage';

/* ================================================================== */
/* Central backend configuration                                       */
/*                                                                    */
/* Supports environment variables (for Render / Production)            */
/* with automatic fallback to local development.                       */
/* ================================================================== */

const ENV_BACKEND_ORIGIN = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export const BACKEND_IP = process.env.EXPO_PUBLIC_BACKEND_IP || '192.168.254.105';

export const API_PORT = process.env.EXPO_PUBLIC_API_PORT || 8000;
export const WEBSOCKET_PORT = process.env.EXPO_PUBLIC_REVERB_PORT
  ? parseInt(process.env.EXPO_PUBLIC_REVERB_PORT, 10)
  : 8080;

export const BACKEND_ORIGIN =
  ENV_BACKEND_ORIGIN ||
  (ENV_API_URL ? ENV_API_URL.replace(/\/api\/?$/, '') : `http://${BACKEND_IP}:${API_PORT}`);

export const API_BASE_URL = ENV_API_URL || `${BACKEND_ORIGIN}/api`;

export const BROADCAST_AUTH_URL = `${BACKEND_ORIGIN}/broadcasting/auth`;

export const STORAGE_URL = `${BACKEND_ORIGIN}/storage`;

const isSecure = BACKEND_ORIGIN.startsWith('https://');

export const WEBSOCKET_HOST =
  process.env.EXPO_PUBLIC_REVERB_HOST ||
  (isSecure ? BACKEND_ORIGIN.replace(/^https?:\/\//, '').split(/[:/]/)[0] : BACKEND_IP);

export const IS_WEBSOCKET_SECURE = isSecure;

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
const WS_PORT = IS_WEBSOCKET_SECURE ? 443 : WEBSOCKET_PORT;
const REVERB_KEY = process.env.EXPO_PUBLIC_REVERB_KEY || 'newmoon-app-key';

const Pusher = (PusherModule as any).Pusher ?? PusherModule;

let echo: Echo<any> | null = null;

export const getEcho = async (): Promise<Echo<any> | null> => {
  echo = new Echo({
    broadcaster: 'pusher',
    client: new Pusher(REVERB_KEY, {
      cluster: 'mt1',
      wsHost: WS_HOST,
      wsPort: WS_PORT,
      wssPort: WS_PORT,
      forceTLS: IS_WEBSOCKET_SECURE,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: BROADCAST_AUTH_URL,
      auth: {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
          Accept: 'application/json',
        },
      },
    }),
    disableStats: true,
  });

  return echo;
};

/**
 * Connect to a private channel for an order.
 * Returns a cleanup function. Does nothing if echo initialization fails.
 */
export const listenToOrder = (
  orderId: number | string,
  event: string,
  callback: (data: any) => void
): (() => void) => {
  let channel: any = null;
  let cancelled = false;

  const init = async () => {
    const instance = echo || (await getEcho());
    if (!instance || cancelled) return;
    channel = instance.private(`order.${orderId}`);
    channel.listen(event, (data: any) => callback(data));
  };

  init();

  return () => {
    cancelled = true;
    if (channel) {
      channel.stopListening(event);
      channel.disconnect?.();
    }
  };
};

/**
 * Connect to the staff orders channel.
 * Returns a cleanup function.
 */
export const listenToStaffOrders = (callback: (data: any) => void): (() => void) => {
  let channel: any = null;
  let cancelled = false;

  const init = async () => {
    const instance = echo || (await getEcho());
    if (!instance || cancelled) return;
    channel = instance.private('staff.orders');
    channel.listen('.OrderStatusUpdated', (data: any) => callback(data));
    channel.listen('.NewOrderCreated', (data: any) => callback(data));
  };

  init();

  return () => {
    cancelled = true;
    if (channel) {
      channel.stopListening('.OrderStatusUpdated');
      channel.stopListening('.NewOrderCreated');
      channel.disconnect?.();
    }
  };
};

/**
 * Connect to the rider channel.
 * Returns a cleanup function.
 */
export const listenToRider = (
  riderId: number | string,
  callback: (data: any) => void
): (() => void) => {
  let channel: any = null;
  let cancelled = false;

  const init = async () => {
    const instance = echo || (await getEcho());
    if (!instance || cancelled) return;
    channel = instance.private(`rider.${riderId}`);
    channel.listen('.OrderStatusUpdated', (data: any) => callback(data));
    channel.listen('.NewOrderCreated', (data: any) => callback(data));
    channel.listen('.RiderAssigned', (data: any) => callback(data));
  };

  init();

  return () => {
    cancelled = true;
    if (channel) {
      channel.stopListening('.OrderStatusUpdated');
      channel.stopListening('.NewOrderCreated');
      channel.stopListening('.RiderAssigned');
      channel.disconnect?.();
    }
  };
};

export const disconnectEcho = () => {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
};

export default api;
