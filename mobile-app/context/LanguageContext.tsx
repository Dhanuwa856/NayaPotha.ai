import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Language, translations } from "../constants/translations";

interface LanguageContextType {
  lang: Language;
  hasSelectedLanguage: boolean;
  isLoadingLang: boolean;
  setLanguage: (newLang: Language) => Promise<void>;
  t: (typeof translations)["si"];
}

const LANG_STORAGE_KEY = "@nayapotha_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("si");
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [isLoadingLang, setIsLoadingLang] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANG_STORAGE_KEY);
        if (savedLang === "si" || savedLang === "en") {
          setLang(savedLang);
          setHasSelectedLanguage(true);
        }
      } finally {
        setIsLoadingLang(false);
      }
    })();
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLang(newLang);
    setHasSelectedLanguage(true);
    await AsyncStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        hasSelectedLanguage,
        isLoadingLang,
        setLanguage,
        t: translations[lang],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}