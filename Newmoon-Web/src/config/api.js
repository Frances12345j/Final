import axios from "axios";
import { getAuthToken, clearAuthSession } from "@/utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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
  // getAuthToken() checks sessionStorage first and localStorage second, which
  // matches how setAuthSession stores the token. Reading localStorage directly
  // meant session-based logins sent no Authorization header at all.
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let endingSession = false;

// Full page navigation to the login screen, honouring the Vite `base` so a
// build served from a subdirectory does not drop the prefix.
const loginUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/login`;

const hardRedirectToLogin = () => {
  if (endingSession) return;
  endingSession = true;
  // A hard navigation is only safe when the user actually holds a session:
  // window.location.replace() tears down the SPA, and a reload immediately
  // re-issues whatever request just 401'd. Doing that with no token in hand
  // produced a self-sustaining reload loop on the login screen, because the
  // login page itself makes unauthenticated calls that 401 again.
  window.location.replace(loginUrl);
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    // Login/refresh failures are normal — never redirect on these
    if (url.includes("/login") || url.includes("/refresh")) {
      return Promise.reject(error);
    }

    if (status === 401 || status === 419) {
      // Match the storage the auth helpers actually write to. Reading only
      // localStorage reported "no token" for sessions held in sessionStorage,
      // which took the branch below and logged out a valid session.
      const token = getAuthToken();

      if (!token) {
        // No session to end. The router guards (ProtectedRoute / GuestRoute)
        // already send anonymous users to /login without a reload, so a hard
        // redirect here is both unnecessary and the source of the loop.
        return Promise.reject(error);
      }

      // 419 means the CSRF token no longer matches, so the session is
      // genuinely unusable and must be torn down. A plain 401 with a token
      // present is usually a stale in-flight request racing a fresh token, so
      // it is left to ProtectedRoute to handle.
      if (status === 419) {
        clearAuthSession();
        hardRedirectToLogin();
      }
    }

    return Promise.reject(error);
  }
);

export { API_BASE_URL };