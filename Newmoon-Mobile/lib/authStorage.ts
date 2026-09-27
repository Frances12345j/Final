import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export const saveToken = async (token: string) => {
  if (Platform.OS === 'web') {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
};

export const getToken = async () => {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
};

export const deleteToken = async () => {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};