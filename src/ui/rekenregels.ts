import { DEFAULT_BOX3_REGIME_PATH, lastPublishedRateYear, REKENREGELS, type Box3Settings, type Box3WetStatus, type Rekenregels } from '../engine';
import { strategyNameInline, type Duel, type VerdictKind } from './duel';

/**
 * The law-status layer of the results screen (#12, #29): the footer stamp and the box 3 chip,
 * both read from the rekenregels config.
 */

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-11-12" → "12 november 2026". */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return dateFormat.format(new Date(Date.UTC(y, m - 1, d)));
}

/** "box 3 volgens …" in the stamp. */
const STAND_WETGEVING: Record<Box3WetStatus, string> = {
  wetsvoorstel: 'het wetsvoorstel (nog geen wet)',
  'aangenomen door Tweede Kamer': 'het wetsvoorstel zoals aangenomen door de Tweede Kamer (nog geen wet)',
  'wet (Staatsblad)': 'de wet (Staatsblad)',
  verworpen: 'het huidige forfait (nieuw stelsel verworpen)',
};

/** The status in brackets after "het nieuwe stelsel vanaf 2029". */
const STATUS_KORT: Record<Box3WetStatus, string> = {
  wetsvoorstel: 'wetsvoorstel, nog geen wet',
  'aangenomen door Tweede Kamer': 'aangenomen door de Tweede Kamer, nog geen wet',
  'wet (Staatsblad)': 'wet, gepubliceerd in het Staatsblad',
  verworpen: 'wetsvoorstel verworpen',
};

/** The status as a short phrase for hints elsewhere: "wetsvoorstel, nog geen wet". */
export function box3StatusKort(r: Rekenregels = REKENREGELS): string {
  return STATUS_KORT[r.box3.status];
}

/** The footer stamp: "Rekenregels bijgewerkt tot <datum>: DUO-rente <jaar>, box 3 volgens <stand wetgeving>." */
export function rekenregelsStamp(r: Rekenregels = REKENREGELS): string {
  return `Rekenregels bijgewerkt tot ${formatDateLong(r.bijgewerktTot)}: DUO-rente ${lastPublishedRateYear(r)}, box 3 volgens ${STAND_WETGEVING[r.box3.status]}.`;
}

export interface Box3Chip {
  text: string;
  /** Highlighted: the paired "forfait blijft" run puts the duel in another verdict category. */
  warning: boolean;
}

function pairedOutcome(kind: VerdictKind, duel: Duel): string {
  const name = strategyNameInline(duel.challenger.strategy);
  switch (kind) {
    case 'aflossen':
      return 'wint extra aflossen';
    case 'challenger':
      return `wint ${name}`;
    case 'gelijk':
      return `leveren extra aflossen en ${name} ongeveer even veel op`;
  }
}

/**
 * The box 3 chip under the verdict (#12): always there and muted, naming the regime the run uses
 * and the law's status; a warning exactly when the paired "forfait blijft" run changes the verdict
 * category. Under "huidig forfait blijft gelden" the paired run is the run itself, so it never warns.
 */
export function box3Chip(duel: Duel, box3: Box3Settings, r: Rekenregels = REKENREGELS): Box3Chip {
  const forfait = (box3.regimePath ?? DEFAULT_BOX3_REGIME_PATH) === 'forfait-blijft';
  const status = r.box3.status;
  const start = r.box3.werkelijk.startYear;
  if (!forfait && duel.forfaitBlijftKind !== null && duel.forfaitBlijftKind !== duel.kind) {
    return { text: `Let op: als het huidige box 3-stelsel blijft, ${pairedOutcome(duel.forfaitBlijftKind, duel)}.`, warning: true };
  }
  if (forfait) {
    return {
      text:
        status === 'verworpen'
          ? 'Box 3: gerekend met het huidige forfait, want het nieuwe stelsel is verworpen'
          : `Box 3: gerekend met het huidige forfait voor de hele looptijd (nieuw stelsel vanaf ${start}: ${STATUS_KORT[status]})`,
      warning: false,
    };
  }
  return {
    text:
      status === 'verworpen'
        ? `Box 3: gerekend met het nieuwe stelsel vanaf ${start}, hoewel het wetsvoorstel is verworpen`
        : `Box 3: gerekend met het nieuwe stelsel vanaf ${start} (${STATUS_KORT[status]})`,
    warning: false,
  };
}
