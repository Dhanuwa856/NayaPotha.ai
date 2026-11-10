import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckCircle2,
} from "lucide-react-native";
import { useLanguage } from "../context/LanguageContext";
import BottomNav from "../components/ui/BottomNav";
import { shopAndCustomerApi, formatLKR } from "../services/customerService";

interface NotificationItem {
  id: string;
  variant: "warning" | "info";
  title: string;
  body: string;
  unread: boolean;
  icon: "overdue" | "limit" | "sync" | "ready";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      variant: "warning",
      title: t.paymentOverdueTitle,
      body: "Nimal Perera · NP-001 owes Rs.5,000.00. Due 20 Oct — 7 days overdue.",
      unread: true,
      icon: "overdue",
    },
    {
      id: "notif-2",
      variant: "warning",
      title: t.creditLimitTitle,
      body: "Kasun · NP-002 is nearing their limit. Check the balance before adding credit.",
      unread: true,
      icon: "limit",
    },
    {
      id: "notif-3",
      variant: "info",
      title: t.awaitingSyncTitle,
      body: "Saved on this device. They’ll sync when a connection is available.",
      unread: true,
      icon: "sync",
    },
    {
      id: "notif-4",
      variant: "info",
      title: t.ledgerReadyTitle,
      body: "System · You can add credit and payments offline. Review each entry before confirming.",
      unread: true,
      icon: "ready",
    },
  ]);

  useEffect(() => {
    // Enrich notifications with real customer overdue/limit data from GET /api/v1/customers
    (async () => {
      try {
        const res = await shopAndCustomerApi.listCustomers({ status: "ACTIVE" });
        const dynamicAlerts: NotificationItem[] = [];

        res.items.forEach((cust, index) => {
          const code = `NP-${String(index + 1).padStart(3, "0")}`;
          const out = cust.balance_summary?.outstanding_balance_minor || 0;
          const overdue = cust.balance_summary?.overdue_balance_minor || 0;
          const limit = cust.credit_limit_minor || 0;

          if (overdue > 0) {
            dynamicAlerts.push({
              id: `overdue-${cust.customer_id}`,
              variant: "warning",
              title: t.paymentOverdueTitle,
              body: `${cust.name} · ${code} owes ${formatLKR(overdue)} past the due date.`,
              unread: true,
              icon: "overdue",
            });
          } else if (limit > 0 && out >= limit * 0.8) {
            dynamicAlerts.push({
              id: `limit-${cust.customer_id}`,
              variant: "warning",
              title: t.creditLimitTitle,
              body: `${cust.name} · ${code} is nearing their limit (${formatLKR(out)} / ${formatLKR(limit)}).`,
              unread: true,
              icon: "limit",
            });
          }
        });

        if (dynamicAlerts.length > 0) {
          setNotifications((prev) => [...dynamicAlerts, ...prev.slice(2)]);
        }
      } catch {
        // Keep default notifications when offline or empty
      }
    })();
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const visibleNotifications =
    filter === "unread" ? notifications.filter((n) => n.unread) : notifications;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  const renderIcon = (iconType: NotificationItem["icon"]) => {
    switch (iconType) {
      case "overdue":
        return <Clock size={20} color="#102F50" strokeWidth={2.2} />;
      case "limit":
        return <AlertTriangle size={20} color="#102F50" strokeWidth={2.2} />;
      case "sync":
        return <RefreshCw size={20} color="#102F50" strokeWidth={2.2} />;
      default:
        return <CheckCircle2 size={20} color="#102F50" strokeWidth={2.2} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="min-h-[76px] pl-3 pr-5 py-2 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 items-center justify-center rounded-xl"
        >
          <ArrowLeft size={24} color="#102F50" strokeWidth={2.4} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-brand-navy text-2xl font-inter-bold leading-8">
            {t.notificationsTitle}
          </Text>
          <Text className="text-brand-textSecondary text-sm font-inter mt-0.5">
            27 Oct 2026 • {unreadCount} unread
          </Text>
        </View>
      </View>

      {/* Subtle Info Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {t.demoTag}
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-5 py-4" contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Filter Chips */}
        <View className="flex-row items-center gap-2.5 mb-5">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setFilter("unread")}
            className={`min-h-[40px] px-4 py-2 rounded-xl items-center justify-center ${
              filter === "unread" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-sm font-inter-semibold ${
                filter === "unread" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.unreadTab} ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setFilter("all")}
            className={`min-h-[40px] px-4 py-2 rounded-xl items-center justify-center ${
              filter === "all" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-sm font-inter-semibold ${
                filter === "all" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.allTab}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading */}
        <Text className="text-brand-textSecondary text-xs font-inter-semibold mb-3 tracking-wider">
          {t.todaySection}
        </Text>

        {/* Notification Alert Cards */}
        <View className="gap-3.5">
          {visibleNotifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => markAsRead(item.id)}
              className={`p-4 rounded-xl flex-row items-start gap-3 ${
                item.variant === "warning" ? "bg-amber-50" : "bg-blue-50"
              }`}
            >
              <View className="mt-0.5">{renderIcon(item.icon)}</View>
              <View className="flex-1 gap-1">
                <Text className="text-brand-navy text-sm font-inter-semibold leading-5">
                  {item.title}
                </Text>
                <Text className="text-brand-textSecondary text-sm font-inter leading-5">
                  {item.body}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer Advisory Note */}
        <Text className="text-brand-textSecondary text-sm font-inter leading-5 mt-5">
          {t.notifFooterNote}
        </Text>
      </ScrollView>

      {/* Bottom 4-Destination Navigation Bar */}
      <BottomNav active="Home" />
    </SafeAreaView>
  );
}