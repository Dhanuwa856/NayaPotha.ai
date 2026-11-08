import React from "react";
import { View, Text } from "react-native";
import { CheckCircle2, Clock, AlertCircle, WifiOff } from "lucide-react-native";

interface StatusAlertProps {
  type: "Saved" | "Pending" | "Attention" | "Offline";
}

export default function StatusAlert({ type }: StatusAlertProps) {
  let bgClass = "";
  let iconColor = "";
  let titleClass = "";
  let title = "";
  let description = "";
  let Icon = CheckCircle2;

  switch (type) {
    case "Saved":
      bgClass = "bg-green-50"; iconColor = "#16A36A"; titleClass = "text-brand-success";
      title = "Saved on this device"; Icon = CheckCircle2;
      break;
    case "Pending":
      bgClass = "bg-amber-50"; iconColor = "#102F50"; titleClass = "text-brand-navy";
      title = "Pending sync"; description = "Saved locally. Waiting for connection."; Icon = Clock;
      break;
    case "Attention":
      bgClass = "bg-rose-50"; iconColor = "#DC4545"; titleClass = "text-brand-error";
      title = "Needs attention"; description = "Review this record before retrying."; Icon = AlertCircle;
      break;
    case "Offline":
      bgClass = "bg-brand-surface"; iconColor = "#102F50"; titleClass = "text-brand-navy";
      title = "Offline"; description = "Keep recording on this device."; Icon = WifiOff;
      break;
  }

  return (
    <View className={`p-3 rounded-xl flex-row items-start gap-2.5 ${bgClass}`}>
      <Icon size={20} color={iconColor} strokeWidth={2.5} />
      <View className="flex-1 flex-col justify-start items-start gap-1">
        <Text className={`text-xs font-inter-semibold leading-5 ${titleClass}`}>{title}</Text>
        {description ? (
          <Text className="text-brand-textSecondary text-xs font-inter leading-4">{description}</Text>
        ) : null}
      </View>
    </View>
  );
}