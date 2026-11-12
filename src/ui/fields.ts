/**
 * Ids of the Geavanceerd fields the results screen links to ("wijzig", "aanpassen"), and the
 * click handler that opens Geavanceerd and focuses one.
 */
export const FIELD_IDS = {
  forfaitBlijft: 'switch-forfait-blijft',
  kwijtscheldingBelast: 'switch-kwijtschelding-belast',
  equityReturn: 'field-equity-return',
  inflation: 'field-inflation',
  incomeGrowth: 'field-income-growth',
  theta: 'field-theta',
  constantRate: 'switch-constant-rate',
} as const;

export type FieldId = (typeof FIELD_IDS)[keyof typeof FIELD_IDS];

/** Window event that opens the cockpit's input drawer, synchronously, before a field is focused. */
export const OPEN_INVOER = 'schuldhulp:open-invoer';

/** Opens the input drawer and the Geavanceerd section, and focuses a field in the input form. */
export function goToField(id: string) {
  return (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    window.dispatchEvent(new Event(OPEN_INVOER));
    const details = el.closest('details');
    if (details) details.open = true;
    el.scrollIntoView?.({ block: 'center' });
    el.focus();
  };
}
