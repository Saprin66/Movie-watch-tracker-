import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Хранилище строк между запусками: защищённое хранилище телефона
// (Keychain / Keystore), а в браузере, где его нет, localStorage.
const web = Platform.OS === "web";

export const storage = {
  get: async (key) => (web ? localStorage.getItem(key) : SecureStore.getItemAsync(key)),
  set: async (key, value) => (web ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value)),
  remove: async (key) => (web ? localStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};
