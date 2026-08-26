import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import so from './locales/so.json';
import ar from './locales/ar.json';

// Helper: apply direction & lang attributes
export const applyLanguageDirection = (lang) => {
  const isRTL = lang === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      so: { translation: so },
      ar: { translation: ar },
    },
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'so', 'ar'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    react: {
      useSuspense: false,
    },
  });

// Apply direction immediately on startup
const currentLang = localStorage.getItem('language') || 'en';
applyLanguageDirection(currentLang);

// Watch for language changes and update direction
i18n.on('languageChanged', (lang) => {
  localStorage.setItem('language', lang);
  applyLanguageDirection(lang);
});

export default i18n;
