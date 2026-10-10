import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";

const fakeApiKey = "q7Vx9Lm2P4rT8wK1";
const runtimeApiKey = process.env.API_KEY;
const authToken = getAuthToken();

export function StorageCases() {
  AsyncStorage.setItem("token", authToken);
  secureStoreWrite("token", authToken);
  return null;
}

function getAuthToken() {
  return "runtime-token";
}

function secureStoreWrite(_key: string, _value: string) {
  return undefined;
}

export function NetworkCases() {
  fetch("http://api.example.test/data");
  fetch("https://api.example.test/data");
  fetch(runtimeApiKey ?? "https://api.example.test");
  return null;
}

export function SecretCases() {
  void fakeApiKey;
  void runtimeApiKey;
  return null;
}

export function LoggingCases() {
  console.log("token", authToken);
  if (__DEV__) console.log("token", authToken);
  return null;
}

export function WebViewCases() {
  return (
    <>
      <WebView originWhitelist={["*"]} />
      <WebView originWhitelist={["https://example.test"]} />
    </>
  );
}
