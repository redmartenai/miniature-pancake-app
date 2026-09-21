import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import hi from './hi';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
] as const;

const supported = new Set<string>(LANGUAGES.map((l) => l.code));
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: supported.has(deviceLanguage) ? deviceLanguage : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(code: string) {
  if (supported.has(code) && i18n.language !== code) {
    void i18n.changeLanguage(code);
  }
}

export default i18n;
