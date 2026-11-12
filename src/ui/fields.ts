/**
 * Ids of the Geavanceerd fields the results screen links to ("wijzig", "aanpassen"), and the
 * click handler that opens Geavanceerd and focuses one.
 */
export const FIELD_IDS = {
  forfaitBlijft: 'switch-forfait-blijft',
  kwijtscheldingBelast: 'switch-kwijtschelding-belast',
  equityReturn: 'field-equity-return',
  inflation: 'field-inflation',
  theta: 'field-theta',
  constantRate: 'switch-constant-rate',
} as const;

export type FieldId = (typeof FIELD_IDS)[keyof typeof FIELD_IDS];

/** Opens the Geavanceerd section and focuses a field in the input form. */
export function goToField(id: string) {
  return (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const details = el.closest('details');
    if (details) details.open = true;
    el.scrollIntoView?.({ block: 'center' });
    el.focus();
  };
}
