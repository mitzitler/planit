import { formatRange, formatTime } from './format';

describe('formatTime', () => {
  it('writes times the way people say them', () => {
    expect(formatTime('19:00')).toBe('7pm');
    expect(formatTime('20:30')).toBe('8:30pm');
    expect(formatTime('09:05')).toBe('9:05am');
    expect(formatTime('00:00')).toBe('12am');
    expect(formatTime('12:00')).toBe('12pm');
  });
});

describe('formatRange', () => {
  it('shows a range, or one amount when the ends match', () => {
    expect(formatRange(40, 70)).toBe('$40–70');
    expect(formatRange(60, 60)).toBe('$60');
    expect(formatRange(12.5, 1200)).toBe('$12.50–1,200');
  });
});
