import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, MultilingualText } from '../types';
import { translations } from '../data/translations';
import { storageService } from '../services/storageService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string) => string;
  tMulti: (textObj?: MultilingualText | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'sf_preferred_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 1. Check localStorage first
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'bn' || saved === 'en' || saved === 'ar') {
        return saved as Language;
      }
    } catch {
      // Storage unavailable fallback
    }

    // 2. Browser locale / country signal detection
    try {
      const browserLang = navigator.language.toLowerCase();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Saudi Arabia / Arab region detection
      if (
        browserLang.startsWith('ar') ||
        timeZone === 'Asia/Riyadh' ||
        timeZone === 'Asia/Jeddah' ||
        timeZone === 'Asia/Dubai'
      ) {
        return 'ar';
      }

      // Bangladesh region detection
      if (browserLang.startsWith('bn') || timeZone === 'Asia/Dhaka') {
        return 'bn';
      }
    } catch {
      // Ignore detection error
    }

    // Default to Bangla as primary foundation origin
    return 'bn';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage error
    }
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }, [language, isRTL]);

  const t = (key: string): string => {
    try {
      const custom = storageService.getConfig().customTranslations?.[key];
      if (custom) {
        const customVal = custom[language] || custom.bn || custom.en;
        if (customVal && customVal.trim().length > 0) {
          return customVal;
        }
      }
    } catch {
      // Storage fallback
    }

    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.bn || key;
  };

  const tMulti = (textObj?: MultilingualText | string): string => {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;
    return textObj[language] || textObj.bn || textObj.en || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, t, tMulti }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
