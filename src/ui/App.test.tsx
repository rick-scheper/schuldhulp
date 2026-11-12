// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { ym } from '../engine';

afterEach(cleanup);

describe('App', () => {
  it('asks for the three required inputs and shows nothing computed yet', () => {
    render(<App today={ym(2027, 1)} />);
    expect(screen.getByLabelText(/Huidige studieschuld/)).toBeTruthy();
    expect(screen.getByLabelText(/Start terugbetaalfase/)).toBeTruthy();
    expect(screen.getByLabelText(/Maandelijks surplus/)).toBeTruthy();
    expect(screen.queryByTestId('termijn')).toBeNull();
  });

  it('shows termijn, total paid and kwijtgescholden bedrag once the inputs are filled in', () => {
    render(<App today={ym(2027, 1)} />);
    fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
    fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
    fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
    // Rekenhulp case 1: 2.70% for the whole term.
    fireEvent.change(screen.getByLabelText(/Huidige DUO-rente/), { target: { value: '2,70' } });
    fireEvent.click(screen.getByLabelText(/Rente blijft gelijk/));

    const text = (id: string) => screen.getByTestId(id).textContent!.replace(/\s/g, ' ');
    expect(text('termijn')).toBe('€ 109,96');
    expect(text('total-paid')).toBe('€ 46.181,14');
    expect(text('kwijtgescholden')).toBe('€ 0,00');
    expect(within(screen.getByTestId('recalculations')).getAllByRole('row')).toHaveLength(1 + 8);
  });

  describe('draagkracht (#21)', () => {
    const fill = (income: string) => {
      render(<App today={ym(2027, 1)} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '60.000' } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
      fireEvent.change(screen.getByLabelText(/Bruto jaarinkomen/), { target: { value: income } });
      fireEvent.change(screen.getByLabelText(/Huidige DUO-rente/), { target: { value: '2,70' } });
    };
    const text = (id: string) => screen.getByTestId(id).textContent!.replace(/\s/g, ' ');

    it('applies the wettelijk maandbedrag when the income is empty', () => {
      fill('');
      expect(text('termijn')).toBe('€ 219,91');
      expect(text('kwijtgescholden')).toBe('€ 0,00');
    });

    it('caps the termijn by draagkracht and shows the kwijtgescholden bedrag apart from the eindvermogen', () => {
      fill('50.000');
      fireEvent.change(screen.getByLabelText(/Inkomensgroei/), { target: { value: '0' } });
      expect(text('termijn')).toBe('€ 71,98');
      expect(text('termijn-hint')).toMatch(/draagkracht/);
      expect(screen.getByTestId('kwijtgescholden').textContent).not.toMatch(/0,00/);
      expect(screen.getByRole('region', { name: 'Strategieën' }).textContent).toMatch(/telt niet mee in je eindvermogen/);
    });

    it('offers income growth under Geavanceerd, 2,4% by default', () => {
      fill('50.000');
      expect((screen.getByLabelText(/Inkomensgroei/) as HTMLInputElement).value).toBe('2,4');
    });
  });

  describe('strategies', () => {
    const fill = () => {
      render(<App today={ym(2027, 1)} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
    };
    const euros = (id: string) => Number(screen.getByTestId(id).textContent!.replace(/[^\d,]/g, '').replace(',', '.'));

    it('shows the eindvermogen of all four strategies, aflossen as the baseline', () => {
      fill();
      for (const kind of ['aflossen', 'vastrentend', 'aandelen', 'mix']) {
        expect(euros(`eindvermogen-${kind}`)).toBeGreaterThan(0);
      }
      expect(screen.getByTestId('strategy-aflossen').textContent).toMatch(/baseline/);
    });

    it("switches between euro's van nu and nominaal", () => {
      fill();
      const real = euros('eindvermogen-aandelen');
      fireEvent.click(screen.getByLabelText(/Nominaal/));
      const nominal = euros('eindvermogen-aandelen');
      expect(nominal / real).toBeCloseTo(Math.pow(1.02, 35), 3);
    });

    it('uses the inflation from Geavanceerd for the deflation', () => {
      fill();
      fireEvent.click(screen.getByLabelText(/Nominaal/));
      const nominal0 = euros('eindvermogen-vastrentend');
      fireEvent.change(screen.getByLabelText(/Inflatie/), { target: { value: '0' } });
      fireEvent.click(screen.getByLabelText(/Surplus groeit mee/)); // keep the surplus fixed
      fireEvent.click(screen.getByLabelText(/Euro's van nu/));
      const real = euros('eindvermogen-vastrentend');
      expect(real).toBeLessThan(nominal0);
      fireEvent.click(screen.getByLabelText(/Nominaal/));
      expect(euros('eindvermogen-vastrentend')).toBe(real);
    });

    it('offers the Geavanceerd fields', () => {
      fill();
      for (const label of [/Verwacht rendement aandelen/, /Fondskosten \(TER\)/, /Inflatie/, /Surplus groeit mee/, /Vrijgekomen geld/]) {
        expect(screen.getByLabelText(label)).toBeTruthy();
      }
    });

    it('sets the TER from the chosen index', () => {
      fill();
      const ter = screen.getByLabelText(/Fondskosten/) as HTMLInputElement;
      expect(ter.value).toBe('0,07');
      fireEvent.change(screen.getByLabelText(/Index voor aandelen/), { target: { value: 'msciWorld' } });
      expect(ter.value).toBe('0,20');
    });

    it('moves the aflossen pot to vastrentend when the destination is overridden', () => {
      fill();
      const before = euros('eindvermogen-aflossen');
      fireEvent.change(screen.getByLabelText(/Vrijgekomen geld/), { target: { value: 'vastrentend' } });
      expect(euros('eindvermogen-aflossen')).toBeLessThan(before);
    });
  });

  describe('DUO rate and rentevaste periodes (#22)', () => {
    const fill = (today: ReturnType<typeof ym>, repaymentStart: string) => {
      render(<App today={today} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: repaymentStart } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
    };
    const rateInput = () => screen.getByLabelText(/Huidige DUO-rente/) as HTMLInputElement;
    const periodRows = () =>
      within(screen.getByTestId('rate-periods'))
        .getAllByRole('row')
        .slice(1)
        .map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent));

    it('pre-fills the current rate and period end from the published SF35 rate of the period start year', () => {
      fill(ym(2027, 1), '2027-01'); // aanloopfase from 2025: period 2025–2029 at 2.57%
      expect(rateInput().value).toBe('');
      expect(rateInput().placeholder).toBe('2,57');
      expect((screen.getByLabelText(/Einde rentevaste periode/) as HTMLInputElement).placeholder).toBe('2029');
      expect(screen.getByTestId('rate-hint').textContent).toMatch(/2025 tot en met 2029/);
      expect(periodRows()[0]).toEqual(['2025–2029', '2,57%', 'je huidige rente']);
      expect(periodRows()[1]![0]).toBe('2030–2034');
    });

    it('uses an entered period end for the next reset', () => {
      fill(ym(2027, 1), '2027-01');
      fireEvent.change(screen.getByLabelText(/Einde rentevaste periode/), { target: { value: '2028' } });
      expect(periodRows()[1]![0]).toBe('2029–2033');
      fireEvent.change(screen.getByLabelText(/Einde rentevaste periode/), { target: { value: '2040' } });
      expect(screen.queryByTestId('termijn')).toBeNull();
      expect(screen.getByText(/einde van je rentevaste periode/)).toBeTruthy();
    });

    it('resets the rate yearly while studying, then fixes 5-year periods from the aanloopfase', () => {
      fill(ym(2026, 11), '2031-01'); // aanloopfase from 2029
      expect(rateInput().placeholder).toBe('2,33');
      expect(screen.queryByLabelText(/Einde rentevaste periode/)).toBeNull();
      const rows = periodRows();
      expect(rows.slice(0, 2)).toEqual([
        ['2026', '2,33%', 'je huidige rente'],
        ['2027', '2,70%', 'gepubliceerd door DUO'],
      ]);
      expect(rows[2]![0]).toBe('2028');
      expect(rows[2]![2]).toBe('verwacht, uit de 5-jaarsrente');
      expect(rows[3]![0]).toBe('2029–2033');
    });

    it('offers "rente blijft gelijk" under Geavanceerd, off by default', () => {
      fill(ym(2027, 1), '2027-01');
      const toggle = screen.getByLabelText(/Rente blijft gelijk/) as HTMLInputElement;
      expect(toggle.closest('details')?.querySelector('summary')?.textContent).toBe('Geavanceerd');
      expect(toggle.checked).toBe(false);
      const moving = screen.getByTestId('total-paid').textContent;
      fireEvent.click(toggle);
      expect(periodRows().every((r) => r[1] === '2,57%')).toBe(true);
      expect(screen.getByTestId('total-paid').textContent).not.toBe(moving);
    });
  });
});
