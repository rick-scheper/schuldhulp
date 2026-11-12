// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { ym } from '../engine';
import { STORAGE_KEY } from './useSavedState';

const TODAY = ym(2027, 1);
const open = () => render(<App today={TODAY} monteCarlo={null} />);
const value = (label: RegExp) => (screen.getByLabelText(label) as HTMLInputElement).value;
const type = (label: RegExp, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
/** A page reload: unmount and mount again with the same storage and URL. */
const reload = () => {
  cleanup();
  open();
};
const setHash = (hash: string) => window.history.replaceState(null, '', `/${hash}`);
const banner = () => screen.queryByRole('region', { name: 'Gedeelde berekening' });

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('persistence (#31)', () => {
  it('restores the inputs after a reload', () => {
    open();
    type(/Huidige studieschuld/, '32000');
    type(/Maandelijks surplus/, '300');
    fireEvent.click(screen.getByLabelText(/Rente blijft gelijk/));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('v=1&schuld=32000&surplus=300&rentevast=1');
    reload();
    expect(value(/Huidige studieschuld/)).toBe('32000');
    expect(value(/Maandelijks surplus/)).toBe('300');
    expect((screen.getByLabelText(/Rente blijft gelijk/) as HTMLInputElement).checked).toBe(true);
  });

  it('"Opnieuw beginnen" clears the inputs and the saved set', () => {
    open();
    type(/Huidige studieschuld/, '32000');
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw beginnen' }));
    expect(value(/Huidige studieschuld/)).toBe('');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    reload();
    expect(value(/Huidige studieschuld/)).toBe('');
  });

  it('works without storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    open();
    type(/Huidige studieschuld/, '32000');
    expect(value(/Huidige studieschuld/)).toBe('32000');
  });

  it('survives a full or broken storage and garbage saved data', () => {
    localStorage.setItem(STORAGE_KEY, '%%%&&v=banaan&schuld=-1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    open();
    expect(value(/Huidige studieschuld/)).toBe('');
    type(/Huidige studieschuld/, '32000');
    expect(value(/Huidige studieschuld/)).toBe('32000');
  });

  it('does not treat a plain anchor as a share link', () => {
    localStorage.setItem(STORAGE_KEY, 'v=1&schuld=100');
    setHash('#invoer');
    open();
    expect(banner()).toBeNull();
    expect(value(/Huidige studieschuld/)).toBe('100');
  });
});

describe('share link (#31)', () => {
  it('copies a readable link with only the changed values, and warns that it holds amounts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    open();
    type(/Huidige studieschuld/, '32.000');
    type(/Maandelijks surplus/, '300');
    expect(screen.getByText(/Deze link bevat je bedragen/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deel deze berekening' }));
    expect(await screen.findByText('Link gekopieerd.')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/#v=1&schuld=32000&surplus=300');
    // The URL itself is not live-synced.
    expect(window.location.hash).toBe('');
  });

  it('shows the link to copy by hand when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    open();
    type(/Huidige studieschuld/, '500');
    fireEvent.click(screen.getByRole('button', { name: 'Deel deze berekening' }));
    expect(await screen.findByText('Kopieer deze link:')).toBeTruthy();
    expect(value(/Link naar deze berekening/)).toMatch(/#v=1&schuld=500$/);
  });

  it('adopts a link silently when nothing is saved, and clears the hash', () => {
    setHash('#v=1&schuld=500&surplus=50');
    open();
    expect(banner()).toBeNull();
    expect(value(/Huidige studieschuld/)).toBe('500');
    expect(window.location.hash).toBe('');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('v=1&schuld=500&surplus=50');
  });

  describe('with saved inputs: gedeelde berekening', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEY, 'v=1&schuld=100');
      setHash('#v=1&schuld=500');
    });

    it('shows the banner over the shared values, keeps the saved ones, and does not save edits', () => {
      open();
      expect(banner()!.textContent).toMatch(/Je bekijkt een gedeelde berekening/);
      expect(screen.queryByRole('button', { name: 'Opnieuw beginnen' })).toBeNull();
      expect(value(/Huidige studieschuld/)).toBe('500');
      type(/Maandelijks surplus/, '75');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('v=1&schuld=100');
      expect(window.location.hash).toBe('#v=1&schuld=500');
    });

    it('keeps the shared view on a refresh while the banner is up', () => {
      open();
      reload();
      expect(banner()).toBeTruthy();
      expect(value(/Huidige studieschuld/)).toBe('500');
    });

    it('"Terug naar mijn eigen" restores the saved inputs and clears the hash', () => {
      open();
      type(/Maandelijks surplus/, '75');
      fireEvent.click(screen.getByRole('button', { name: 'Terug naar mijn eigen' }));
      expect(banner()).toBeNull();
      expect(value(/Huidige studieschuld/)).toBe('100');
      expect(value(/Maandelijks surplus/)).toBe('');
      expect(window.location.hash).toBe('');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('v=1&schuld=100');
      reload();
      expect(banner()).toBeNull();
      expect(value(/Huidige studieschuld/)).toBe('100');
    });

    it('"Overnemen als mijn invoer" saves the shared view, with edits, and clears the hash', () => {
      open();
      type(/Maandelijks surplus/, '75');
      fireEvent.click(screen.getByRole('button', { name: 'Overnemen als mijn invoer' }));
      expect(banner()).toBeNull();
      expect(window.location.hash).toBe('');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('v=1&schuld=500&surplus=75');
      reload();
      expect(value(/Huidige studieschuld/)).toBe('500');
    });

    it('opens a link pasted into the same tab', () => {
      cleanup();
      window.history.replaceState(null, '', '/');
      open();
      expect(value(/Huidige studieschuld/)).toBe('100');
      setHash('#v=1&schuld=900');
      fireEvent(window, new HashChangeEvent('hashchange'));
      expect(banner()).toBeTruthy();
      expect(value(/Huidige studieschuld/)).toBe('900');
    });
  });

  it('falls back to defaults for unreadable values and says so', () => {
    setHash('#v=1&schuld=abc&surplus=300');
    open();
    expect(screen.getByRole('status').textContent).toMatch(/Sommige waarden uit de link konden niet worden gelezen/);
    expect(value(/Huidige studieschuld/)).toBe('');
    expect(value(/Maandelijks surplus/)).toBe('300');
    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    expect(screen.queryByText(/Sommige waarden/)).toBeNull();
  });
});
