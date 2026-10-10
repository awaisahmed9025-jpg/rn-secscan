import { default as Storage } from "@react-native-async-storage/async-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function aliasedStorage(authToken: string) {
  Storage.setItem("token", authToken);
}

export function wrappedStorage(value: string) {
  writeStorage("token", value);
}

function writeStorage(key: string, value: string) {
  AsyncStorage.setItem(key, value);
}
