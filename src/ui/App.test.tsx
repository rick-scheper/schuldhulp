// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getAllByRole('row')).toHaveLength(1 + 8);
  });
});
