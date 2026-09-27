// Authentication storage helper for Web Admin
// Uses sessionStorage so that sessions don't linger forever across browser closures,
// and automatically clears sessions when the dev server is restarted.

export const getAuthToken = () => {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
};

export const getAuthUser = () => {
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getAuthRole = () => {
  const role = sessionStorage.getItem("role") || localStorage.getItem("role");
  if (role) return String(role).trim().toLowerCase();
  const user = getAuthUser();
  if (user?.role) return String(user.role).trim().toLowerCase();
  return "";
};

export const getIsLoggedIn = () => {
  return (
    sessionStorage.getItem("isLoggedIn") === "true" ||
    (localStorage.getItem("isLoggedIn") === "true" && !sessionStorage.getItem("session_ended"))
  );
};

export const setAuthSession = (token, user, role) => {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("role", role || user?.role || "");
  sessionStorage.setItem("isLoggedIn", "true");
  sessionStorage.removeItem("session_ended");

  // Clear persistent localStorage so stale logins from previous runs don't stick around
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("isLoggedIn");
};

export const clearAuthSession = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.setItem("session_ended", "true");

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("isLoggedIn");
};

export const checkDevRunSession = () => {
  if (typeof window === "undefined") return;
  try {
    // __DEV_RUN_ID__ is injected at dev server start by vite.config.js
    const currentRunId = typeof __DEV_RUN_ID__ !== "undefined" ? String(__DEV_RUN_ID__) : null;
    if (currentRunId) {
      const savedRunId = sessionStorage.getItem("app_dev_run_id");
      if (!savedRunId) {
        // First visit on this tab: store current run ID
        sessionStorage.setItem("app_dev_run_id", currentRunId);
      } else if (savedRunId !== currentRunId) {
        // Dev server was cancelled and restarted!
        clearAuthSession();
        sessionStorage.setItem("app_dev_run_id", currentRunId);
      }
    }
  } catch (e) {
    // Ignore storage errors
  }
};
