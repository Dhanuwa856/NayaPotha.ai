import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Download, Share2, Info } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { CustomerItem, formatLKR } from "../../services/customerService";
import { reportApi, StatementLedgerItem } from "../../services/reportService";

export default function PdfPreviewScreen() {
  const router = useRouter();
  const { customer_id, code, period } = useLocalSearchParams<{
    customer_id: string;
    code?: string;
    period?: string;
  }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [openingMinor, setOpeningMinor] = useState(0);
  const [closingMinor, setClosingMinor] = useState(0);
  const [items, setItems] = useState<StatementLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!customer_id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await reportApi.getCustomerStatementReport(customer_id);
        setCustomer(data.customer);
        setOpeningMinor(data.openingBalanceMinor);
        setClosingMinor(data.closingBalanceMinor);
        setItems(data.items);
      } catch (e) {
        console.log("Failed to load PDF preview data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [customer_id]);

  const preparedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleExportOrSharePdf = async () => {
    if (!customer) return;
    setExporting(true);

    const shopTitle = shop?.shop_name || "NayaPotha.ai Store";
    const rowsHtml = items
      .map((item) => {
        const dStr = new Date(item.occurred_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        });
        const sign = item.type === "PAYMENT" ? "−" : "+";
        const typeLbl = item.type === "PAYMENT" ? "Payment" : "Credit";
        return `
          <tr>
            <td style="padding:8px 0;color:#64748B;">${dStr} · ${typeLbl}<br/><small>${
          item.note || ""
        } • Balance ${formatLKR(item.running_balance_minor)}</small></td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#102F50;">${sign}${formatLKR(
          item.amount_minor
        )}</td>
          </tr>
        `;
      })
      .join("");

    const htmlContent = `
      <html>
        <body style="font-family:sans-serif;padding:24px;color:#102F50;">
          <h2 style="margin:0 0 4px 0;">${shopTitle}</h2>
          <p style="margin:0 0 12px 0;font-size:12px;color:#64748B;">CUSTOMER STATEMENT • ${
            period || preparedDate
          }</p>
          <p style="margin:0 0 4px 0;font-weight:bold;">${customer.name} · ${
      code || "NP-001"
    }</p>
          <p style="margin:0 0 16px 0;font-size:12px;color:#64748B;">${
            customer.phone_number || "Phone not supplied"
          } • Currency LKR</p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:12px 0;"/>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:6px 0;color:#64748B;">Opening</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">${formatLKR(
                openingMinor
              )}</td>
            </tr>
            ${rowsHtml}
          </table>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:12px 0;"/>
          <table style="width:100%;font-size:16px;font-weight:bold;">
            <tr>
              <td>Closing balance</td>
              <td style="text-align:right;">${formatLKR(closingMinor)}</td>
            </tr>
          </table>
          <p style="margin-top:20px;font-size:11px;color:#64748B;">Prepared ${preparedDate} • Page 1 of 1</p>
        </body>
      </html>
    `;

    try {
      // Try generating a real PDF via expo-print & expo-sharing if installed
      const Print = require("expo-print");
      const Sharing = require("expo-sharing");
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${customer.name} Statement PDF`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Saved", `Statement PDF saved to: ${uri}`);
      }
    } catch {
      // Fallback to native text share if expo-print is not installed yet
      const textSummary = `${shopTitle} — CUSTOMER STATEMENT (${
        period || preparedDate
      })\nCustomer: ${customer.name} (${code || "NP-001"})\nOpening: ${formatLKR(
        openingMinor
      )}\nClosing Balance: ${formatLKR(closingMinor)}`;
      await Share.share({ message: textSummary });
    } finally {
      setExporting(false);
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
          <Text className="text-brand-navy text-2xl font-inter-bold">
            {t.pdfPreviewTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.onePageSub}
          </Text>
        </View>
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
        {loading || !customer ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : (
          <View className="p-4 bg-brand-surface rounded-2xl mb-4">
            {/* White A4 Sheet Preview Card */}
            <View className="p-4 bg-white border border-brand-border gap-3">
              <Text className="text-brand-navy text-lg font-inter-bold">
                {shop?.shop_name || "Naya Demo Stores"}
              </Text>
              <Text className="text-brand-textSecondary text-[10px] font-inter">
                CUSTOMER STATEMENT • {period || preparedDate}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-semibold">
                {customer.name} · {code || "NP-001"}
              </Text>
              <Text className="text-brand-navy text-xs font-inter">
                {customer.phone_number || t.phoneNotSupplied} • Currency LKR
              </Text>

              <View className="h-[1px] bg-brand-border my-1" />

              {/* Opening Row */}
              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  Opening
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {(openingMinor / 100).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Statement Rows */}
              {items.map((item) => {
                const isPayment = item.type === "PAYMENT";
                const dShort = new Date(item.occurred_at).toLocaleDateString(
                  "en-GB",
                  { day: "2-digit", month: "short" }
                );
                return (
                  <View key={item.entry_id} className="gap-0.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-brand-textSecondary text-xs font-inter">
                        {dShort} · {isPayment ? "Payment" : "Credit"}
                      </Text>
                      <Text className="text-brand-navy text-sm font-inter-medium">
                        {isPayment ? "−" : "+"}
                        {(item.amount_minor / 100).toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                    <Text className="text-brand-textSecondary text-xs font-inter">
                      {item.note || "Entry"} • Balance{" "}
                      {(item.running_balance_minor / 100).toLocaleString(
                        "en-LK",
                        { minimumFractionDigits: 2 }
                      )}
                    </Text>
                  </View>
                );
              })}

              <View className="h-[1px] bg-brand-border my-1" />

              {/* Closing Balance */}
              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.closingBalanceLabel}
                </Text>
                <Text className="text-brand-navy text-base font-inter-bold">
                  {formatLKR(closingMinor)}
                </Text>
              </View>

              <Text className="text-brand-textSecondary text-[10px] font-inter mt-1">
                Prepared {preparedDate} • Page 1 of 1
              </Text>
            </View>
          </View>
        )}

        {/* Preview Only Info Box */}
        <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5">
          <Info size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.previewOnlyTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.previewOnlySub}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Export PDF & Share Buttons */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100 flex-row gap-3"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={exporting}
          onPress={handleExportOrSharePdf}
          className="flex-1 h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
        >
          <Download size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-base font-inter-semibold">
            {t.exportPdfBtn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={exporting}
          onPress={handleExportOrSharePdf}
          className="flex-1 h-12 px-4 bg-white rounded-xl border border-brand-navy flex-row items-center justify-center gap-2"
        >
          <Share2 size={18} color="#102F50" strokeWidth={2.2} />
          <Text className="text-brand-navy text-base font-inter-semibold">
            {t.shareBtn}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}