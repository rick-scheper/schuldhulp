// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { EMPTY_DRAFT } from './inputs';
import { ym, type MonteCarloInput } from '../engine';
import { createMonteCarloClient, type MonteCarloClient, type WorkerLike } from '../worker/client';
import { handleRequest, type WorkerRequest, type WorkerResponse } from '../worker/protocol';

afterEach(cleanup);
// The cockpit shows one lens at a time; the others are hidden tab panels.
const showLens = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
// The app auto-saves (#31): every test starts without saved inputs or a share link.
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

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
    showLens('Details');
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
      showLens('Vermogen');
      expect(screen.getByRole('region', { name: 'Strategieën' }).textContent).toMatch(/telt niet mee in je eindvermogen/);
    });

    it('uses the inkomensvoorspelling by default: the growth field is empty and the outlook is shown', () => {
      fill('50.000');
      expect((screen.getByLabelText(/Inkomensgroei/) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/Afstudeerjaar/) as HTMLInputElement).placeholder).toBe('2024');
      expect(text('income-outlook')).toMatch(/^Inkomensvoorspelling: \+\d+,\d% volgend jaar/);
    });

    it('lets the sector and opleiding change the forecast', () => {
      fill('50.000');
      const algemeen = text('income-outlook');
      fireEvent.change(screen.getByLabelText(/^Sector/), { target: { value: 'zorg' } });
      const zorg = text('income-outlook');
      expect(zorg).not.toBe(algemeen);
      fireEvent.change(screen.getByLabelText(/^Opleiding/), { target: { value: 'wo' } });
      expect(text('income-outlook')).not.toBe(zorg);
    });

    it('hides the forecast fields when a fixed income growth is typed', () => {
      fill('50.000');
      fireEvent.change(screen.getByLabelText(/Inkomensgroei/), { target: { value: '2,4' } });
      expect(screen.queryByLabelText(/^Sector/)).toBeNull();
      expect(text('income-outlook')).toMatch(/^Verwacht bruto jaarinkomen/);
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
        expect(screen.getByLabelText(label, { selector: 'input, select' })).toBeTruthy();
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
      fireEvent.change(screen.getByLabelText(/Vrijgekomen geld/, { selector: 'select' }), { target: { value: 'vastrentend' } });
      expect(euros('eindvermogen-aflossen')).toBeLessThan(before);
    });
  });

  describe('box 3 (#23)', () => {
    const fill = (surplus = '1.000') => {
      render(<App today={ym(2027, 1)} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: surplus } });
    };
    const euros = (id: string) => Number(screen.getByTestId(id).textContent!.replace(/[^\d,]/g, '').replace(',', '.'));

    it('shows the eindvermogen after box 3 and the box 3 tax per strategy', () => {
      fill();
      showLens('Vermogen');
      expect(screen.getByRole('region', { name: 'Strategieën' }).textContent).toMatch(/na box 3-belasting/);
      expect(euros('box3-aandelen')).toBeGreaterThan(0);
    });

    it('takes an optional overig box 3-vermogen that raises the tax', () => {
      fill();
      const before = euros('box3-aandelen');
      const eind = euros('eindvermogen-aandelen');
      fireEvent.change(screen.getByLabelText(/Overig box 3-vermogen/), { target: { value: '50.000' } });
      expect(euros('box3-aandelen')).toBeGreaterThan(before);
      expect(euros('eindvermogen-aandelen')).toBeLessThan(eind);
    });

    it('offers the vastrentend product type under Geavanceerd: deposito by default, staatsobligatie taxed more under the forfait', () => {
      fill();
      fireEvent.click(screen.getByLabelText(/Huidig forfait blijft gelden/));
      const select = screen.getByLabelText(/Soort vastrentend product/) as HTMLSelectElement;
      expect(select.closest('details')?.querySelector('summary')?.textContent).toBe('Geavanceerd');
      expect(select.value).toBe('deposito');
      const deposito = euros('box3-vastrentend');
      fireEvent.change(select, { target: { value: 'staatsobligatie' } });
      expect(euros('box3-vastrentend')).toBeGreaterThan(deposito);
    });
  });

  describe('box 3 werkelijk rendement and switches (#24)', () => {
    const fill = (debt = '30.000', surplus = '1.000', income?: string) => {
      render(<App today={ym(2027, 1)} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: debt } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: surplus } });
      if (income) fireEvent.change(screen.getByLabelText(/Bruto jaarinkomen/), { target: { value: income } });
    };
    const euros = (id: string) => Number(screen.getByTestId(id).textContent!.replace(/[^\d,]/g, '').replace(',', '.'));
    const advanced = (el: HTMLElement) => el.closest('details')?.querySelector('summary')?.textContent;

    it('uses werkelijk rendement from 2029 by default; "huidig forfait blijft gelden" switches it off', () => {
      fill();
      const toggle = screen.getByLabelText(/Huidig forfait blijft gelden/) as HTMLInputElement;
      expect(advanced(toggle)).toBe('Geavanceerd');
      expect(toggle.checked).toBe(false);
      expect(screen.getByTestId('box3-hint').textContent).toMatch(/Vanaf 2029 rekent de app met werkelijk rendement/);
      const werkelijk = euros('eindvermogen-aandelen');
      fireEvent.click(toggle);
      expect(screen.getByTestId('box3-hint').textContent).not.toMatch(/werkelijk rendement/);
      expect(euros('eindvermogen-aandelen')).not.toBe(werkelijk);
    });

    it('taxes the kwijtschelding by default; switching it off makes it tax-free', () => {
      fill('60.000', '300', '30.000');
      const toggle = screen.getByLabelText(/Kwijtschelding belast in box 3/) as HTMLInputElement;
      expect(advanced(toggle)).toBe('Geavanceerd');
      expect(toggle.checked).toBe(true);
      const taxed = euros('box3-vastrentend');
      const eind = euros('eindvermogen-vastrentend');
      fireEvent.click(toggle);
      expect(euros('box3-vastrentend')).toBeLessThan(taxed);
      expect(euros('eindvermogen-vastrentend')).toBeGreaterThan(eind);
      expect(screen.getByTestId('box3-hint').textContent).toMatch(/Kwijtschelding rekent de app als onbelast/);
    });

    it('disables the kwijtschelding switch under the forfait, where it is always tax-free', () => {
      fill();
      fireEvent.click(screen.getByLabelText(/Huidig forfait blijft gelden/));
      expect((screen.getByLabelText(/Kwijtschelding belast in box 3/) as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByTestId('box3-hint').textContent).toMatch(/Kwijtschelding is onbelast/);
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
        .getAllByRole('row', { hidden: true })
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

  describe('Monte Carlo (#25)', () => {
    /** The real client over in-process stand-ins for the workers, with a small N to keep the test fast. */
    function testClient(seen: MonteCarloInput[]): MonteCarloClient {
      const worker = (): WorkerLike => {
        const w: WorkerLike = {
          onmessage: null,
          postMessage(message: WorkerRequest) {
            const { response } = handleRequest(message);
            setTimeout(() => w.onmessage?.({ data: response } as MessageEvent<WorkerResponse>), 0);
          },
          terminate() {},
        };
        return w;
      };
      const client = createMonteCarloClient(worker, 2);
      return {
        run: (input) => {
          seen.push(input);
          return client.run({ ...input, n: 40 });
        },
        dispose: client.dispose,
      };
    }
    const fill = (seen: MonteCarloInput[]) => {
      render(<App today={ym(2027, 1)} monteCarlo={testClient(seen)} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
    };
    const euros = (id: string) => Number(screen.getByTestId(id).textContent!.replace(/[^\d,]/g, '').replace(',', '.'));

    it('shows the verdict and the duel once the worker is done', async () => {
      const seen: MonteCarloInput[] = [];
      fill(seen);
      await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
      expect(euros('duel-baseline-median')).toBeGreaterThan(0);
      expect(euros('duel-challenger-median')).toBeGreaterThan(0);
      expect(screen.queryByTestId('mc-running')).toBeNull();
    });

    it('offers the verwachte langetermijnrente (θ) under Geavanceerd and passes it to the Monte Carlo', async () => {
      const seen: MonteCarloInput[] = [];
      fill(seen);
      const theta = screen.getByLabelText(/Verwachte langetermijnrente/) as HTMLInputElement;
      expect(theta.closest('details')?.querySelector('summary')?.textContent).toBe('Geavanceerd');
      expect(theta.value).toBe('3,0');
      expect(seen.at(-1)!.model!.vasicek.theta).toBe(0.03);
      const before = screen.getByTestId('total-paid').textContent;
      fireEvent.change(theta, { target: { value: '5' } });
      expect(seen.at(-1)!.model!.vasicek.theta).toBe(0.05);
      // The deterministic rentepad follows θ too.
      expect(screen.getByTestId('total-paid').textContent).not.toBe(before);
      await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    });

    it('"rente blijft gelijk" switches the Monte Carlo to the constant-rate rentepad', async () => {
      const seen: MonteCarloInput[] = [];
      fill(seen);
      expect(seen.at(-1)!.rate.constant).toBe(false);
      fireEvent.click(screen.getByLabelText(/Rente blijft gelijk/));
      expect(seen.at(-1)!.rate.constant).toBe(true);
      await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    });

    it('without workers the page still works, without the duel', () => {
      render(<App today={ym(2027, 1)} monteCarlo={null} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
      expect(screen.getByTestId('termijn')).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Duel' })).toBeNull();
    });
  });

  describe('verdict + duel (#26)', () => {
    function testClient(): MonteCarloClient {
      const worker = (): WorkerLike => {
        const w: WorkerLike = {
          onmessage: null,
          postMessage(message: WorkerRequest) {
            const { response } = handleRequest(message);
            setTimeout(() => w.onmessage?.({ data: response } as MessageEvent<WorkerResponse>), 0);
          },
          terminate() {},
        };
        return w;
      };
      const client = createMonteCarloClient(worker, 2);
      return { run: (input) => client.run({ ...input, n: 60 }), dispose: client.dispose };
    }
    const fill = async (debt = '30.000', surplus = '200', income?: string) => {
      render(<App today={ym(2027, 1)} monteCarlo={testClient()} />);
      fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: debt } });
      fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
      fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: surplus } });
      if (income) fireEvent.change(screen.getByLabelText(/Bruto jaarinkomen/), { target: { value: income } });
      await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
      await waitFor(() => expect(screen.queryByTestId('mc-running')).toBeNull());
    };
    const text = (id: string) => screen.getByTestId(id).textContent!.replace(/\s/g, ' ');
    const euros = (id: string) => Number(screen.getByTestId(id).textContent!.replace(/[^\d]/g, ''));
    const greenDots = () => screen.getByTestId('win-dots').querySelectorAll('.dot.win').length;
    const select = () => screen.getByLabelText('Uitdager') as HTMLSelectElement;

    it('echoes the inputs in a header with an "aanpassen" link back to the form', async () => {
      await fill();
      expect(text('input-summary')).toMatch(/^Studieschuld € 30\.000 · terugbetalen vanaf januari 2027 · € 200 per maand over/);
      const link = within(screen.getByTestId('input-summary')).getByRole('link', { name: 'aanpassen' });
      expect(link.getAttribute('href')).toBe('#invoer');
      expect(document.getElementById('invoer')?.tagName).toBe('FORM');
    });

    it('defaults the challenger to the best median and words the verdict as a doorsnee uitkomst', async () => {
      await fill();
      expect(select().value).toBe('aandelen'); // 100% aandelen has the best median here
      expect(text('verdict')).toMatch(/^In een doorsnee toekomst levert aandelen € [\d.]+ meer op dan extra aflossen\.$/);
      expect(text('verdict-sub')).toMatch(/^In \d+ van de 100 toekomsten beter, in \d+ slechter\.$/);
      // 2 significant figures
      for (const id of ['duel-baseline-median', 'duel-challenger-median']) {
        expect(text(id)).toMatch(/^€ [\d.]+$/);
        expect(String(euros(id)).replace(/0+$/, '').length).toBeLessThanOrEqual(2);
      }
      expect(text('duel-baseline-range')).toMatch(/^8 van de 10 toekomsten eindigen tussen € [\d.]+ en € [\d.]+\. 1 op de 10 eindigt lager dan € [\d.]+\.$/);
      expect(screen.getByTestId('eerder-schuldenvrij')).toBeTruthy();
    });

    it('shows the winkans as 100 dots matching the heading', async () => {
      await fill();
      const heading = text('winkans-heading');
      const m = heading.match(/^Van 100 mogelijke toekomsten wint aandelen er (\d+)$/);
      expect(m).not.toBeNull();
      expect(screen.getByTestId('win-dots').querySelectorAll('.dot')).toHaveLength(100);
      expect(greenDots()).toBe(Number(m![1]));
      expect(text('median-difference')).toMatch(/^\+€ [\d.]+$/);
    });

    it('the challenger dropdown updates the verdict, the duel and the dots', async () => {
      await fill();
      const before = { verdict: text('verdict'), median: text('duel-challenger-median'), dots: greenDots() };
      fireEvent.change(select(), { target: { value: 'vastrentend' } });
      expect(select().value).toBe('vastrentend');
      expect(text('verdict')).toMatch(/vastrentend/);
      expect(text('verdict')).not.toBe(before.verdict);
      expect(text('duel-challenger-median')).not.toBe(before.median);
      expect(text('winkans-heading')).toMatch(/vastrentend/);
      expect(greenDots()).not.toBe(before.dots);
      // vastrentend loses to aflossen here: the "aflossen wint" wording, without the eerder-schuldenvrij line
      expect(text('verdict')).toMatch(/^In een doorsnee toekomst levert extra aflossen € [\d.]+ meer op dan vastrentend\.$/);
      expect(screen.queryByTestId('eerder-schuldenvrij')).toBeNull();
    });

    it("the unit toggle switches the duel between euro's van nu and nominaal", async () => {
      await fill();
      const real = euros('duel-baseline-median');
      fireEvent.click(screen.getByLabelText(/Nominaal/));
      const nominal = euros('duel-baseline-median');
      expect(nominal / real).toBeGreaterThan(1.9);
      expect(nominal / real).toBeLessThan(2.1); // 1,02^35 ≈ 2,0, give or take the rounding
    });

    it('carries the disclaimer under the verdict and the longer text in the footer', async () => {
      await fill();
      expect(text('disclaimer')).toBe('Een rekenvoorbeeld op basis van aannames, geen financieel advies. Je eigen situatie kan afwijken.');
      const footer = text('footer');
      expect(footer).toMatch(/geen financieel advies/);
      expect(footer).toMatch(/geen rechten aan ontlenen/);
      expect(footer).toMatch(/DUO leidend/);
      expect(footer).toMatch(/Belastingdienst/);
    });

    it('never says "scenario", "naar verwachting" or "worst case"', async () => {
      await fill('60.000', '300', '30.000');
      const page = document.body.textContent!.toLowerCase();
      for (const banned of ['scenario', 'naar verwachting', 'worst case']) expect(page).not.toContain(banned);
    });

    it('shows no kwijtschelding callout when the debt is paid off', async () => {
      await fill();
      expect(screen.queryByTestId('kwijtschelding-callout')).toBeNull();
    });

    it('shows the kwijtschelding callout with its chance and how it is taxed, linking to the switch', async () => {
      await fill('60.000', '300', '30.000');
      const callout = text('kwijtschelding-callout');
      expect(callout).toMatch(/Je schuld wordt waarschijnlijk deels kwijtgescholden \(doorsnee € [\d.]+\)/);
      expect(callout).toMatch(/Kans op kwijtschelding: (in \d+ van de 100 toekomsten|vrijwel altijd)/);
      expect(text('kwijtschelding-tax')).toMatch(/vermogenswinst, met ongeveer 36% belasting/);
      showLens('Kansen');
      const link = within(screen.getByTestId('kwijtschelding-tax')).getByRole('link', { name: 'wijzig' });
      const toggle = screen.getByLabelText(/Kwijtschelding belast in box 3/) as HTMLInputElement;
      expect(link.getAttribute('href')).toBe(`#${toggle.id}`);
      const details = toggle.closest('details')!;
      details.open = false;
      fireEvent.click(link);
      expect(details.open).toBe(true);
      expect(document.activeElement).toBe(toggle);

      fireEvent.click(toggle);
      await waitFor(() => expect(text('kwijtschelding-tax')).toMatch(/als onbelast/));
      fireEvent.click(screen.getByLabelText(/Huidig forfait blijft gelden/));
      await waitFor(() => expect(text('kwijtschelding-tax')).toMatch(/onder het huidige forfait is kwijtschelding onbelast/));
    });

    describe('range strips + break-even curve (#27)', () => {
      it('draws one range strip per strategy, with the note on what the ranges mean', async () => {
        await fill();
        for (const kind of ['aflossen', 'vastrentend', 'aandelen', 'mix']) {
          const strip = screen.getByTestId(`strip-${kind}`);
          expect(strip.querySelector('.strip-p1090')).toBeTruthy();
          expect(strip.querySelector('.strip-p2575')).toBeTruthy();
          expect(strip.querySelector('.strip-median')).toBeTruthy();
          expect(strip.querySelector('.strip-base')).toBeTruthy(); // dashed line at the aflossen median
          expect(text(`strip-median-${kind}`)).toMatch(/doorsnee € [\d.]+$/);
        }
        // the baseline cannot be the challenger, so its strip is not a button
        expect(screen.getByTestId('strip-aflossen').tagName).toBe('DIV');
        expect(text('range-note')).toBe(
          'De bandbreedtes laten zien wat er binnen deze aannames kan gebeuren — niet of de aannames kloppen. Zie hieronder bij welk rendement het omslaat.',
        );
      });

      it('a click on a strip makes that strategy the challenger in the duel', async () => {
        await fill();
        expect(screen.getByTestId('strip-aandelen').getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByTestId('strip-vastrentend'));
        expect(select().value).toBe('vastrentend');
        expect(text('verdict')).toMatch(/vastrentend/);
        expect(screen.getByTestId('strip-vastrentend').getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByTestId('strip-aandelen').getAttribute('aria-pressed')).toBe('false');
        // and the dropdown moves the selection on the strips
        fireEvent.change(select(), { target: { value: 'mix' } });
        expect(screen.getByTestId('strip-mix').getAttribute('aria-pressed')).toBe('true');
      });

      it('the strips follow the unit toggle', async () => {
        await fill();
        const real = euros('strip-median-aflossen');
        fireEvent.click(screen.getByLabelText(/Nominaal/));
        expect(euros('strip-median-aflossen') / real).toBeGreaterThan(1.9);
      });

      it('marks the assumption and the break-even, with the sentence in one decimal', async () => {
        await fill();
        expect(text('breakeven-sentence')).toMatch(/^Aandelen winnen zolang de index gemiddeld meer dan \d+,\d% per jaar oplevert\.$/);
        expect(screen.getByTestId('breakeven-marker').textContent).toMatch(/gelijk bij \d+,\d%/);
        expect(screen.getByTestId('assumed-marker').textContent).toBe('aanname 5,4%');
        expect(text('return-caveat')).toMatch(/rendement is een aanname/);
      });

      it('says aandelen win even at 0% when the debt is forgiven', async () => {
        await fill('60.000', '300', '30.000');
        expect(text('breakeven-sentence')).toMatch(/^Aandelen winnen zelfs als de index gemiddeld 0% per jaar oplevert: .*kwijtgescholden/);
        expect(screen.queryByTestId('breakeven-marker')).toBeNull();
      });
    });

    describe('rekenregels, caveats + box 3 chip (#29)', () => {
      it('shows the box 3 chip under the verdict, muted, linking to the forfait switch', async () => {
        await fill();
        showLens('Kansen');
        const chip = screen.getByTestId('box3-chip');
        expect(chip.closest('section')?.getAttribute('aria-label')).toBe('Oordeel');
        expect(chip.className).toBe('chip');
        expect(chip.textContent).toMatch(/^Box 3: gerekend met het nieuwe stelsel vanaf 2029 \(wetsvoorstel, nog geen wet\)/);
        const link = within(chip).getByRole('link', { name: 'wijzig' });
        expect(link.getAttribute('href')).toBe('#switch-forfait-blijft');
        fireEvent.click(screen.getByLabelText(/Huidig forfait blijft gelden/));
        await waitFor(() => expect(text('box3-chip')).toMatch(/huidige forfait voor de hele looptijd/));
      });

      it('stamps the footer with the rekenregels date, the DUO year and the box 3 status', async () => {
        await fill();
        expect(text('rekenregels-stamp')).toBe(
          'Rekenregels bijgewerkt tot 12 november 2026: DUO-rente 2027, box 3 volgens het wetsvoorstel (nog geen wet).',
        );
      });

      it('folds "Waar rust deze berekening op?" after the fan chart, every link pointing at an existing field', async () => {
        await fill();
        const fold = screen.getByTestId('assumptions') as HTMLDetailsElement;
        expect(fold.open).toBe(false);
        expect(fold.querySelector('summary')!.textContent).toBe('Waar rust deze berekening op?');
        const fan = screen.getByText(/Hoe ontwikkelt je vermogen zich/).closest('details')!;
        expect(fan.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(fold.querySelectorAll('li')).toHaveLength(10);
        showLens('Details');
        const links = within(fold).getAllByRole('link', { name: 'aanpassen' });
        expect(links.length).toBe(5);
        for (const a of links) {
          const target = document.getElementById(a.getAttribute('href')!.slice(1));
          expect(target?.closest('details')?.querySelector('summary')?.textContent).toBe('Geavanceerd');
        }
      });

      it('caveat 2 follows the kwijtschelding switch', async () => {
        await fill();
        expect(text('assumption-kwijtschelding')).toMatch(/Belast als vermogenswinst/);
        fireEvent.click(screen.getByLabelText(/Kwijtschelding belast in box 3/));
        expect(text('assumption-kwijtschelding')).toMatch(/Onbelast\./);
      });
    });

    describe('folded fan chart (#28)', () => {
      const fan = () => screen.getByTestId('fan-chart') as HTMLDetailsElement;
      const points = (path: Element) => (path.getAttribute('d')!.match(/[ML]/g) ?? []).length;

      it('is folded by default; opened it shows both fans for every year to the end of the term', async () => {
        await fill();
        expect(fan().tagName).toBe('DETAILS');
        expect(fan().open).toBe(false);
        expect(within(fan()).getByText('Hoe ontwikkelt je vermogen zich?').tagName).toBe('SUMMARY');
        fan().open = true;
        for (const id of ['fan-aflossen', 'fan-aandelen']) {
          const panel = screen.getByTestId(id);
          expect(panel.querySelector('.fan-p1090')).toBeTruthy();
          expect(panel.querySelector('.fan-p2575')).toBeTruthy();
          // 2027 to 2061: the year ends of a term that starts in January 2027
          expect(points(panel.querySelector('.fan-median')!)).toBe(35);
        }
        expect(text('fan-aflossen-title')).toMatch(/^Extra aflossen/);
        expect(text('fan-aandelen-title')).toMatch(/^Aandelen/);
        // the fan ends at the eindvermogen shown in the duel
        expect(text('fan-aflossen-end')).toBe(`eind ${text('duel-baseline-median')}`);
        expect(text('fan-aandelen-end')).toBe(`eind ${text('duel-challenger-median')}`);
      });

      it('follows the challenger', async () => {
        await fill();
        fireEvent.change(select(), { target: { value: 'vastrentend' } });
        expect(screen.queryByTestId('fan-aandelen')).toBeNull();
        expect(screen.getByTestId('fan-vastrentend')).toBeTruthy();
        expect(text('fan-vastrentend-end')).toBe(`eind ${text('duel-challenger-median')}`);
        fireEvent.click(screen.getByTestId('strip-mix'));
        expect(screen.getByTestId('fan-mix')).toBeTruthy();
      });

      it("follows the unit toggle between euro's van nu and nominaal", async () => {
        await fill();
        const median = () => screen.getByTestId('fan-aflossen').querySelector('.fan-median')!.getAttribute('d');
        const real = { end: euros('fan-aflossen-end'), path: median() };
        fireEvent.click(screen.getByLabelText(/Nominaal/));
        expect(euros('fan-aflossen-end') / real.end).toBeGreaterThan(1.9);
        expect(median()).not.toBe(real.path);
        expect(text('fan-hint')).toMatch(/Nominaal/);
      });
    });
  });
});

describe('mortgage koopbudget note (#30)', () => {
  let runs = 0;
  function testClient(): MonteCarloClient {
    const worker = (): WorkerLike => {
      const w: WorkerLike = {
        onmessage: null,
        postMessage(message: WorkerRequest) {
          const { response } = handleRequest(message);
          setTimeout(() => w.onmessage?.({ data: response } as MessageEvent<WorkerResponse>), 0);
        },
        terminate() {},
      };
      return w;
    };
    const client = createMonteCarloClient(worker, 2);
    return {
      run: (input) => {
        runs++;
        return client.run({ ...input, n: 60 });
      },
      dispose: client.dispose,
    };
  }
  const fill = async () => {
    render(<App today={ym(2027, 1)} monteCarlo={testClient()} />);
    fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: '30.000' } });
    fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
    fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
    await waitFor(() => expect(screen.getByTestId('mortgage-note')).toBeTruthy());
    await waitFor(() => expect(screen.queryByTestId('mc-running')).toBeNull());
  };
  const text = (id: string) => screen.getByTestId(id).textContent!.replace(/\s/g, ' ');
  const slider = () => screen.getByLabelText('Hypotheek over aantal jaar') as HTMLInputElement;

  it('sits in the Huis lens, labelled as not scored, with the slider at 5 years', async () => {
    await fill();
    const note = screen.getByTestId('mortgage-note');
    expect(note.closest('[role="tabpanel"]')?.id).toBe('lens-huis');
    expect(note.textContent).toMatch(/telt niet mee in de vergelijking/);
    expect(slider().value).toBe('5');
    expect(slider().min).toBe('0');
    expect(slider().max).toBe('15');
    expect(text('hypotheek-jaren')).toBe('5 jaar');
    expect(text('koopbudget-baseline-median')).toMatch(/^[+−]?€ [\d.]+$/);
    expect(text('koopbudget-challenger-dekt')).toMatch(/is je pot groot genoeg om de schuld af te lossen\.$/);
    expect(text('koopbudget-k')).toMatch(/^(Aflossen bij DUO levert hier € \d,\d\d hypotheekruimte per euro op|Je schuld is dan)/);
    expect(text('koopbudget-eindvermogen')).toBe('Dit verandert je eindvermogen; de uitslag onder Kansen gaat ervan uit dat je blijft beleggen.');
    expect(text('koopbudget-caveat')).toMatch(/inkomen je hypotheek begrenst.*Trhk.*kosten koper, NHG/);
    // From 2029: the realisation tax line (end 2032 here).
    expect(screen.getByTestId('koopbudget-challenger-box3')).toBeTruthy();
    expect(within(screen.getByTestId('assumption-hypotheek')).getByText(/Tijdelijke regeling hypothecair krediet/)).toBeTruthy();
  });

  it('the slider recomputes on the main thread, without a new Monte Carlo run', async () => {
    await fill();
    const before = runs;
    const at5 = text('koopbudget-challenger');
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(text('hypotheek-jaren')).toBe('1 jaar');
    expect(text('koopbudget-challenger')).not.toBe(at5);
    expect(screen.queryByTestId('koopbudget-challenger-box3')).toBeNull(); // end 2028: forfait
    fireEvent.change(slider(), { target: { value: '12' } });
    expect(text('hypotheek-jaren')).toBe('12 jaar');
    expect(screen.queryByTestId('mc-running')).toBeNull();
    expect(runs).toBe(before);
  });

  it('follows the challenger and the unit toggle', async () => {
    await fill();
    const name = () => screen.getByTestId('koopbudget-challenger').querySelector('.eyebrow')!.textContent;
    expect(name()).toBe('Aandelen');
    fireEvent.change(screen.getByLabelText('Uitdager'), { target: { value: 'mix' } });
    expect(name()).toMatch(/^Mix/);
    expect(text('koopbudget-difference')).toMatch(/met mix|Met mix/);
    const real = Number(text('koopbudget-challenger-pot').replace(/[^\d]/g, ''));
    fireEvent.click(screen.getByLabelText(/Nominaal/));
    const nominal = Number(text('koopbudget-challenger-pot').replace(/[^\d]/g, ''));
    expect(nominal).toBeGreaterThan(real);
  });
});

describe('cockpit', () => {
  const fill = (debt = '30.000', income?: string) => {
    fireEvent.change(screen.getByLabelText(/Huidige studieschuld/), { target: { value: debt } });
    fireEvent.change(screen.getByLabelText(/Start terugbetaalfase/), { target: { value: '2027-01' } });
    fireEvent.change(screen.getByLabelText(/Maandelijks surplus/), { target: { value: '200' } });
    if (income) fireEvent.change(screen.getByLabelText(/Bruto jaarinkomen/), { target: { value: income } });
  };
  const text = (id: string) => screen.getByTestId(id).textContent!.replace(/\s/g, ' ');
  const drawer = () => document.getElementById('invoer-drawer')!;

  it('opens with the input drawer and no lenses until the inputs give a result', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} />);
    expect(drawer().hidden).toBe(false);
    expect(screen.queryByRole('tab')).toBeNull();
    fill();
    expect(screen.getAllByRole('tab').map((t) => t.textContent!.replace(/^\W+/u, ''))).toEqual([
      'Schuld',
      'Vermogen',
      'Vrijgekomen geld',
      'Huis',
      'Kansen',
      'Details',
    ]);
    expect(screen.getByRole('tab', { name: 'Schuld' }).getAttribute('aria-selected')).toBe('true');
  });

  it('starts with the drawer closed when the saved inputs already give a result, and toggles it from the rail', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} initialDraft={{ ...EMPTY_DRAFT, debt: '30000', repaymentStart: '2027-01', surplus: '200' }} />);
    expect(drawer().hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Invoer' }));
    expect(drawer().hidden).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Invoer sluiten' }));
    expect(drawer().hidden).toBe(true);
  });

  it('the "aanpassen" link opens the drawer', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} initialDraft={{ ...EMPTY_DRAFT, debt: '30000', repaymentStart: '2027-01', surplus: '200' }} />);
    fireEvent.click(within(screen.getByTestId('input-summary')).getByRole('link', { name: 'aanpassen' }));
    expect(drawer().hidden).toBe(false);
  });

  it('shows one lens at a time', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} />);
    fill();
    const panel = (key: string) => document.getElementById(`lens-${key}`)!;
    expect(panel('schuld').hidden).toBe(false);
    expect(panel('vermogen').hidden).toBe(true);
    showLens('Vermogen');
    expect(panel('schuld').hidden).toBe(true);
    expect(panel('vermogen').hidden).toBe(false);
    expect(screen.getByRole('img', { name: /Je pot per jaar/ })).toBeTruthy();
  });

  it('says the debt is paid off, with the KPIs, when nothing is forgiven', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} />);
    fill();
    expect(text('debt-headline')).toMatch(/los je je schuld vóór het einde van 2061 helemaal af/);
    expect(text('kpi-schuld')).toBe('€ 30.000');
    expect(text('kpi-kwijtgescholden')).toBe('€ 0');
    expect(Number(text('kpi-schuldvrij'))).toBeLessThan(2061);
  });

  it('leads with the kwijtschelding when draagkracht keeps the debt from being paid off', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} />);
    fill('60.000', '30.000');
    expect(text('debt-headline')).toMatch(
      /^In dit rekenvoorbeeld los je je schuld niet helemaal af: na 2061 scheldt DUO ongeveer € [\d.]+ kwijt\. Wat je extra aflost, gaat deels af van geld dat je anders nooit had hoeven betalen\./,
    );
    expect(screen.getByTestId('kpi-kwijtgescholden').closest('.kpi')!.className).toMatch(/forgiven/);
  });

  it('the what-if surplus slider writes into the form', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} />);
    fill();
    fireEvent.change(screen.getByLabelText('Surplus per maand'), { target: { value: '500' } });
    expect((screen.getByLabelText(/Maandelijks surplus/) as HTMLInputElement).value).toBe('500');
    expect(text('input-summary')).toMatch(/€ 500 per maand over/);
  });

  it('offers the Monte Carlo verdict from the headline, opening the Kansen lens', async () => {
    const worker = (): WorkerLike => {
      const w: WorkerLike = {
        onmessage: null,
        postMessage(message: WorkerRequest) {
          const { response } = handleRequest(message);
          setTimeout(() => w.onmessage?.({ data: response } as MessageEvent<WorkerResponse>), 0);
        },
        terminate() {},
      };
      return w;
    };
    const client = createMonteCarloClient(worker, 2);
    render(<App today={ym(2027, 1)} monteCarlo={{ run: (input) => client.run({ ...input, n: 40 }), dispose: client.dispose }} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Bekijk het oordeel over 5.000 toekomsten →' }));
    expect(document.getElementById('lens-kansen')!.hidden).toBe(false);
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());
    expect(screen.getByTestId('verdict').closest('[role="tabpanel"]')?.id).toBe('lens-kansen');
  });

  it('without workers there is no link to the verdict', () => {
    render(<App today={ym(2027, 1)} monteCarlo={null} />);
    fill();
    expect(screen.queryByRole('button', { name: /Bekijk het oordeel/ })).toBeNull();
  });
});
