
'use client';

import type { Dispatch, ReactNode, SetStateAction} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'fr' | 'zh';
export type BibleTranslation = 'KJV' | 'NIV' | 'NRSV' | 'ESV';

interface Settings {
  language: Language;
  bibleTranslation: BibleTranslation;
}

interface SettingsContextType extends Settings {
  setLanguage: Dispatch<SetStateAction<Language>>;
  setBibleTranslation: Dispatch<SetStateAction<BibleTranslation>>;
}

const defaultSettings: Settings = {
  language: 'en',
  bibleTranslation: 'KJV',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const storedLang = localStorage.getItem('appLanguage');
      return (storedLang ? storedLang : defaultSettings.language) as Language;
    }
    return defaultSettings.language;
  });

  const [bibleTranslation, setBibleTranslation] = useState<BibleTranslation>(() => {
    if (typeof window !== 'undefined') {
      const storedTranslation = localStorage.getItem('bibleTranslation');
      return (storedTranslation ? storedTranslation : defaultSettings.bibleTranslation) as BibleTranslation;
    }
    return defaultSettings.bibleTranslation;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appLanguage', language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bibleTranslation', bibleTranslation);
    }
  }, [bibleTranslation]);

  return (
    <SettingsContext.Provider value={{ language, bibleTranslation, setLanguage, setBibleTranslation }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
