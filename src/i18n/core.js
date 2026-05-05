// Node-safe core of the i18n module. No React Native imports here, so
// this can be required by unit tests that run under plain Node and by
// utility modules that don't need the React provider.
//
// The RN-specific layer (`./index.js`) adds expo-localization, the
// AsyncStorage-backed user override, and the React `LocaleProvider`
// + `useLocale` hook. Both layers share the same i18n-js instance.

import { I18n } from 'i18n-js';

import en from './strings.en.js';
import pt from './strings.pt.js';

export const SUPPORTED_LOCALES = ['en', 'pt'];

const i18n = new I18n({ en, pt });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = 'en';

export function getLocale() {
  return i18n.locale;
}

// Set the active locale for any t() calls. Anything that's not in
// SUPPORTED_LOCALES is normalized to 'en' (so passing pt-BR or pt-PT
// resolves to 'pt').
export function setLocale(locale) {
  const code = String(locale || '').toLowerCase();
  if (code.startsWith('pt')) {
    i18n.locale = 'pt';
  } else {
    i18n.locale = 'en';
  }
  return i18n.locale;
}

export function t(key, options) {
  return i18n.t(key, options);
}

export default i18n;
