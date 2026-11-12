import type { ConstantRateSchedule } from '../engine';
import { formatEuro, formatMonthLong } from './format';

export function ScheduleResult({ schedule }: { schedule: ConstantRateSchedule }) {
  return (
    <section className="card result" aria-label="Uitkomst">
      <dl className="stats">
        <div className="stat">
          <dt>Termijn</dt>
          <dd data-testid="termijn">{formatEuro(schedule.termijn)}</dd>
          <span className="hint">per maand: het wettelijk maandbedrag, nog zonder draagkracht</span>
        </div>
        <div className="stat">
          <dt>Totaal terugbetaald</dt>
          <dd data-testid="total-paid">{formatEuro(schedule.totalPaid)}</dd>
          <span className="hint">over de resterende {schedule.remainingMonths} maanden</span>
        </div>
        <div className="stat">
          <dt>Kwijtgescholden bedrag</dt>
          <dd data-testid="kwijtgescholden">{formatEuro(schedule.kwijtgescholden)}</dd>
          <span className="hint">wat er na {formatMonthLong(schedule.endMonth)} nog openstaat</span>
        </div>
      </dl>

      <h2>Herberekeningen van het maandbedrag</h2>
      <p className="hint">
        DUO berekent het wettelijk maandbedrag opnieuw in aflosjaar 1 en 4 en daarna elke 5 jaar, over de maanden die
        dan nog over zijn.
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
                  {r.kind === 'start' && <span className="tag">nu</span>}
                </td>
                <td>{formatMonthLong(r.month)}</td>
                <td className="num">{formatEuro(r.debt)}</td>
                <td className="num">{r.remainingMonths}</td>
                <td className="num">{formatEuro(r.termijn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
