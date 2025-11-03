import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { translations, Locale, TranslationKey } from '../translations';

interface I18nContextType {
  locale: Locale;
  setLocale: React.Dispatch<React.SetStateAction<Locale>>;
  t: (key: TranslationKey, ...args: any[]) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useLocalStorage<Locale>('locale', 'cs');

  const t = useCallback((key: TranslationKey, ...args: any[]): string => {
    let translation = translations[locale][key] || key;
    if (args.length > 0) {
      translation = translation.replace(/{(\d)}/g, (match, number) => {
        return typeof args[number] !== 'undefined' ? args[number] : match;
      });
    }
    return translation;
  }, [locale]);

  const value = { locale, setLocale, t };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
