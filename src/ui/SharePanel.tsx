import { useState } from 'react';

const NOTICE = 'Sommige waarden uit de link konden niet worden gelezen';

/** The gedeelde berekening banner (#17): shown while a link is open over the user's own saved inputs. */
export function SharedBanner({ onAdopt, onBack }: { onAdopt: () => void; onBack: () => void }) {
  return (
    <div className="card shared-banner" role="region" aria-label="Gedeelde berekening">
      <p>Je bekijkt een gedeelde berekening.</p>
      <div className="button-row">
        <button type="button" className="btn primary" onClick={onAdopt}>
          Overnemen als mijn invoer
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Terug naar mijn eigen
        </button>
      </div>
    </div>
  );
}

/** Values in the link that fell back to their default. */
export function LinkNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <p className="callout link-notice" role="status">
      {NOTICE}; daar staat de standaardwaarde.{' '}
      <button type="button" className="btn link" onClick={onDismiss}>
        Sluiten
      </button>
    </p>
  );
}

interface Props {
  /** Builds the link for the current inputs. */
  makeUrl: () => string;
  /** Null while the banner is up: the choice there comes first. */
  onReset: (() => void) | null;
}

/** "Deel deze berekening" and "Opnieuw beginnen" (#31). The link is copied, never live-synced. */
export function SharePanel({ makeUrl, onReset }: Props) {
  const [link, setLink] = useState<{ url: string; copied: boolean } | null>(null);

  const share = async () => {
    const url = makeUrl();
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // No clipboard (insecure context, denied): the link is shown to copy by hand.
    }
    setLink({ url, copied });
  };

  return (
    <div className="card share-panel">
      <div className="button-row">
        <button type="button" className="btn" onClick={share}>
          Deel deze berekening
        </button>
        {onReset && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setLink(null);
              onReset();
            }}
          >
            Opnieuw beginnen
          </button>
        )}
      </div>
      <p className="hint">
        Deze link bevat je bedragen. Je invoer wordt alleen in deze browser bewaard.
      </p>
      {link && (
        <label className="field share-link">
          <span className="hint" role="status">
            {link.copied ? 'Link gekopieerd.' : 'Kopieer deze link:'}
          </span>
          <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} aria-label="Link naar deze berekening" />
        </label>
      )}
    </div>
  );
}
