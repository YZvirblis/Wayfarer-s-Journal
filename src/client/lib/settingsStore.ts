import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, THEMES, type Settings, type Theme } from '../../shared/schema';
import { api } from './api';

const THEME_STORAGE_KEY = 'wj.theme';

let settings: Settings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

function publish(next: Settings): void {
  settings = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const snapshot = (): Settings => settings;

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private-mode browsers may refuse storage; the server copy is authoritative.
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

function persist(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void api.saveSettings(settings).catch(() => undefined);
  }, 300);
}

export async function loadSettings(): Promise<Settings> {
  try {
    const loaded = await api.getSettings();
    publish(loaded);
  } catch {
    publish({ ...DEFAULT_SETTINGS });
  }
  applyTheme(settings.theme);
  return settings;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  publish({ ...settings, theme });
  persist();
}

export function toggleTheme(): void {
  const index = THEMES.indexOf(settings.theme);
  setTheme(THEMES[(index + 1) % THEMES.length] ?? 'dark');
}

export function setHideSecrets(hideSecrets: boolean): void {
  if (settings.hideSecrets === hideSecrets) return;
  publish({ ...settings, hideSecrets });
  persist();
}

export function toggleHideSecrets(): void {
  setHideSecrets(!settings.hideSecrets);
}

export function setLastCharacterId(id: string | null): void {
  if (settings.lastCharacterId === id) return;
  publish({ ...settings, lastCharacterId: id });
  persist();
}
