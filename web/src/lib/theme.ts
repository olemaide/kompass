import { useState } from 'react';
import { create } from 'zustand';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'kompass.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

const useThemeStore = create<{ pref: ThemePref }>(() => ({ pref: read() }));
media.addEventListener('change', () => apply(useThemeStore.getState().pref));

function setTheme(pref: ThemePref) {
  useThemeStore.setState({ pref });
  apply(pref);
  try {
    localStorage.setItem(KEY, pref);
  } catch {}
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  return [useThemeStore((s) => s.pref), setTheme];
}

/** A small per-device preference kept in localStorage. */
export function usePersisted<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(`kompass.${key}`) as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(`kompass.${key}`, v);
    } catch {}
  };
  return [value, set];
}
