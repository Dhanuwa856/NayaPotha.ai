import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import type { TextInputInstance } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
} from "expo-audio";
import {
  ArrowLeft,
  Mic,
  Square,
  Info,
  Sparkles,
  Keyboard,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { voiceAndRiskApi } from "../../services/voiceAndRiskService";

export default function RecordWithVoiceScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [voiceLang, setVoiceLang] = useState<"si" | "en">(lang);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>(
    "Tap the mic to record, or use keyboard voice typing below"
  );

  const inputRef = useRef<TextInputInstance>(null);

  // Official expo-audio hook with HIGH_QUALITY preset
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const samplePhrases =
    voiceLang === "si"
      ? [
          "පාලිතට රු. 2,000ක ණයක් සටහන් කරන්න.",
          "නිමල්ට රු. 1,500ක ණයක් දාන්න.",
          "කසුන්ගෙන් රු. 1,000ක් ලැබුණා.",
        ]
      : [
          "Record Rs. 2,000 credit for Palitha.",
          "Add Rs. 1,500 credit for Nimal.",
          "Received Rs. 1,000 from Kasun.",
        ];

  // Start real hardware recording via expo-audio
  const startMicRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow microphone access to record voice commands."
        );
        return;
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setSeconds(0);
      setStatusMessage(
        voiceLang === "si"
          ? "දැන් කතා කරන්න... (උදා: පාලිතට රුපියල් 2000ක ණයක් දාන්න)"
          : "Speak now... (e.g., Record Rs 2000 credit for Palitha)"
      );
    } catch (err: any) {
      console.log("expo-audio start error:", err);
      // Fallback: open keyboard so user can use Google Voice Typing 🎤
      setStatusMessage(
        "Use the 🎤 icon on your keyboard to speak directly:"
      );
      inputRef.current?.focus();
    }
  };

  // Stop recording, transcribe (or use typed/dictated text), and parse
  const stopAndProcessVoice = async () => {
    setProcessing(true);
    let recordedUri: string | null = null;

    try {
      if (isRecording) {
        await audioRecorder.stop();
        recordedUri = audioRecorder.uri;
        setIsRecording(false);
      }
    } catch (e) {
      console.log("Error stopping recorder:", e);
      setIsRecording(false);
    }

    try {
      let finalTranscript = spokenText.trim();

      // 1. If we recorded audio and the text box is empty, send audio to FastAPI
      if (recordedUri && !finalTranscript) {
        setStatusMessage("Converting voice to text with AI...");
        const sttResult = await voiceAndRiskApi.uploadAudioForTranscription(
          recordedUri,
          voiceLang
        );
        if (sttResult && sttResult.trim().length > 0) {
          finalTranscript = sttResult.trim();
          setSpokenText(finalTranscript);
        }
      }

      // 2. If backend STT isn't configured yet and text box is still empty, alert the user
      if (!finalTranscript) {
        setProcessing(false);
        Alert.alert(
          "Could Not Hear Command",
          "Backend Speech-to-Text is not configured yet, or no speech was detected. Tap the text box below and use your keyboard's 🎤 microphone, or tap a Quick Command chip.",
          [
            {
              text: "Use Keyboard 🎤",
              onPress: () => inputRef.current?.focus(),
            },
            { text: "OK" },
          ]
        );
        return;
      }

      // 3. Parse Customer, Amount, and Intent using our Sinhala/English NLP Engine
      const parsed = await voiceAndRiskApi.parseVoiceCommand(
        finalTranscript,
        voiceLang
      );

      router.push({
        pathname: "/voice/draft",
        params: {
          transcript: parsed.transcript,
          voice_lang: parsed.language,
          type: parsed.intent,
          amount_minor: String(parsed.amountMinor),
        },
      } as any);
    } finally {
      setProcessing(false);
    }
  };

  // Live timer while recording
  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const baseBars = [12, 26, 16, 34, 22, 30, 14, 26, 16];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
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
              {t.recordWithVoiceTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {t.recordWithVoiceSub}
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
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language Toggle Chips */}
          <View className="flex-row items-center gap-2 mb-4">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVoiceLang("si")}
              className={`flex-1 min-h-[40px] px-4 py-2 rounded-xl items-center justify-center ${
                voiceLang === "si" ? "bg-brand-navy" : "bg-brand-surface"
              }`}
            >
              <Text
                className={`text-sm font-sinhala-semibold ${
                  voiceLang === "si" ? "text-white" : "text-brand-navy"
                }`}
              >
                සිංහල
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVoiceLang("en")}
              className={`flex-1 min-h-[40px] px-4 py-2 rounded-xl items-center justify-center ${
                voiceLang === "en" ? "bg-brand-navy" : "bg-brand-surface"
              }`}
            >
              <Text
                className={`text-sm font-inter-semibold ${
                  voiceLang === "en" ? "text-white" : "text-brand-navy"
                }`}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mic Recording Card */}
          <View className="py-5 px-4 items-center gap-3 bg-slate-50 rounded-3xl border border-slate-200 mb-5">
            <Text className="text-brand-textSecondary text-xs font-inter text-center px-2">
              {statusMessage}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                isRecording ? stopAndProcessVoice() : startMicRecording()
              }
              className={`w-24 h-24 rounded-full border-[3px] items-center justify-center ${
                isRecording
                  ? "bg-amber-50 border-brand-orange"
                  : "bg-white border-brand-navy"
              }`}
            >
              <Mic
                size={38}
                color={isRecording ? "#F59E0B" : "#102F50"}
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            <Text className="text-brand-navy text-lg font-inter-bold text-center">
              {isRecording
                ? `${t.recordingStatus} ${formatTimer(seconds)}`
                : "Tap Mic to Start"}
            </Text>

            {/* Animated Waveform */}
            <View className="h-8 flex-row items-center gap-1.5">
              {baseBars.map((baseH, idx) => {
                const h = isRecording
                  ? ((baseH + seconds * 7 + idx * 5) % 26) + 8
                  : 8;
                return (
                  <View
                    key={idx}
                    style={{ height: h }}
                    className={`w-1.5 rounded-full ${
                      isRecording ? "bg-brand-orange" : "bg-brand-navy"
                    }`}
                  />
                );
              })}
            </View>
          </View>

          {/* Direct Voice Dictation / Editable Command Box */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-brand-navy text-xs font-inter-bold">
                RECOGNIZED / SPOKEN COMMAND:
              </Text>
              <TouchableOpacity
                onPress={() => inputRef.current?.focus()}
                className="flex-row items-center gap-1 bg-brand-surface px-2.5 py-1 rounded-lg"
              >
                <Keyboard size={14} color="#102F50" />
                <Text className="text-brand-navy text-xs font-inter-semibold">
                  Open Keyboard 🎤
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              ref={inputRef}
              value={spokenText}
              onChangeText={setSpokenText}
              multiline
              placeholder={
                voiceLang === "si"
                  ? "මෙතැන ඔබා යතුරුපුවරුවේ 🎤 මයික් එකෙන් සිංහලෙන් කතා කරන්න..."
                  : "Tap here and press the 🎤 mic on your keyboard to speak..."
              }
              placeholderTextColor="#94A3B8"
              className="p-3.5 bg-white rounded-xl border-2 border-brand-navy text-brand-navy text-base font-sinhala-medium min-h-[76px]"
            />
          </View>

          {/* One-Tap Quick Test Commands */}
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 mb-2">
              <Sparkles size={15} color="#F59E0B" />
              <Text className="text-brand-navy text-xs font-inter-bold">
                {t.trySayingLabel} (Tap to fill):
              </Text>
            </View>
            <View className="gap-2">
              {samplePhrases.map((phrase, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setSpokenText(phrase)}
                  className={`p-3 rounded-xl border ${
                    spokenText === phrase
                      ? "bg-amber-50 border-brand-orange"
                      : "bg-brand-surface border-brand-border"
                  }`}
                >
                  <Text className="text-brand-navy text-sm font-sinhala-medium">
                    “{phrase}”
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Safety Info Banner */}
          <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5">
            <Info size={20} color="#102F50" strokeWidth={2.2} />
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-navy text-xs font-inter-semibold">
                {t.voiceDraftOnlyTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                {t.voiceDraftOnlySub}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View
          className="px-5 pt-3 bg-white border-t border-slate-100 gap-2.5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={stopAndProcessVoice}
            className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
          >
            {processing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
            )}
            <Text className="text-white text-base font-inter-semibold">
              {isRecording ? t.stopRecordingBtn : "Check Voice Result →"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => router.back()}
            className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.cancelRecordingBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}