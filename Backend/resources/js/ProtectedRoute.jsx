import React, { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getIsLoggedIn, checkDevRunSession } from "./utils/authStorage";

// Simple auth check using session-aware storage
const isAuthenticated = () => {
  checkDevRunSession();
  return getIsLoggedIn();
};

const PUBLIC_PATHS = ["/login"];
const DEFAULT_AUTH_PATH = "/dashboard";

// Duplicates the current history entry so pressing the browser Back button
// lands on the same page instead of the login page.
const seedAuthenticatedHistory = (path) => {
  if (typeof window === "undefined") return;
  window.history.pushState(window.history.state, "", path);
};

// Not logged in → redirect to login page
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Logged in → keep out of the login page
function GuestRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to={DEFAULT_AUTH_PATH} replace />;
  }
  return children;
}

// Blocks the browser Back button from returning an authenticated user
// to the login page.
function AuthHistoryGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const bounced = useRef(false);

  useEffect(() => {
    if (!isAuthenticated() || !PUBLIC_PATHS.includes(location.pathname)) {
      bounced.current = false;
      return;
    }

    if (!bounced.current) {
      bounced.current = true;
      seedAuthenticatedHistory(DEFAULT_AUTH_PATH);
    }

    navigate(DEFAULT_AUTH_PATH, { replace: true });
  }, [location.pathname, navigate]);

  return null;
}

export {
  isAuthenticated,
  AuthHistoryGuard,
  ProtectedRoute,
  GuestRoute,
  seedAuthenticatedHistory,
  PUBLIC_PATHS,
  DEFAULT_AUTH_PATH,
};

export default ProtectedRoute;