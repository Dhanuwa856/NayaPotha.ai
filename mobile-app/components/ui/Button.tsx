import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";

interface ButtonProps {
  label: string;
  state?: "Primary" | "Secondary" | "Destructive" | "Disabled" | "Loading";
  onPress?: () => void;
}

export default function Button({ label, state = "Primary", onPress }: ButtonProps) {
  let bgClass = "bg-brand-navy";
  let textClass = "text-white font-inter-semibold";
  let borderClass = "";

  if (state === "Secondary") {
    bgClass = "bg-white";
    textClass = "text-brand-navy font-inter-semibold";
    borderClass = "border border-brand-border";
  } else if (state === "Destructive") {
    bgClass = "bg-brand-error";
    textClass = "text-white font-inter-semibold";
  } else if (state === "Disabled") {
    bgClass = "bg-brand-surface";
    textClass = "text-brand-textSecondary font-inter-semibold";
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={state === "Disabled" || state === "Loading"}
      onPress={onPress}
      className={`h-12 px-4 rounded-xl flex-row justify-center items-center ${bgClass} ${borderClass}`}
    >
      {state === "Loading" ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text className="text-white text-base font-inter-semibold">Saving...</Text>
        </View>
      ) : (
        <Text className={`text-base ${textClass}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}