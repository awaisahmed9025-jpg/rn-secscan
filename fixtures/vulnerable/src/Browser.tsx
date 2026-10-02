import React from "react";
import { WebView } from "react-native-webview";

export const Browser = () => (
  <WebView
    source={{ uri: "https://example.com" }}
    originWhitelist={["*"]}
    allowUniversalAccessFromFileURLs
  />
);
