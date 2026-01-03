import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import cs from './locales/cs.json';

// Detect system language or use stored preference
const getInitialLanguage = (): string => {
  // Check localStorage first
  const stored = localStorage.getItem('blendmate_language');
  if (stored && ['en', 'cs'].includes(stored)) {
    return stored;
  }

  // Detect from browser/system
  const browserLang = navigator.language.split('-')[0];
  return ['cs', 'sk'].includes(browserLang) ? 'cs' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      cs: { translation: cs },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

// Helper to change language and persist
export const changeLanguage = (lang: 'en' | 'cs') => {
  localStorage.setItem('blendmate_language', lang);
  i18n.changeLanguage(lang);
};

// Get current language
export const getCurrentLanguage = () => i18n.language as 'en' | 'cs';

export default i18n;
