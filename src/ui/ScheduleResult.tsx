import type { ConstantRateSchedule, RecalculationKind } from '../engine';
import { formatEuro, formatMonthLong } from './format';

const KIND_TAGS: Partial<Record<RecalculationKind, string>> = { start: 'nu', draagkracht: 'na draagkracht' };

export function ScheduleResult({ schedule }: { schedule: ConstantRateSchedule }) {
  return (
    <section className="card result" aria-label="Uitkomst">
      <dl className="stats">
        <div className="stat">
          <dt>Termijn</dt>
          <dd data-testid="termijn">{formatEuro(schedule.termijn)}</dd>
          <span className="hint" data-testid="termijn-hint">
            {schedule.termijn < schedule.wettelijkMaandbedrag
              ? `per maand: begrensd door je draagkracht; je wettelijk maandbedrag is ${formatEuro(schedule.wettelijkMaandbedrag)}`
              : schedule.draagkrachtCaps
                ? 'per maand: nu het wettelijk maandbedrag; later begrenst je draagkracht de termijn'
                : 'per maand: het wettelijk maandbedrag'}
          </span>
        </div>
        <div className="stat">
          <dt>Totaal terugbetaald</dt>
          <dd data-testid="total-paid">{formatEuro(schedule.totalPaid)}</dd>
          <span className="hint">over de resterende {schedule.remainingMonths} maanden</span>
        </div>
        <div className="stat">
          <dt>Kwijtgescholden bedrag</dt>
          <dd data-testid="kwijtgescholden">{formatEuro(schedule.kwijtgescholden)}</dd>
          <span className="hint">
            wat er na {formatMonthLong(schedule.endMonth)} nog openstaat en DUO kwijtscheldt; telt niet mee in je
            eindvermogen
          </span>
        </div>
      </dl>

      <h2>Herberekeningen van het maandbedrag</h2>
      <p className="hint">
        DUO berekent het wettelijk maandbedrag opnieuw in aflosjaar 1 en 4 en daarna elke 5 jaar, over de maanden die
        dan nog over zijn. Betaalde je door je draagkracht een jaar minder, dan rekent DUO het op 1 januari opnieuw uit.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Aflosjaar</th>
              <th>Vanaf</th>
              <th className="num">Studieschuld</th>
              <th className="num">Maanden over</th>
              <th className="num">Wettelijk maandbedrag</th>
            </tr>
          </thead>
          <tbody>
            {schedule.recalculations.map((r) => (
              <tr key={`${r.month.year}-${r.month.month}`}>
                <td>
                  {r.repaymentYear}
                  {KIND_TAGS[r.kind] && <span className="tag">{KIND_TAGS[r.kind]}</span>}
                </td>
                <td>{formatMonthLong(r.month)}</td>
                <td className="num">{formatEuro(r.debt)}</td>
                <td className="num">{r.remainingMonths}</td>
                <td className="num">{formatEuro(r.wettelijkMaandbedrag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
