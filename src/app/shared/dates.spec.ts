import { addDays, weekday, weeksCovering } from './dates';

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});

describe('weeksCovering', () => {
  it('returns whole Monday-to-Sunday weeks', () => {
    expect(weekday('2026-11-02')).toBe(0); // a Monday
    // Wed Oct 21 to Sat Oct 31: the weeks of Oct 19 and Oct 26
    const weeks = weeksCovering('2026-10-21', '2026-10-31');
    expect(weeks.map(w => w[0])).toEqual(['2026-10-19', '2026-10-26']);
    expect(weeks[1][6]).toBe('2026-11-01');
  });
});
