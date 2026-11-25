import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  PlusCircle,
  Mic,
  Users,
  BarChart3,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  X,
  Play,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";

export const APP_TOUR_STORAGE_KEY = "nayapotha_interactive_tour_completed_v1";

interface TourStep {
  id: string;
  badgeSi: string;
  badgeEn: string;
  titleSi: string;
  titleEn: string;
  descSi: string;
  descEn: string;
  highlightButtonSi: string;
  highlightButtonEn: string;
  targetRoute: string;
  icon: "credit" | "voice" | "customers" | "reports" | "sync";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "step_1",
    badgeSi: "පියවර 1 / 5 • ඉක්මන් ගනුදෙනු",
    badgeEn: "STEP 1 OF 5 • QUICK LEDGER",
    titleSi: "ණය සහ ගෙවීම් තත්පරයෙන් සටහන් කරන්න",
    titleEn: "Record Credit & Payments in Seconds",
    descSi:
      "ප්‍රධාන තිරයේ ඇති 'ණය එකතු කරන්න' (Add credit) හෝ 'ගෙවීමක් ලබාගන්න' (Record payment) බොත්තම් ඔබා පාරිභෝගිකයා තෝරා මුදල ඇතුළත් කරන්න.",
    descEn:
      "Tap 'Add credit' or 'Record payment' on the Home screen, pick a customer, and confirm the amount to update balances instantly.",
    highlightButtonSi: "ණය ඇතුළත් කර බලන්න →",
    highlightButtonEn: "Try Adding Credit Now →",
    targetRoute: "/ledger/new",
    icon: "credit",
  },
  {
    id: "step_2",
    badgeSi: "පියවර 2 / 5 • කටහඬින් විධාන (VOICE AI)",
    badgeEn: "STEP 2 OF 5 • VOICE COMMANDS",
    titleSi: "සිංහලෙන් හෝ ඉංග්‍රීසියෙන් කතා කර සටහන් කරන්න",
    titleEn: "Speak in Sinhala or English to Create Drafts",
    descSi:
      "“පාලිතට රු. 2,000ක ණයක් දාන්න” වැනි විධානයක් දුන් විට නම, මුදල සහ ගනුදෙනු වර්ගය ස්වයංක්‍රීයව වෙන් කරගනී. ඔබ තහවුරු කරන තුරු කිසිවක් සටහන් නොවේ.",
    descEn:
      "Say “Record Rs. 2,000 credit for Palitha”. NayaPotha extracts the customer and amount into a safe draft that waits for your confirmation.",
    highlightButtonSi: "Voice Entry අත්හදා බලන්න →",
    highlightButtonEn: "Try Voice Entry Now →",
    targetRoute: "/voice/record",
    icon: "voice",
  },
  {
    id: "step_3",
    badgeSi: "පියවර 3 / 5 • පාරිභෝගිකයින් සහ AI අවදානම",
    badgeEn: "STEP 3 OF 5 • CUSTOMERS & RISK",
    titleSi: "එකම නම ඇති අය වෙන්කර හඳුනාගන්න",
    titleEn: "Disambiguate Names & Check Repayment Risk",
    descSi:
      "එකම නම ඇති පාරිභෝගිකයින් (උදා: පාලිත - පොල් / පාලිත - කඩේ) පැටලීම වළක්වන අතර, ගෙවීම් රටාව අනුව AI අවදානම් මට්ටම (Low/Medium/High) පෙන්වයි.",
    descEn:
      "Prevent mix-ups between customers with identical names using nicknames & codes, and inspect transparent FIFO repayment risk estimates.",
    highlightButtonSi: "පාරිභෝගික ලැයිස්තුව බලන්න →",
    highlightButtonEn: "Explore Customers →",
    targetRoute: "/customers",
    icon: "customers",
  },
  {
    id: "step_4",
    badgeSi: "පියවර 4 / 5 • වාර්තා සහ PDF ප්‍රකාශ",
    badgeEn: "STEP 4 OF 5 • REPORTS & PDF",
    titleSi: "දෛනික සාරාංශ සහ PDF Statement බෙදාගන්න",
    titleEn: "Daily Summaries & Shareable PDF Statements",
    descSi:
      "අද දවසේ මුළු ණය, ලැබුණු ගෙවීම්, ප්‍රමාද වූ පාරිභෝගිකයින් (Overdue) සහ ඕනෑම අයෙකුගේ ගිණුම් ප්‍රකාශයක් PDF ලෙස WhatsApp හරහා යැවිය හැක.",
    descEn:
      "Track daily cash/credit flow, filter overdue accounts, and export clean 1-page PDF customer statements to share via WhatsApp.",
    highlightButtonSi: "වාර්තා පිටුව බලන්න →",
    highlightButtonEn: "Open Reports →",
    targetRoute: "/reports",
    icon: "reports",
  },
  {
    id: "step_5",
    badgeSi: "පියවර 5 / 5 • අන්තර්ජාලය නොමැතිව ක්‍රියාත්මකයි",
    badgeEn: "STEP 5 OF 5 • OFFLINE-FIRST SYNC",
    titleSi: "Offline වුවත් ඔබේ දත්ත 100%ක් ආරක්ෂිතයි",
    titleEn: "Keep Working Without Internet",
    descSi:
      "අන්තර්ජාලය නැති වෙලාවටත් බාධාවකින් තොරව ගනුදෙනු සටහන් කරන්න. අන්තර්ජාලය ලැබුණු පසු 'Retry sync' මගින් ගනුදෙනු දෙවරක් සටහන් නොවී Server එකට යැවේ.",
    descEn:
      "All entries save to your local outbox first. When internet returns, syncing uses idempotent IDs so transactions never duplicate.",
    highlightButtonSi: "Sync තත්ත්වය බලන්න →",
    highlightButtonEn: "Check Sync Status →",
    targetRoute: "/settings/sync-status",
    icon: "sync",
  },
];

interface InteractiveTourModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function InteractiveTourModal({
  visible,
  onClose,
}: InteractiveTourModalProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const markCompletedAndClose = async () => {
    await AsyncStorage.setItem(APP_TOUR_STORAGE_KEY, "true");
    onClose();
  };

  const handleTryFeatureNow = async () => {
    await AsyncStorage.setItem(APP_TOUR_STORAGE_KEY, "true");
    onClose();
    router.push(step.targetRoute as any);
  };

  const renderStepIcon = (iconType: TourStep["icon"]) => {
    switch (iconType) {
      case "credit":
        return <PlusCircle size={32} color="#102F50" strokeWidth={2.2} />;
      case "voice":
        return <Mic size={32} color="#F59E0B" strokeWidth={2.2} />;
      case "customers":
        return <Users size={32} color="#102F50" strokeWidth={2.2} />;
      case "reports":
        return <BarChart3 size={32} color="#16A36A" strokeWidth={2.2} />;
      case "sync":
        return <RefreshCw size={32} color="#102F50" strokeWidth={2.2} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={markCompletedAndClose}
    >
      <View className="flex-1 bg-sky-950/60 justify-center items-center px-5">
        <View className="w-full bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
          {/* Top Bar: Step Badge & Close (Skip) */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="px-3 py-1 bg-amber-50 rounded-full border border-brand-orange/40 flex-row items-center gap-1.5">
              <Sparkles size={13} color="#F59E0B" />
              <Text className="text-brand-navy text-[11px] font-inter-bold">
                {lang === "si" ? step.badgeSi : step.badgeEn}
              </Text>
            </View>

            <TouchableOpacity
              onPress={markCompletedAndClose}
              className="w-8 h-8 rounded-full bg-brand-surface items-center justify-center"
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Icon Spotlight Box */}
          <View className="w-16 h-16 rounded-2xl bg-brand-surface items-center justify-center mb-4 self-center border border-brand-border">
            {renderStepIcon(step.icon)}
          </View>

          {/* Step Title & Explanation */}
          <Text
            className={`text-brand-navy text-xl text-center mb-2 ${
              lang === "si" ? "font-sinhala-bold leading-8" : "font-inter-bold"
            }`}
          >
            {lang === "si" ? step.titleSi : step.titleEn}
          </Text>

          <Text
            className={`text-brand-textSecondary text-sm text-center leading-5 mb-5 ${
              lang === "si" ? "font-sinhala" : "font-inter"
            }`}
          >
            {lang === "si" ? step.descSi : step.descEn}
          </Text>

          {/* Interactive "Try Feature Now" Action Chip */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleTryFeatureNow}
            className="mb-5 py-3 px-4 bg-amber-50 rounded-2xl border border-brand-orange flex-row items-center justify-center gap-2"
          >
            <Play size={15} color="#102F50" fill="#102F50" />
            <Text className="text-brand-navy text-sm font-inter-bold">
              {lang === "si" ? step.highlightButtonSi : step.highlightButtonEn}
            </Text>
          </TouchableOpacity>

          {/* Progress Dots */}
          <View className="flex-row items-center justify-center gap-2 mb-5">
            {TOUR_STEPS.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setCurrentStep(idx)}
                className={`h-2 rounded-full ${
                  idx === currentStep
                    ? "w-7 bg-brand-navy"
                    : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </View>

          {/* Bottom Navigation Buttons (Back / Next / Done) */}
          <View className="flex-row items-center gap-2.5">
            {currentStep > 0 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setCurrentStep((s) => s - 1)}
                className="h-12 px-4 rounded-xl border border-brand-navy flex-row items-center justify-center gap-1.5"
              >
                <ArrowLeft size={16} color="#102F50" />
                <Text className="text-brand-navy text-sm font-inter-semibold">
                  {lang === "si" ? "ආපසු" : "Back"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={markCompletedAndClose}
                className="h-12 px-4 rounded-xl border border-brand-border items-center justify-center"
              >
                <Text className="text-brand-textSecondary text-sm font-inter-semibold">
                  {lang === "si" ? "මගහරින්න (Skip)" : "Skip tour"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (isLastStep) {
                  markCompletedAndClose();
                } else {
                  setCurrentStep((s) => s + 1);
                }
              }}
              className="flex-1 h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
            >
              <Text className="text-white text-base font-inter-semibold">
                {isLastStep
                  ? lang === "si"
                    ? "ආරම්භ කරමු (Finish)"
                    : "Finish & Start"
                  : lang === "si"
                  ? "ඊළඟ (Next)"
                  : "Next"}
              </Text>
              {!isLastStep && <ArrowRight size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}