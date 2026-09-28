import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getAuthToken } from "@/utils/authStorage";

window.Pusher = Pusher;

const WS_HOST = import.meta.env.VITE_WS_HOST || "localhost";

// Production is served over https, and browsers block insecure ws:// as mixed
// content, so TLS is enabled whenever the page itself is secure.
const FORCE_TLS =
  import.meta.env.VITE_WS_FORCE_TLS === "true" ||
  (typeof window !== "undefined" && window.location.protocol === "https:");

const WS_PORT = FORCE_TLS ? 443 : Number(import.meta.env.VITE_WS_PORT || 8080);
const REVERB_KEY = import.meta.env.VITE_REVERB_KEY || "newmoon-app-key";
const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/api\/?$/, "");

// VITE_* values are inlined at build time, so a build that runs without them
// produces a bundle pointing at localhost. render.yaml injects all six for the
// deployed site; warn rather than fail silently, because the symptom (orders
// never updating in the admin) looks like a backend problem.
if (!import.meta.env.VITE_WS_HOST) {
  console.warn(
    "[WebSocket] VITE_WS_HOST is not set; falling back to localhost:8080. " +
      "Order updates will not work in this build."
  );
}

let echo = null;

/**
 * Pusher reads `auth.headers` at the moment it calls authEndpoint, not when the
 * client is constructed. Passing one long-lived object means mutating it
 * refreshes the bearer token for every later private-channel auth without
 * rebuilding Echo.
 */
const authHeaders = { Accept: "application/json" };

const syncAuthHeaders = () => {
  const token = getAuthToken();
  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  } else {
    // Never send "Bearer null" or an empty Authorization value: Laravel answers
    // either with 401 and the private channel never opens.
    delete authHeaders.Authorization;
  }
};

export const getEcho = () => {
  if (echo) return echo;

  syncAuthHeaders();

  echo = new Echo({
    broadcaster: "pusher",
    key: REVERB_KEY,
    wsHost: WS_HOST,
    wsPort: WS_PORT,
    wssPort: WS_PORT,
    forceTLS: FORCE_TLS,
    encrypted: FORCE_TLS,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${API_ORIGIN}/broadcasting/auth`,
    auth: { headers: authHeaders },
  });

  // Reverb drops idle sockets and Render sleeps free-tier services, so the
  // connection is re-established on its own. Re-read the token here: Echo may
  // have been built before login stored it, or a re-login may have replaced it.
  echo.connector.pusher.connection.bind("connected", () => {
    syncAuthHeaders();
  });

  return echo;
};

/* ------------------------------------------------------------------ */
/* Channel reference counting                                          */
/*                                                                     */
/* Echo's stopListening(event) drops every handler registered for that */
/* event, and leave(channel) unsubscribes the whole channel. Several   */
/* screens can watch staff.orders at once, so a naive teardown silently */
/* unsubscribed the screens that were still mounted.                    */
/* ------------------------------------------------------------------ */

const eventRefs = new Map();
const channelRefs = new Map();

const eventKey = (channel, event) => `${channel}|${event}`;

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

/** Returns true when other subscribers still hold a reference. */
const drop = (map, key) => {
  const next = (map.get(key) ?? 0) - 1;
  if (next > 0) {
    map.set(key, next);
    return true;
  }
  map.delete(key);
  return false;
};

const subscribe = (channelName, handlers) => {
  const instance = getEcho();
  if (!instance) return () => {};

  const events = Object.keys(handlers);
  const channel = instance.private(channelName);

  // Counted synchronously so two screens subscribing in one tick cannot race
  // into a duplicate listen() or an early teardown.
  events.forEach((event) => bump(eventRefs, eventKey(channelName, event)));
  bump(channelRefs, channelName);

  events.forEach((event) => channel.listen(event, handlers[event]));

  return () => {
    const releaseChannel = drop(channelRefs, channelName);
    const unreferenced = events.filter((event) => !drop(eventRefs, eventKey(channelName, event)));

    // Other screens are still watching: leave the socket and their handlers alone.
    if (unreferenced.length === 0) return;

    unreferenced.forEach((event) => channel.stopListening(event));
    if (releaseChannel) {
      instance.leave(channelName);
    }
  };
};

/**
 * Subscribe to the private staff channel.
 * Returns a cleanup function.
 */
export const listenStaffOrders = (onOrderStatusUpdated, onNewOrderCreated) =>
  subscribe("staff.orders", {
    ".OrderStatusUpdated": (data) => onOrderStatusUpdated?.(data),
    ".NewOrderCreated": (data) => onNewOrderCreated?.(data),
  });

export const disconnectEcho = () => {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
  eventRefs.clear();
  channelRefs.clear();
};
