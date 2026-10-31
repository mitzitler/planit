// GET /api/calendar?token=<calendar_token>&tz=<IANA zone> — one event as a subscribed calendar feed.
//
// Calendar apps (Apple, Google, Outlook) fetch this on their own schedule, without a login, so the
// event's secret calendar_token is the only key. It's a random UUID the host makes, resets or turns
// off on the Calendar tab. The lookup uses the service-role key, since no user session exists to
// apply row-level security, and the feed holds only the name, the date and the schedule: never the
// budget, guests or notes. tz comes from the link the host copied, so it's checked before use.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from '@supabase/supabase-js';
import { calendarEntries, toIcs, validTimeZone } from '../src/app/shared/ics';
import { normalizePlan } from '../src/app/shared/plan';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

export async function GET(request: Request): Promise<Response> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return text(500, 'Server is missing Supabase config.');

  const params = new URL(request.url).searchParams;
  const token = params.get('token') ?? '';
  // The same answer for a malformed, reset or turned-off link, so tokens can't be probed
  if (!UUID.test(token)) return text(404, 'Calendar not found.');

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: event, error } = await admin
    .from('events')
    .select('id, plan')
    .eq('calendar_token', token)
    .maybeSingle();
  if (error) return text(500, 'Could not load the calendar.');
  if (!event) return text(404, 'Calendar not found.');

  const plan = normalizePlan(event.plan);
  const body = toIcs(calendarEntries(plan, event.id), {
    calendarName: `Planit: ${plan.name ?? 'Untitled event'}`,
    timeZone: validTimeZone(params.get('tz')),
    now: new Date(),
    feed: true,
  });
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="planit.ics"',
      'cache-control': 'no-store', // a plan change shows on the app's next fetch
    },
  });
}
