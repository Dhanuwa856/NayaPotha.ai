import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle2,
  PlusCircle,
  ChevronDown,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  formatCustomerCode,
} from "../../services/customerService";
import { reportApi, StatementLedgerItem } from "../../services/reportService";

export default function CustomerStatementScreen() {
  const router = useRouter();
  const { customer_id, code } = useLocalSearchParams<{
    customer_id?: string;
    code?: string;
  }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [allCustomers, setAllCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customer_id || ""
  );
  const [customer, setCustomer] = useState<CustomerItem | null>(null);

  const [openingMinor, setOpeningMinor] = useState(0);
  const [totalCreditMinor, setTotalCreditMinor] = useState(0);
  const [totalPaymentsMinor, setTotalPaymentsMinor] = useState(0);
  const [closingMinor, setClosingMinor] = useState(0);
  const [ledgerItems, setLedgerItems] = useState<StatementLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatement = useCallback(async (targetId: string) => {
    try {
      setLoading(true);
      const data = await reportApi.getCustomerStatementReport(targetId);
      setCustomer(data.customer);
      setOpeningMinor(data.openingBalanceMinor);
      setTotalCreditMinor(data.totalCreditMinor);
      setTotalPaymentsMinor(data.totalPaymentsMinor);
      setClosingMinor(data.closingBalanceMinor);
      setLedgerItems(data.items);
    } catch (e) {
      console.log("Failed to load customer statement:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await shopAndCustomerApi.listCustomers({
          status: "ACTIVE",
          limit: 100,
        });
        const list = res.items || [];
        setAllCustomers(list);
        const initialId = customer_id || list[0]?.customer_id;
        if (initialId) {
          setSelectedCustomerId(initialId);
          await loadStatement(initialId);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    })();
  }, [customer_id, loadStatement]);

  const cycleCustomer = () => {
    if (allCustomers.length <= 1) return;
    const idx = allCustomers.findIndex(
      (c) => c.customer_id === selectedCustomerId
    );
    const next = allCustomers[(idx + 1) % allCustomers.length];
    setSelectedCustomerId(next.customer_id);
    loadStatement(next.customer_id);
  };

  const displayCode =
    code || (customer ? formatCustomerCode(customer.customer_id) : "NP-001");

  const periodStr =
    ledgerItems.length > 0
      ? `${new Date(ledgerItems[0].occurred_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })} – ${new Date(
          ledgerItems[ledgerItems.length - 1].occurred_at
        ).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`
      : new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

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
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={cycleCustomer}
          className="flex-1"
        >
          <Text className="text-brand-navy text-2xl font-inter-bold">
            {t.customerStatementTitle}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {customer?.name || "Select customer"} • {displayCode} •{" "}
              {customer?.phone_number || t.phoneNotSupplied}
            </Text>
            {allCustomers.length > 1 && (
              <ChevronDown size={14} color="#64748B" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Shop Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Statement Period Box */}
        <View className="mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.statementPeriodLabel}
          </Text>
          <View className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between">
            <Text className="text-brand-navy text-base font-inter">
              {periodStr}
            </Text>
            <Calendar size={20} color="#102F50" strokeWidth={2} />
          </View>
        </View>

        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : (
          <>
            {/* Balance Summary Card */}
            <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.openingBalanceLabel}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {formatLKR(openingMinor)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.totalCreditLabel}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  +{formatLKR(totalCreditMinor)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.totalPaymentsLabel}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  −{formatLKR(totalPaymentsMinor)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.closingBalanceLabel}
                </Text>
                <Text className="text-brand-navy text-base font-inter-bold">
                  {formatLKR(closingMinor)}
                </Text>
              </View>
            </View>

            {/* Statement Ledger Entries */}
            <Text className="text-brand-navy text-lg font-inter-semibold mb-2">
              {t.statementLedgerHeading}
            </Text>

            {ledgerItems.length === 0 ? (
              <Text className="text-brand-textSecondary text-sm font-inter my-4">
                {t.noTransactions}
              </Text>
            ) : (
              <View className="mb-4">
                {ledgerItems.map((item) => {
                  const isPayment = item.type === "PAYMENT";
                  const dateFormatted = new Date(
                    item.occurred_at
                  ).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <TouchableOpacity
                      key={item.entry_id}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/ledger/entry/[id]",
                          params: {
                            id: item.entry_id,
                            customer_id: item.customer_id,
                            customer_name: item.customer_name,
                            code: displayCode,
                          },
                        } as any)
                      }
                      className="py-3 border-b border-brand-border flex-row items-start gap-3"
                    >
                      <View
                        className={`w-9 h-9 rounded-xl items-center justify-center ${
                          isPayment ? "bg-green-50" : "bg-brand-surface"
                        }`}
                      >
                        {isPayment ? (
                          <CheckCircle2 size={18} color="#16A36A" />
                        ) : (
                          <PlusCircle size={18} color="#102F50" />
                        )}
                      </View>

                      <View className="flex-1 gap-0.5">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-brand-navy text-sm font-inter-semibold">
                            {isPayment ? t.paymentLabel : t.creditLabel}
                          </Text>
                          <Text className="text-brand-navy text-base font-inter-semibold">
                            {isPayment ? "−" : "+"}
                            {formatLKR(item.amount_minor)}
                          </Text>
                        </View>
                        <Text className="text-brand-textSecondary text-xs font-inter">
                          {dateFormatted} • {item.note || "Ledger entry"}
                        </Text>
                        <Text className="text-brand-navy text-xs font-inter">
                          Balance {formatLKR(item.running_balance_minor)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              Opening {formatLKR(openingMinor)} + {formatLKR(totalCreditMinor)}{" "}
              − {formatLKR(totalPaymentsMinor)} = {formatLKR(closingMinor)}.
              Draft credit is not included.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Bottom Sticky Preview PDF Button (Floats above BottomNav) */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!customer}
          onPress={() =>
            customer &&
            router.push({
              pathname: "/reports/pdf-preview",
              params: {
                customer_id: customer.customer_id,
                code: displayCode,
                period: periodStr,
              },
            } as any)
          }
          className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
        >
          <FileText size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-base font-inter-semibold">
            {t.previewPdfBtn}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Reports" />
    </SafeAreaView>
  );
}