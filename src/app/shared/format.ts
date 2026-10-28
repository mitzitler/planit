// Display formatting for plan values, shared by the Plan card and the Mission Control tabs.

// "Sat, Nov 14, 2026". Dates are calendar days, so they're read as UTC to avoid shifting a day.
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// "7pm", "8:30pm", "12am", from 24-hour "HH:MM"
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

// "$60", or "$12.50" when there are cents
export function formatMoney(amount: number): string {
  const cents = Number.isInteger(amount) ? 0 : 2;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents,
    maximumFractionDigits: cents,
  });
}

// "$40–70" for a range, "$60" otherwise
export function formatRange(low: number, high: number): string {
  return low === high ? formatMoney(high) : `${formatMoney(low)}–${formatMoney(high).slice(1)}`;
}
