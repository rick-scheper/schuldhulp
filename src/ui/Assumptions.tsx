import { assumptionItems } from './caveats';
import { goToField } from './fields';
import type { ParsedInputs } from './inputs';

/**
 * "Waar rust deze berekening op?" (#12, #29): folded, between the fan chart and the mortgage note.
 * Every assumption with the value in use and, where the user can change it, an "aanpassen" link
 * to its Geavanceerd field.
 */
export function Assumptions({ inputs }: { inputs: ParsedInputs }) {
  const items = assumptionItems(inputs);
  return (
    <details className="card result fold assumptions" data-testid="assumptions">
      <summary>Waar rust deze berekening op?</summary>
      <ol>
        {items.map((item) => (
          <li key={item.key} data-testid={`assumption-${item.key}`}>
            <strong>{item.title}.</strong> {item.value}{' '}
            {item.fieldId ? (
              <a href={`#${item.fieldId}`} onClick={goToField(item.fieldId)}>
                aanpassen
              </a>
            ) : (
              <span className="hint">(niet aan te passen)</span>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
