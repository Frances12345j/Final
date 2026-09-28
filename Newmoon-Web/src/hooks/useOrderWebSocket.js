import Echo from "laravel-echo";
import Pusher from "pusher-js";

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

import { getAuthToken } from "@/utils/authStorage";

let echo = null;

export const getEcho = () => {
  if (echo) return echo;

  const token = getAuthToken();

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
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  });

  return echo;
};

/**
 * Subscribe to the private staff channel.
 * Returns a cleanup function.
 */
export const listenStaffOrders = (onOrderStatusUpdated, onNewOrderCreated) => {
  const instance = getEcho();
  if (!instance) return () => {};

  const channel = instance.private("staff.orders");

  const statusHandler = (data) => onOrderStatusUpdated?.(data);
  const newOrderHandler = (data) => onNewOrderCreated?.(data);

  channel.listen(".OrderStatusUpdated", statusHandler);
  channel.listen(".NewOrderCreated", newOrderHandler);

  return () => {
    channel.stopListening(".OrderStatusUpdated", statusHandler);
    channel.stopListening(".NewOrderCreated", newOrderHandler);
    channel.disconnect?.();
  };
};

export const disconnectEcho = () => {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
};
