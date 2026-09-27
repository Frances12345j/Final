import * as Location from 'expo-location';
import api from './api';

type Pos = { lat: number; lng: number };

let watcher: Location.LocationSubscription | null = null;
let sendInterval: ReturnType<typeof setInterval> | null = null;
let latest: Pos | null = null;
let started = false;
const listeners = new Set<(pos: Pos | null) => void>();

export const getRiderLocation = (): Pos | null => latest;

export const subscribeRiderLocation = (cb: (pos: Pos | null) => void): (() => void) => {
  listeners.add(cb);
  if (latest) cb(latest);
  return () => {
    listeners.delete(cb);
  };
};

const emit = (pos: Pos) => {
  latest = pos;
  listeners.forEach((l) => l(pos));
};

export const startRiderLocationService = async () => {
  if (started) return;
  started = true;

  try {
    watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (loc) => {
        emit({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    );
  } catch {
    // watcher failed — fall back to getCurrentPositionAsync in the interval
  }

  sendInterval = setInterval(async () => {
    let pos = latest;

    if (!pos) {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const p = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          pos = { lat: p.coords.latitude, lng: p.coords.longitude };
          emit(pos);
        }
      } catch {
        // ignore
      }
    }

    if (!pos) return;

    try {
      const res = await api.get('/rider/orders?per_page=50');
      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      const active = raw.filter(
        (o: any) => o.status === 'picked_up' || o.status === 'out_for_delivery'
      );
      for (const order of active) {
        try {
          await api.post(`/rider/orders/${order.id}/location`, {
            latitude: pos.lat,
            longitude: pos.lng,
          });
        } catch {
          // ignore per-order failures
        }
      }
    } catch {
      // ignore fetch failures
    }
  }, 2500);
};

export const stopRiderLocationService = () => {
  started = false;
  latest = null;
  listeners.clear();
  if (watcher) {
    watcher.remove();
    watcher = null;
  }
  if (sendInterval) {
    clearInterval(sendInterval);
    sendInterval = null;
  }
};