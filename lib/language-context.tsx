import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'hinglish' | 'hindi' | 'english' | 'bengali' | 'kannada' | 'tamil' | 'telugu';

interface LanguageOption {
  id: Language;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'hinglish', label: 'Hinglish', nativeLabel: 'Hinglish' },
  { id: 'hindi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { id: 'english', label: 'English', nativeLabel: 'English' },
  { id: 'bengali', label: 'Bengali', nativeLabel: 'বাংলা' },
  { id: 'kannada', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { id: 'tamil', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { id: 'telugu', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  hasOnboarded: boolean;
  completeOnboarding: () => Promise<void>;
  isLoading: boolean;
}

const LANG_KEY = '@moodguard_language';
const ONBOARD_KEY = '@moodguard_onboarded';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>('hinglish');
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [savedLang, onboarded] = await Promise.all([
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(ONBOARD_KEY),
      ]);
      if (savedLang) setLang(savedLang as Language);
      if (onboarded === 'true') setHasOnboarded(true);
      setIsLoading(false);
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLang(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(ONBOARD_KEY, 'true');
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    hasOnboarded,
    completeOnboarding,
    isLoading,
  }), [language, setLanguage, hasOnboarded, completeOnboarding, isLoading]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
