import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveToken, getToken, deleteToken } from '../lib/authStorage';
import {
  getUser,
  deleteUser,
  saveUser,
} from '../lib/userStorage';
import api, { setOnAuthError, setSignedOut, disconnectEcho } from '../lib/api';
import { cacheStaffContextAfterLogin } from '../lib/staffContext';
import { clearResolvedBranchId } from '../lib/branchCache';
import { normalizeUserType, type MobileUserType } from '../lib/userType';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{
    success: boolean;
    token?: string;
    user?: any;
    error?: string;
    errorCode?: 'account_not_found' | string;
    userType?: MobileUserType;
  }>;
  register: (formData: Record<string, string>) => Promise<{
    success: boolean;
    token?: string;
    user?: any;
    error?: string;
    errors?: Record<string, string>;
    userType?: MobileUserType;
  }>;
  signOut: () => Promise<void>;
  user: any;
  userType: MobileUserType | null;
  updateUser: (updates: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function persistAuthSession(
  token: string,
  loggedInUser: any,
  resolvedUserType: MobileUserType,
) {
  await saveToken(token);

  const userWithType = {
    ...loggedInUser,
    role: loggedInUser?.role,
    userType: resolvedUserType,
  };

  const cachedUser = await cacheStaffContextAfterLogin(userWithType);

  return cachedUser;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<MobileUserType | null>(null);

  useEffect(() => {
    checkAuth();
    setOnAuthError(handleSessionExpired);
    return () => setOnAuthError(null);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setSignedOut(true);
    disconnectEcho();
    setUser(null);
    setUserType(null);
    setIsAuthenticated(false);
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      const storedUser = await getUser();
      if (token && storedUser) {
        setSignedOut(false);
        try {
          const meResponse = await api.get('/me');
          const serverUser = meResponse.data?.user ?? meResponse.data;
          const resolvedType = normalizeUserType(String(serverUser?.user_type || serverUser?.role || storedUser?.userType || storedUser?.role || ''));
          if (!resolvedType) {
            await deleteToken();
            await deleteUser();
            setIsAuthenticated(false);
            return;
          }
          setUser(serverUser || storedUser);
          setUserType(resolvedType);
          setIsAuthenticated(true);
        } catch (meError: any) {
          if (meError?.response?.status === 401 || meError?.response?.status === 403) {
            setSignedOut(true);
            await deleteToken();
            await deleteUser();
            setIsAuthenticated(false);
          } else {
            setUser(storedUser);
            setUserType(
              normalizeUserType(String(storedUser?.userType || storedUser?.role || '')) || null
            );
            setIsAuthenticated(true);
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setSignedOut(false);
      const response = await api.post('/login', { username, password });
      const { token, user: loggedInUser, user_type: responseUserType, role: responseRole } = response.data;

      const resolvedUserType =
        normalizeUserType(responseUserType) ||
        normalizeUserType(loggedInUser?.user_type) ||
        normalizeUserType(loggedInUser?.role) ||
        normalizeUserType(responseRole);

      if (!resolvedUserType) {
        return {
          success: false,
          error: 'This account is not authorized for mobile access.',
        };
      }

      const cachedUser = await persistAuthSession(
        token,
        { ...loggedInUser, role: loggedInUser?.role || responseRole },
        resolvedUserType,
      );

      setUser(cachedUser);
      setUserType(resolvedUserType);
      setIsAuthenticated(true);

      return {
        success: true,
        token,
        user: cachedUser,
        userType: resolvedUserType,
      };
    } catch (error: any) {
      if (error?.response?.status === 403) {
        return {
          success: false,
          error: error?.response?.data?.message || 'You do not have permission to access this account type.',
        };
      }

      const errorMessage =
        error?.response?.data?.message || error?.message || 'Login failed';
      return {
        success: false,
        error: errorMessage,
        errorCode: error?.response?.data?.error || undefined,
      };
    }
  };

  const register = async (formData: Record<string, string>) => {
    try {
      setSignedOut(false);
      const response = await api.post('/register', formData);
      const { token, user: registeredUser } = response.data;

      if (!token || !registeredUser) {
        return {
          success: false,
          error: response.data?.message || 'Registration failed.',
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      if (error?.response?.status === 422 && error?.response?.data?.errors) {
        const serverErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(([key, value]) => {
          serverErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
        });
        return {
          success: false,
          error: Object.values(serverErrors)[0] || 'Please check your inputs.',
          errors: serverErrors,
        };
      }

      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Registration failed.',
      };
    }
  };

  const signOut = async () => {
    // Flip the session guard first: screens that are still loading data will
    // fail their in-flight requests, and those failures must not be reported
    // as errors or re-trigger the auth-error broadcast. POST /logout is the
    // one request allowed through so the token is revoked server-side.
    setSignedOut(true);
    try {
      try {
        await api.post('logout', undefined, { allowWhileSignedOut: true });
      } catch {
        // ignore logout API errors
      }
      await deleteToken();
      await deleteUser();
      await clearResolvedBranchId();
      disconnectEcho();
      setUser(null);
      setUserType(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const updateUser = async (updates: Record<string, any>) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    await saveUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        register,
        signOut,
        user,
        userType,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthContext = useAuth;
