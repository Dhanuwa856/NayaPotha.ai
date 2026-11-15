import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Home, Users, FileBarChart2, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useLanguage } from "../../context/LanguageContext";

export type NavTab = "Home" | "Customers" | "Reports" | "Settings";

interface BottomNavProps {
  active: NavTab;
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();

  const tabs: { key: NavTab; label: string; route: string; Icon: any }[] = [
    { key: "Home", label: t.navHome, route: "/home", Icon: Home },
    { key: "Customers", label: t.navCustomers, route: "/customers", Icon: Users },
    { key: "Reports", label: t.navReports, route: "/reports", Icon: FileBarChart2 },
    { key: "Settings", label: t.navSettings, route: "/settings", Icon: Settings },
  ];

  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 14),
        left: 16,
        right: 16,
        ...styles.shadow,
      }}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 85 : 70}
        tint="light"
        style={styles.glassContainer}
      >
        <View className="flex-row items-center h-[70px] px-2">
          {tabs.map(({ key, label, route, Icon }) => {
            const isActive = active === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                onPress={() => {
                  if (!isActive) router.push(route as any);
                }}
                className={`flex-1 items-center justify-center h-14 mx-1 rounded-2xl ${
                  isActive ? "bg-white/80" : "bg-transparent"
                }`}
                style={isActive ? styles.activeTab : undefined}
              >
                <Icon
                  size={isActive ? 22 : 21}
                  color={isActive ? "#102F50" : "#64748B"}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <Text
                  className={`mt-1 text-[10px] ${
                    lang === "si" ? "font-sinhala-semibold" : "font-inter-semibold"
                  } ${isActive ? "text-brand-navy" : "text-brand-textSecondary"}`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// වෙනම Shadow එකක් ලබා දීම (BlurView සමග හොඳින් වැඩ කිරීමට)
const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(255, 255, 255, 0.62)",
  },
  activeTab: {
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    shadowColor: "#102F50",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  shadow: {
    shadowColor: "#102F50",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
});