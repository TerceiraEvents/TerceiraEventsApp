// React Native layer on top of i18n core.
//
// Two ways the locale gets picked:
//   1. User override stored in AsyncStorage under LOCALE_OVERRIDE_KEY.
//      Either "en" or "pt"; the Settings screen writes this.
//   2. Device locale via `expo-localization`. Anything starting with
//      "pt" → "pt"; everything else → "en". Fallback when no override.
//
// Components consume `useLocale()` to re-render when the locale
// changes. Modules that don't render React (utils, widget) can use
// the synchronous `t()` / `setLocale()` from `./core`.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  SUPPORTED_LOCALES,
  getLocale,
  setLocale as setCoreLocale,
  t,
} from './core';

export { SUPPORTED_LOCALES, getLocale, t };

export const LOCALE_OVERRIDE_KEY = 'locale.override';
export const LOCALE_CHOICES = ['auto', 'en', 'pt'];

// Cheap synchronous device-locale resolver. Returns 'en' or 'pt'.
export function deviceLocale() {
  try {
    const locales = getLocales();
    for (const loc of locales || []) {
      const code = String(loc?.languageCode || '').toLowerCase();
      if (code === 'pt') return 'pt';
      if (code === 'en') return 'en';
    }
  } catch {
    // fall through
  }
  return 'en';
}

export async function loadStoredLocale() {
  try {
    const raw = await AsyncStorage.getItem(LOCALE_OVERRIDE_KEY);
    if (raw === 'en' || raw === 'pt') return raw;
  } catch {
    // ignore
  }
  return null;
}

export async function persistLocaleChoice(choice) {
  if (choice === 'auto') {
    await AsyncStorage.removeItem(LOCALE_OVERRIDE_KEY);
  } else if (choice === 'en' || choice === 'pt') {
    await AsyncStorage.setItem(LOCALE_OVERRIDE_KEY, choice);
  }
}

// Initialize core locale from device default. The provider re-runs
// this with the AsyncStorage override on mount.
setCoreLocale(deviceLocale());

export async function bootstrapLocale() {
  const stored = await loadStoredLocale();
  return setCoreLocale(stored || deviceLocale());
}

const LocaleContext = createContext({
  locale: 'en',
  choice: 'auto',
  setChoice: async () => {},
  t,
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(getLocale());
  const [choice, setChoiceState] = useState('auto');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadStoredLocale();
      const resolved = setCoreLocale(stored || deviceLocale());
      if (cancelled) return;
      setLocaleState(resolved);
      setChoiceState(stored || 'auto');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setChoice = useCallback(async (next) => {
    await persistLocaleChoice(next);
    const resolved = setCoreLocale(next === 'auto' ? deviceLocale() : next);
    setLocaleState(resolved);
    setChoiceState(next);
  }, []);

  // Re-create the bound `t` reference when the locale flips so that
  // consumers destructuring `t` from context see fresh strings.
  // (The exhaustive-deps lint about `locale` is intentional — locale
  // is the trigger, not a value the body uses.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const boundT = useCallback((key, options) => t(key, options), [locale]);

  const value = useMemo(
    () => ({ locale, choice, setChoice, t: boundT }),
    [locale, choice, setChoice, boundT],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
