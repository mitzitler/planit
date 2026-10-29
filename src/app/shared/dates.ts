// Calendar-day math on YYYY-MM-DD strings. Read as UTC so a day never shifts with the time zone.

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 0 for Monday through 6 for Sunday
export function weekday(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

// The Monday-to-Sunday weeks that cover first through last, each as 7 dates
export function weeksCovering(first: string, last: string): string[][] {
  const weeks: string[][] = [];
  for (let monday = addDays(first, -weekday(first)); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  }
  return weeks;
}

// Today in the viewer's time zone, as YYYY-MM-DD
export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
