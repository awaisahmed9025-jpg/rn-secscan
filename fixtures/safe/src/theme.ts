import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveTheme(theme: string) {
  await AsyncStorage.setItem("theme", theme);
}
