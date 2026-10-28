import { de as deLocale, enUS } from 'date-fns/locale';

export type Lang = 'en' | 'de';
export type LangPref = 'system' | Lang;
const KEY = 'kompass.lang';

export function readLangPref(): LangPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' || v === 'de' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** German when the system's first language is German, English for everything else. */
export function systemLang(): Lang {
  const first = navigator.languages?.[0] ?? navigator.language ?? 'en';
  return first.toLowerCase().startsWith('de') ? 'de' : 'en';
}

const pref = readLangPref();
// Fixed for the lifetime of the page; switching reloads, so module-level labels never go stale.
export const lang: Lang = pref === 'system' ? systemLang() : pref;
document.documentElement.lang = lang;

/** Both languages side by side at the call site: tr('New task', 'Neue Aufgabe'). */
export const tr = (en: string, de: string) => (lang === 'de' ? de : en);

export const dateLocale = lang === 'de' ? deLocale : enUS;

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
/** Label of the shortcut modifier key: ⌘ on macOS, Ctrl/Strg elsewhere. */
export const modKey = isMac ? '⌘' : tr('Ctrl', 'Strg');

export function setLangPref(p: LangPref) {
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {}
  location.reload();
}
