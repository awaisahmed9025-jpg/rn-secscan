const BASE_URL = "http://api.example-app.com/v1";
const apiKey = "k8Vd2xQp9LmZr4TbW7Yn";

export async function getProfile() {
  return fetch("http://api.example-app.com/profile", { headers: { "x-api-key": apiKey } });
}
