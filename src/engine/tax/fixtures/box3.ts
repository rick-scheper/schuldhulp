import d1 from './box3/d1.json';
import d2 from './box3/d2.json';
import d2overig from './box3/d2-overig.json';
import d3loss from './box3/d3-loss.json';
import d3low from './box3/d3-low.json';
import type { VastrentendProduct } from '../regime';

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
