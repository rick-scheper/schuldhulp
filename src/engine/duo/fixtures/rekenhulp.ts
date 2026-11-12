import case1 from './rekenhulp/case-1.json';
import case2 from './rekenhulp/case-2.json';
import case3 from './rekenhulp/case-3.json';
import case4 from './rekenhulp/case-4.json';

/** One #16 check-(b) case: a constant-rate DUO schedule compared with DUO's rekenhulp. */
export interface RekenhulpFixture {
  id: string;
  description: string;
  input: {
    debt: number;
    /** DUO rate in percent, e.g. 2.7 for 2.70% */
    annualRatePct: number;
    /** months left in the terugbetaalfase */
    remainingMonths: number;
    regime: 'SF35';
    income: number | null;
  };
  expected: { termijn: number; totalPaid: number; kwijtgescholden: number };
  tolerance: {
    termijnAbs: number;
    totalPaidRel: number;
    kwijtgescholdenRel: number;
    kwijtgescholdenAbs: number;
  };
  source: string;
  retrieved: string;
  /** path to the committed rekenhulp screenshot, null until one is captured */
  screenshot: string | null;
  derivation?: string;
}

export function loadRekenhulpFixtures(): RekenhulpFixture[] {
  return [case1, case2, case3, case4] as RekenhulpFixture[];
}
