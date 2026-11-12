import d1 from './box3/d1.json';
import d2 from './box3/d2.json';
import d2overig from './box3/d2-overig.json';
import d3loss from './box3/d3-loss.json';
import d3low from './box3/d3-low.json';
import d4 from './box3/d4.json';
import d5 from './box3/d5.json';
import d6 from './box3/d6.json';
import type { Box3Year, VastrentendProduct } from '../regime';
import type { WerkelijkBreakdown } from '../werkelijk';

/** One #16 check-(d) case: a box 3 year calculated by hand with the Belastingdienst's method. */
export interface Box3Fixture {
  id: string;
  description: string;
  input: {
    year: number;
    equity: number;
    vastrentend: number;
    vastrentendProduct: VastrentendProduct;
    overig: number;
    debt: number;
    /** The year's werkelijk rendement; null = forfait only. */
    actualReturn: number | null;
  };
  expected: Record<string, number>;
  tolerance: { taxAbs: number };
  source: string;
  retrieved: string;
  derivation: string;
}

export function loadBox3Fixtures(): Box3Fixture[] {
  return [d1, d2, d2overig, d3loss, d3low] as Box3Fixture[];
}

/** One #16 check-(d) case under werkelijk rendement: a run of years through the regime path. */
export interface Box3WerkelijkFixture {
  id: string;
  description: string;
  settings: { inflation: number; kwijtscheldingBelast?: boolean };
  years: {
    input: Box3Year;
    expected: {
      regime: 'werkelijk' | 'forfait';
      tax: number;
      realisationTax: number;
      costBasis: number;
      taxed: Partial<WerkelijkBreakdown>;
    };
    /** Same year with "kwijtschelding belast in box 3" off. */
    expectedSwitchOff?: { tax: number; taxed: Partial<WerkelijkBreakdown> };
  }[];
  tolerance: { taxAbs: number };
  source: string;
  retrieved: string;
  derivation: string;
}

export function loadBox3WerkelijkFixtures(): Box3WerkelijkFixture[] {
  return [d4, d5, d6] as Box3WerkelijkFixture[];
}
