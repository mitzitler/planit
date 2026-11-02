import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventPlanStore } from '../event-plan.store';
import { EventsService } from '../../../services/events.service';
import { calendarEntries, icsFileName, toIcs } from '../../../shared/ics';
import { formatDate, formatTime } from '../../../shared/format';
import { addDays, localToday, weeksCovering } from '../../../shared/dates';
import type { ScheduleItem } from '../../../shared/plan';

interface Entry {
  item: ScheduleItem;
  index: number; // into plan.schedule, for checking off and removing
}

interface Cell {
  date: string;
  label: string; // "31", or "Nov 1" on the first of a month and the first cell
  entries: Entry[];
  isEvent: boolean;
  isToday: boolean;
  isMonthStart: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The event day's schedule beside a week-by-week calendar of the host's to-dos leading up to it.
// Both come from plan.schedule; an item's date decides where it shows (event-day items show in both).
// Edits go through the same tools as the assistant's (EventPlanStore.apply).
@Component({
  selector: 'app-calendar-tool',
  imports: [FormsModule],
  templateUrl: './calendar-tool.html',
  styleUrl: './calendar-tool.css',
})
export class CalendarToolComponent {
  private store = inject(EventPlanStore);
  private eventsService = inject(EventsService);

  plan = this.store.plan;
  locked = this.store.agentBusy;
  error = signal('');
  weekdays = WEEKDAYS;

  eventDate = signal('');
  // Add form; an empty date means the event date, an empty time an all-day to-do
  date = signal('');
  time = signal('');
  title = signal('');

  private entries = computed<Entry[]>(() => (this.plan()?.schedule ?? []).map((item, index) => ({ item, index })));

  // The day shown in full in the left panel: the one clicked in the calendar, else the event day
  selected = signal<string | null>(null);
  day = computed(() => this.selected() ?? this.plan()?.date ?? null);
  dayEntries = computed(() => this.entries().filter(e => e.item.date === this.day()));

  // From at least a week before the event (or the earliest to-do) through the event week
  // (or the latest item, e.g. thank-you notes the day after)
  weeks = computed<Cell[][]>(() => {
    const eventDate = this.plan()?.date ?? null;
    const dates = this.entries().map(e => e.item.date);
    if (eventDate) dates.push(addDays(eventDate, -7), eventDate);
    if (!dates.length) return [];
    dates.sort();

    const today = localToday();
    return weeksCovering(dates[0], dates.at(-1)!).map((week, w) =>
      week.map((date, d) => ({
        date,
        label: (w === 0 && d === 0) || date.endsWith('-01') ? this.monthDay(date) : String(Number(date.slice(8))),
        entries: this.entries().filter(e => e.item.date === date),
        isEvent: date === eventDate,
        isToday: date === today,
        isMonthStart: date.endsWith('-01'),
      })),
    );
  });

  // Add to your calendar: a one-time download, or a subscribed feed (api/calendar.ts) that stays updated
  private timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  canExport = computed(() => !!this.plan()?.date || !!this.plan()?.schedule.length);
  linkBusy = signal(false);
  copied = signal(false);
  feed = computed(() => {
    const token = this.store.calendarToken();
    if (!token) return null;
    const https = `${location.origin}/api/calendar?token=${token}&tz=${encodeURIComponent(this.timeZone)}`;
    const webcal = https.replace(/^https?:/, 'webcal:');
    return { https, apple: webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
  });

  // The grid shows WEEKS_SHOWN weeks at a time; the arrows move it a week. Until they're used it
  // starts at this week, else at the week of the next unfinished to-do, else ends at the event's week.
  readonly WEEKS_SHOWN = 5;
  private weekStart = signal<number | null>(null);
  firstWeek = computed(() => {
    const weeks = this.weeks();
    const last = Math.max(0, weeks.length - this.WEEKS_SHOWN);
    const todayWeek = weeks.findIndex(week => week.some(cell => cell.isToday));
    const today = localToday();
    const nextWeek = weeks.findIndex(week =>
      week.some(cell => cell.date >= today && cell.entries.some(e => !e.item.done)),
    );
    const start = this.weekStart() ?? (todayWeek >= 0 ? todayWeek : nextWeek >= 0 ? nextWeek : last);
    return Math.min(Math.max(start, 0), last);
  });
  // The first cell shown carries its month, like the first of each month
  shownWeeks = computed(() =>
    this.weeks()
      .slice(this.firstWeek(), this.firstWeek() + this.WEEKS_SHOWN)
      .map((week, w) => (w === 0 ? [{ ...week[0], label: this.monthDay(week[0].date) }, ...week.slice(1)] : week)),
  );
  hasEarlier = computed(() => this.firstWeek() > 0);
  hasLater = computed(() => this.firstWeek() + this.WEEKS_SHOWN < this.weeks().length);
  // Items in the weeks out of view, shown on the arrows
  itemsAbove = computed(() => this.countItems(this.weeks().slice(0, this.firstWeek())));
  itemsBelow = computed(() => this.countItems(this.weeks().slice(this.firstWeek() + this.WEEKS_SHOWN)));

  private countItems(weeks: Cell[][]): number {
    return weeks.reduce((sum, week) => sum + week.reduce((n, cell) => n + cell.entries.length, 0), 0);
  }

  moveWeeks(by: number) {
    this.weekStart.set(this.firstWeek() + by);
  }

  // Grid cells show CELL_LIMIT items, so one busy day doesn't stretch every week; clicking opens the day
  readonly CELL_LIMIT = 3;

  // Opens a day in the left panel (null or the event date goes back to the event day), and points
  // the add form at it
  select(date: string | null) {
    const other = date && date !== this.plan()?.date ? date : null;
    this.selected.set(other);
    this.date.set(other ?? '');
  }

  formatDate = formatDate;
  formatTime = formatTime;

  download() {
    const plan = this.plan();
    if (!plan) return;
    const ics = toIcs(calendarEntries(plan, this.store.eventId), {
      calendarName: `Planit: ${plan.name ?? 'Untitled event'}`,
      timeZone: this.timeZone,
      now: new Date(),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = icsFileName(plan.name);
    link.click();
    URL.revokeObjectURL(url);
  }

  // Makes the link, or resets it (old subscriptions stop updating); null turns it off
  async setLink(token: string | null) {
    this.linkBusy.set(true);
    try {
      await this.eventsService.setCalendarToken(this.store.eventId, token);
      this.store.calendarToken.set(token);
      this.error.set('');
    } catch {
      this.error.set("Couldn't update the calendar link. Try again.");
    } finally {
      this.linkBusy.set(false);
    }
  }

  newLink() {
    return this.setLink(crypto.randomUUID());
  }

  async copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set("Couldn't copy the link. Select it and copy it instead.");
    }
  }

  async setEventDate() {
    if (!this.eventDate()) return this.error.set('Pick a date.');
    const error = await this.store.apply('set_basics', { date: this.eventDate() });
    this.error.set(error ?? '');
    if (!error) this.eventDate.set('');
  }

  async add() {
    const title = this.title().trim();
    if (!this.date() && !this.plan()?.date) return this.error.set('Pick a date, or set the event date first.');
    if (!title) return this.error.set('Enter what happens or what to do.');

    const input = { title, ...(this.date() ? { date: this.date() } : {}), ...(this.time() ? { time: this.time() } : {}) };
    const error = await this.store.apply('add_schedule_item', input);
    this.error.set(error ?? '');
    if (!error) {
      this.time.set('');
      this.title.set('');
    }
  }

  // The day panel's own add box: a to-do on the day it shows
  dayTitle = signal('');

  async addToDay() {
    const title = this.dayTitle().trim();
    const date = this.day();
    if (!date || !title) return;
    const error = await this.store.apply('add_schedule_item', { title, date });
    this.error.set(error ?? '');
    if (!error) this.dayTitle.set('');
  }

  async check(entry: Entry, done: boolean) {
    this.error.set((await this.store.apply('check_schedule_item', { index: entry.index, done })) ?? '');
  }

  async remove(index: number) {
    this.error.set((await this.store.apply('remove_schedule_item', { index })) ?? '');
  }

  private monthDay(date: string): string {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
}
