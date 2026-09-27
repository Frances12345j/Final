import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const WS_HOST = "192.168.254.101";
const WS_PORT = 8080;
const REVERB_KEY = "newmoon-app-key";

let echo = null;

export const getEcho = () => {
  if (echo) return echo;

  const token = localStorage.getItem("token");

  echo = new Echo({
    broadcaster: "pusher",
    key: REVERB_KEY,
    wsHost: WS_HOST,
    wsPort: WS_PORT,
    wssPort: WS_PORT,
    forceTLS: false,
    encrypted: false,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    authEndpoint: "http://192.168.254.101:8000/broadcasting/auth",
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
