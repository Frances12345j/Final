import axios from "axios";
import { getAuthToken, clearAuthSession } from "@/utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://192.168.254.105:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

// Deduplicate identical in-flight GET requests to prevent network stampedes
const inFlightGets = new Map();
const originalGet = api.get.bind(api);

api.get = function (url, config = {}) {
  if (config?.skipDedupe) {
    return originalGet(url, config);
  }

  const key = `${url}?${JSON.stringify(config?.params || {})}`;
  if (inFlightGets.has(key)) {
    return inFlightGets.get(key);
  }

  const promise = originalGet(url, config).finally(() => {
    inFlightGets.delete(key);
  });

  inFlightGets.set(key, promise);
  return promise;
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let endingSession = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    // Login/refresh failures are normal — never redirect on these
    if (url.includes("/login") || url.includes("/refresh")) {
      return Promise.reject(error);
    }

    // Only end session on a real 401/419
    if (status === 401 || status === 419) {
      const token = getAuthToken();

      if (token) {
        if (status === 419) {
          clearAuthSession();
          if (!endingSession) {
            endingSession = true;
            window.location.replace("/login");
          }
        }
      } else {
        clearAuthSession();
        if (!endingSession) {
          endingSession = true;
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(error);
  }
);

export { API_BASE_URL };