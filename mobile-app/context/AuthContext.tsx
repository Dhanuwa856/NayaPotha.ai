import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { api, getDeviceIdentity, saveTokens, clearTokens } from "../services/api";

interface AuthContextType {
  owner: any | null;
  shop: any | null;
  isLoadingAuth: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: { name: string; phone: string; password: string; shop_name: string; address?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<any | null>(null);
  const [shop, setShop] = useState<any | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  // Calls GET /api/v1/auth/me on app startup
  const restoreSession = async () => {
    try {
      const token = await SecureStore.getItemAsync("nayapotha_access_token");
      if (!token) return;
      const res = await api.get("/auth/me");
      setOwner(res.data.owner);
      setShop(res.data.shop);
    } catch {
      await clearTokens();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Calls POST /api/v1/auth/login
  const login = async (phone: string, password: string) => {
    const device = await getDeviceIdentity();
    const res = await api.post("/auth/login", {
      phone,
      password,
      device_id: device.device_id,
      device_name: device.device_name,
    });
    await saveTokens(res.data.access_token, res.data.refresh_token);
    setOwner(res.data.owner);
    setShop(res.data.shop);
  };

  // Calls POST /api/v1/auth/register
  const register = async (payload: { name: string; phone: string; password: string; shop_name: string; address?: string }) => {
    const device = await getDeviceIdentity();
    const res = await api.post("/auth/register", {
      ...payload,
      device_id: device.device_id,
      device_name: device.device_name,
    });
    await saveTokens(res.data.access_token, res.data.refresh_token);
    setOwner(res.data.owner);
    setShop(res.data.shop);
  };

  // Calls POST /api/v1/auth/logout
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      await clearTokens();
      setOwner(null);
      setShop(null);
    }
  };

  return (
    <AuthContext.Provider value={{ owner, shop, isLoadingAuth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}