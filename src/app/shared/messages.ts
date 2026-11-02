// The Communication tab's short messages and invite apps. Planit never sends anything: these fill
// in a starting point the host edits and sends from their own apps. Kept to the facts, with few
// adjectives, on purpose; anything personal is the host's to write.
import { formatTime } from './format';
import type { Ask, Plan } from './plan';

// "Saturday, November 14"
export function longDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// When guests should come: the first timed event-day item that mentions guests ("Guests arrive"),
// else the earliest timed one, or null. Setup items like "Abby arrives to help" come earlier.
export function startTime(plan: Plan): string | null {
  const timed = plan.schedule.filter(item => item.date === plan.date && item.time);
  const forGuests = timed.filter(item => /guest/i.test(item.title));
  const times = (forGuests.length ? forGuests : timed).map(item => item.time!);
  return times.sort()[0] ?? null;
}

const eventName = (plan: Plan) => plan.name ?? 'the party';

// "Hi! A reminder: Sam's 30th is Saturday, November 14 at 7pm. See you there!"
export function reminderMessage(plan: Plan): string {
  if (!plan.date) return `Hi! A reminder about ${eventName(plan)}. See you there!`;
  const time = startTime(plan);
  return `Hi! A reminder: ${eventName(plan)} is ${longDate(plan.date)}${time ? ` at ${formatTime(time)}` : ''}. See you there!`;
}

// The host fills in what changed
export function changeMessage(plan: Plan): string {
  return `Heads up: a change for ${eventName(plan)}. `;
}

// "Hi Abby! Could you help set up at 6:30pm for Sam's 30th? Thank you!"
export function askMessage(plan: Plan, ask: Ask): string {
  const day = ask.date && ask.date !== plan.date ? ` on ${longDate(ask.date)}` : '';
  const time = ask.time ? ` at ${formatTime(ask.time)}` : '';
  return `Hi ${ask.who}! Could you ${ask.what}${day}${time} for ${eventName(plan)}? Thank you!`;
}

export interface InviteApp {
  name: string;
  url: string;
}

const PARTIFUL: InviteApp = { name: 'Partiful', url: 'https://partiful.com' };
const APPLE: InviteApp = { name: 'Apple Invites', url: 'https://www.icloud.com/invites' };
const EVITE: InviteApp = { name: 'Evite', url: 'https://www.evite.com' };
const PAPERLESS: InviteApp = { name: 'Paperless Post', url: 'https://www.paperlesspost.com' };
const LUMA: InviteApp = { name: 'Luma', url: 'https://lu.ma' };
const PUNCHBOWL: InviteApp = { name: 'Punchbowl', url: 'https://www.punchbowl.com' };

// All six, the best fit first: card-like apps for dressier events, text-message ones for laid-back
// ones, and Luma first for big gatherings. Nothing is hidden, so it's only a nudge.
export function inviteApps(plan: Plan): InviteApp[] {
  const level = plan.formality?.level;
  const apps =
    level === 'formal' || level === 'dressy' ? [PAPERLESS, EVITE, APPLE, PUNCHBOWL, PARTIFUL, LUMA]
    : level === 'polished' ? [PAPERLESS, EVITE, PARTIFUL, APPLE, PUNCHBOWL, LUMA]
    : [PARTIFUL, APPLE, EVITE, PUNCHBOWL, PAPERLESS, LUMA];
  const big = plan.size === 'large' || plan.size === 'massive';
  return big ? [LUMA, ...apps.filter(app => app !== LUMA)] : apps;
}
