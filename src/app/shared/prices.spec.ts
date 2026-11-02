import { PRICES, priceLines } from './prices';

describe('priceLines', () => {
  it('writes a range, an open-ended price and a note the way the prompt reads them', () => {
    const lines = priceLines([
      { item: 'Beer', low: 1.5, high: 3, unit: 'a can' },
      { item: 'Live band', low: 1000, high: null, unit: 'for an event' },
      { item: 'Bartender', low: 40, high: 75, unit: 'an hour', note: 'usually a 3 hour minimum' },
    ]);
    expect(lines).toBe(
      '- Beer: $1.50-3 a can.\n' +
        '- Live band: $1,000 and up for an event.\n' +
        '- Bartender: $40-75 an hour (usually a 3 hour minimum).',
    );
  });

  it('has a sensible range for every price', () => {
    for (const { item, low, high } of PRICES) {
      expect(low, item).toBeGreaterThan(0);
      if (high !== null) expect(high, item).toBeGreaterThan(low);
    }
  });
});
