import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ Replace with your computer's local Wi-Fi IPv4 address
export const API_BASE_URL = "http://10.52.103.237:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

const ACCESS_TOKEN_KEY = "nayapotha_access_token";
const REFRESH_TOKEN_KEY = "nayapotha_refresh_token";
const DEVICE_ID_KEY = "@nayapotha_device_id";

export async function getDeviceIdentity() {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  const deviceName = Device.modelName || Device.deviceName || "Android Phone";
  return { device_id: deviceId, device_name: deviceName };
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// Attach Bearer token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401 via POST /api/v1/auth/refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error("No refresh token");
        const { device_id } = await getDeviceIdentity();
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
          device_id,
        });
        await saveTokens(res.data.access_token, res.data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        await clearTokens();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);