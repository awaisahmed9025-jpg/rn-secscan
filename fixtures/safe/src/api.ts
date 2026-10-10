const BASE_URL = "https://api.example-app.com/v1";
const LOCAL = "http://localhost:8081/status";

export async function getProfile(apiKey: string) {
  return fetch(`${BASE_URL}/profile`, { headers: { "x-api-key": apiKey } });
}

export function debugToken(authToken: string) {
  if (__DEV__) {
    console.log("token", authToken);
  }
}

export const ignored = () => {
  // rn-secscan-ignore RNSEC001
  return AsyncStorageLike.setItem("authToken", "x");
};
declare const AsyncStorageLike: any;
