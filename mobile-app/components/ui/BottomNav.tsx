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
        // Phone එකේ යටින් තියෙන back බොත්තම් වලට අනුව උස වෙනස් වේ
        bottom: Math.max(insets.bottom, 20),
        left: 20,
        right: 20,
        ...styles.shadow
      }}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        tint="light"
        style={{ borderRadius: 32, overflow: 'hidden' }}
      >
        <View className="flex-row items-center justify-around h-16 px-2 bg-white/80 border border-white/50">
          {tabs.map(({ key, label, route, Icon }) => {
            const isActive = active === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                onPress={() => {
                  if (!isActive) router.push(route as any);
                }}
                className="flex-1 items-center justify-center h-full"
              >
                {/* Active Indicator Line */}
                <View
                  className={`w-6 h-1 rounded-full mb-1 ${
                    isActive ? "bg-brand-orange" : "bg-transparent"
                  }`}
                />
                <Icon
                  size={22}
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
  shadow: {
    shadowColor: "#102F50",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
});