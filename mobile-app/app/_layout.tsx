import "../global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  NotoSansSinhala_400Regular,
  NotoSansSinhala_500Medium,
  NotoSansSinhala_600SemiBold,
  NotoSansSinhala_700Bold,
} from "@expo-google-fonts/noto-sans-sinhala";
import * as SplashScreen from "expo-splash-screen";
import { LanguageProvider } from "../context/LanguageContext";
import { AuthProvider } from "../context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansSinhala_400Regular,
    NotoSansSinhala_500Medium,
    NotoSansSinhala_600SemiBold,
    NotoSansSinhala_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
 <SafeAreaProvider>
     <LanguageProvider>
      <AuthProvider>
       <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="language" />
    <Stack.Screen name="login" />
  <Stack.Screen name="register" />
  <Stack.Screen name="forgot-password" />
  <Stack.Screen name="home" />
  <Stack.Screen name="notifications" />
  <Stack.Screen name="customers/index" />
  <Stack.Screen name="customers/add" />
  <Stack.Screen name="customers/[id]" />
  <Stack.Screen name="customers/edit/[id]" />
</Stack>
      </AuthProvider>
    </LanguageProvider>
 </SafeAreaProvider>
  );
}