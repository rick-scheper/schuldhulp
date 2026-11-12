/**
 * Monthly rate for a yearly DUO rate (as a fraction, 0.027 = 2.70%).
 *
 * DUO's rekenhulp treats the yearly rate as an effective annual rate:
 * i = (1 + rate)^(1/12) − 1. Using rate/12 instead overshoots the termijn by
 * about €0.53 on €30k over 35 years, outside the #16 tolerance.
 * See src/engine/duo/fixtures/rekenhulp/README.md.
 */
export function monthlyRate(annualRate: number): number {
  if (annualRate === 0) return 0;
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/** Equal monthly payment that clears `debt` in `months` months at monthly rate `rate`. */
export function annuityPayment(debt: number, rate: number, months: number): number {
  if (debt <= 0 || months <= 0) return 0;
  if (rate === 0) return debt / months;
  return (debt * rate) / (1 - Math.pow(1 + rate, -months));
}
