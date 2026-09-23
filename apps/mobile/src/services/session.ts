/**
 * Session token storage. Native: the OS keychain/keystore via expo-secure-store.
 * Web preview only: localStorage (not used for real accounts).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'weekwell.session';

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') localStorage.setItem(KEY, token);
  else await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') localStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored.
  }
}
