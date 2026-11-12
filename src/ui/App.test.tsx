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

    const text = (id: string) => screen.getByTestId(id).textContent!.replace(/\s/g, ' ');
    expect(text('termijn')).toBe('€ 109,96');
    expect(text('total-paid')).toBe('€ 46.181,14');
    expect(text('kwijtgescholden')).toBe('€ 0,00');
    expect(within(screen.getByRole('region', { name: 'Uitkomst' })).getAllByRole('row')).toHaveLength(1 + 8);
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
});
