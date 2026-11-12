// PROTOTYPE — throwaway. Three dashboard variants of the existing page, switchable via
// ?variant=A|B|C (dev builds only). Question: what should a dashboard-like, explainable Schuldhulp
// look like, with a left tab bar, debt growth, "will it ever be paid off?" and money freed for a house?
// The data comes from the real engine (deterministic run + the Monte Carlo for the koopbudget).
import { useState, type ReactNode } from 'react';
import type { InputDraft } from '../inputs';
import type { MortgageNote } from '../mortgage';
import type { DashData } from './data';
import { PrototypeSwitcher, type VariantKey } from './PrototypeSwitcher';
import { VariantA } from './VariantA';
import { VariantB } from './VariantB';
import { VariantC } from './VariantC';
import './prototype.css';

export interface ProtoProps {
  /** The real input form, unchanged. */
  form: ReactNode;
  draft: InputDraft;
  setDraft: (d: InputDraft) => void;
  data: DashData | null;
  emptyMessage: string;
  /** Koopbudget of extra aflossen vs 100% aandelen at `jaren` from now; null until the Monte Carlo is done. */
  mortgageAt: ((jaren: number) => MortgageNote) | null;
  maxJaren: number;
  jaren: number;
  setJaren: (j: number) => void;
  fillExample: () => void;
}

export function DashboardPrototype({ initial, ...props }: ProtoProps & { initial: VariantKey }) {
  const [variant, setVariant] = useState<VariantKey>(initial);
  return (
    <>
      <div className="pd-proto-tag">PROTOTYPE — variant {variant}</div>
      {variant === 'A' && <VariantA {...props} />}
      {variant === 'B' && <VariantB {...props} />}
      {variant === 'C' && <VariantC {...props} />}
      <PrototypeSwitcher current={variant} onChange={setVariant} />
    </>
  );
}

/** A filled-in example so every tab has something to show straight away. */
export function exampleDraft(d: InputDraft): InputDraft {
  return { ...d, debt: '42000', repaymentStart: '2026-01', surplus: '250', income: '42000' };
}
