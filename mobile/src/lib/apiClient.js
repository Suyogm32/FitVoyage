import axios from "axios";
import { auth } from "./firebase";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  // The API sleeps on free hosting and can take ~60s to wake. The default
  // axios timeout is none, but Android will give up sooner if we don't say.
  timeout: 90000,
});

apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;