// The rough US price sheet the assistant starts its estimates from. It can't search or look up
// prices, so these keep its guesses from drifting. Prices are before tax and tip; a big city runs
// higher and a small town lower. Edit freely: the prompt is built from this list.
// Pure TypeScript, so api/agent.ts can use it too.

export interface Price {
  item: string;
  low: number;
  high: number | null; // null = "and up"
  unit: string; // e.g. "a pie", "a person", "an hour"
  note?: string;
}

export const PRICES: Price[] = [
  { item: 'Large pizza', low: 15, high: 25, unit: 'a pie', note: 'plan 2 to 3 slices per adult, 8 slices a pie, so pizza for 15 is about 5 pies, $75-125' },
  { item: 'Takeout or delivery', low: 15, high: 25, unit: 'a person' },
  { item: 'Drop-off catering', low: 20, high: 40, unit: 'a person' },
  { item: 'Served catering', low: 40, high: 100, unit: 'a person' },
  { item: 'Bakery cake', low: 40, high: 80, unit: 'for 10 to 20 servings', note: 'custom or tiered cakes cost more' },
  { item: 'Beer', low: 1.5, high: 3, unit: 'a can' },
  { item: 'Wine', low: 12, high: 25, unit: 'a bottle' },
  { item: 'Cocktails made at home', low: 3, high: 5, unit: 'a drink' },
  { item: 'Bartender', low: 40, high: 75, unit: 'an hour', note: 'usually with a 3 to 4 hour minimum' },
  { item: 'DJ', low: 300, high: 800, unit: 'for an evening' },
  { item: 'Live band', low: 1000, high: null, unit: 'for an event' },
  { item: 'Paper plates, cups and napkins', low: 15, high: 30, unit: 'for 20 people' },
  { item: 'Decorations for a home party', low: 20, high: 60, unit: 'for the party' },
  { item: 'Escape room', low: 30, high: 45, unit: 'a person' },
  { item: 'Karaoke room', low: 30, high: 80, unit: 'an hour' },
];

const dollars = (amount: number) => `$${Number.isInteger(amount) ? amount.toLocaleString('en-US') : amount.toFixed(2)}`;

// "Large pizza: $15-25 a pie (plan 2 to 3 slices…)", one line per price, for the prompt
export function priceLines(prices: Price[] = PRICES): string {
  return prices
    .map(({ item, low, high, unit, note }) => {
      const range = high === null ? `${dollars(low)} and up` : `${dollars(low)}-${dollars(high).slice(1)}`;
      return `- ${item}: ${range} ${unit}${note ? ` (${note})` : ''}.`;
    })
    .join('\n');
}
