/**
 * Storage Service — persistência local (localStorage) para sobreviver a refresh
 * durante a demo. Trocar por chamadas Supabase/Postgres quando integrar o DB.
 */

const STORAGE_KEY = "muralis:state:v1";

export function loadState<T>(): T | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("Failed to load state from localStorage", e);
    return undefined;
  }
}

export function saveState<T>(state: T): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state to localStorage", e);
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
