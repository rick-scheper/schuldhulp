// PROTOTYPE — throwaway. Floating variant switcher (?variant=), dev builds only.
import { useEffect } from 'react';

export const VARIANTS = [
  { key: 'A', name: 'Zijbalk met tabbladen' },
  { key: 'B', name: 'Verhaal in stappen' },
  { key: 'C', name: 'Cockpit' },
] as const;

export type VariantKey = (typeof VARIANTS)[number]['key'];

export function readVariant(): VariantKey | null {
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(window.location.search).get('variant');
  return VARIANTS.some((x) => x.key === v) ? (v as VariantKey) : null;
}

export function PrototypeSwitcher({ current, onChange }: { current: VariantKey; onChange: (v: VariantKey) => void }) {
  const i = VARIANTS.findIndex((v) => v.key === current);
  const go = (d: number) => {
    const next = VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length]!.key;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState(null, '', url);
    onChange(next);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="pd-switcher" role="toolbar" aria-label="Prototype-variant">
      <button onClick={() => go(-1)} aria-label="Vorige variant">←</button>
      <span>
        {current} — {VARIANTS[i]!.name}
      </span>
      <button onClick={() => go(1)} aria-label="Volgende variant">→</button>
    </div>
  );
}
