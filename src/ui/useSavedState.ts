import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SAVED_STATE, decodeState, encodeState, hasNonDefault, isShareHash, type SavedState } from './share';

/** The one saved input set (#17). The value is the same `v=1&…` text as the share link. */
export const STORAGE_KEY = 'schuldhulp.invoer';

/** localStorage, or null when the browser blocks it (private mode, disabled site data). */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The saved state, or null when nothing (or only defaults) is saved or storage is unavailable. */
export function loadSaved(): SavedState | null {
  try {
    const text = storage()?.getItem(STORAGE_KEY);
    if (!text) return null;
    const { state } = decodeState(text);
    return hasNonDefault(state) ? state : null;
  } catch {
    return null;
  }
}

export function save(state: SavedState): void {
  try {
    const s = storage();
    if (!s) return;
    if (hasNonDefault(state)) s.setItem(STORAGE_KEY, encodeState(state));
    else s.removeItem(STORAGE_KEY);
  } catch {
    // Full or blocked storage: the app keeps working, it just does not save.
  }
}

function clearSaved(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function currentHash(): string {
  try {
    return window.location.hash;
  } catch {
    return '';
  }
}

/** Removes the hash without a navigation or a history entry. */
export function clearHash(): void {
  try {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', pathname + search);
  } catch {
    // ignore
  }
}

export function shareUrl(state: SavedState): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#${encodeState(state)}`;
}

interface Session {
  state: SavedState;
  /** True while the gedeelde berekening banner is up: auto-save is paused. */
  shared: boolean;
  /** "Sommige waarden uit de link konden niet worden gelezen". */
  notice: boolean;
  /** Set when a link was adopted silently: the hash is cleared after render. */
  clearHash: boolean;
}

/** How the page opens: a share link (with or without saved inputs), the saved inputs, or defaults. */
function open(fallback: SavedState): Session {
  const saved = loadSaved();
  const hash = currentHash();
  if (isShareHash(hash)) {
    const { state, unreadable } = decodeState(hash);
    const notice = unreadable.length > 0;
    // With saved inputs the link opens as a gedeelde berekening; without, it is adopted silently.
    return saved ? { state, shared: true, notice, clearHash: false } : { state, shared: false, notice, clearHash: true };
  }
  return { state: saved ?? fallback, shared: false, notice: false, clearHash: false };
}

/**
 * The app's saved and shared state (#31): auto-saved on every change, opened from a share link,
 * with the banner choices Overnemen / Terug and "Opnieuw beginnen".
 * `initial` (tests) skips storage and the hash on the first render.
 */
export function useSavedState(initial?: SavedState) {
  const [session, setSession] = useState<Session>(() =>
    initial ? { state: initial, shared: false, notice: false, clearHash: false } : open(DEFAULT_SAVED_STATE),
  );
  const { state, shared } = session;

  useEffect(() => {
    if (session.clearHash) {
      clearHash();
      setSession((s) => ({ ...s, clearHash: false }));
    }
  }, [session.clearHash]);

  // Auto-save on every change, paused while a gedeelde berekening is shown.
  useEffect(() => {
    if (!shared) save(state);
  }, [state, shared]);

  // A link pasted into the same tab only changes the hash: open it like a fresh load.
  useEffect(() => {
    const onHash = () => {
      if (isShareHash(currentHash())) setSession((s) => open(s.state));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const update = useCallback((patch: Partial<SavedState>) => setSession((s) => ({ ...s, state: { ...s.state, ...patch } })), []);

  /** "Overnemen als mijn invoer": the shared view (with any edits) becomes the saved inputs. */
  const adopt = useCallback(() => {
    clearHash();
    setSession((s) => ({ ...s, shared: false, notice: false }));
  }, []);

  /** "Terug naar mijn eigen": the saved inputs come back untouched. */
  const back = useCallback(() => {
    clearHash();
    setSession({ state: loadSaved() ?? DEFAULT_SAVED_STATE, shared: false, notice: false, clearHash: false });
  }, []);

  /** "Opnieuw beginnen": defaults, nothing saved. */
  const reset = useCallback(() => {
    clearSaved();
    setSession({ state: DEFAULT_SAVED_STATE, shared: false, notice: false, clearHash: false });
  }, []);

  const dismissNotice = useCallback(() => setSession((s) => ({ ...s, notice: false })), []);

  return { state, shared, notice: session.notice, update, adopt, back, reset, dismissNotice };
}
