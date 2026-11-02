// Events the host said "Not yet" to (or reopened), so the dashboard doesn't ask to wrap them up
// again. A per-browser convenience in localStorage; losing it only means being asked once more.
const KEY = 'planit_wrap_up_dismissed';

export function wrapUpDismissed(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function dismissWrapUp(eventId: string): void {
  const ids = wrapUpDismissed();
  if (ids.includes(eventId)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids, eventId]));
  } catch {}
}
