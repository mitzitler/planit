import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventPlanStore } from '../event-plan.store';
import { formatDate, formatTime } from '../../../shared/format';
import type { ScheduleItem } from '../../../shared/plan';

interface Day {
  date: string;
  items: { item: ScheduleItem; index: number }[]; // index into plan.schedule, for removing
}

// The plan's schedule, grouped by day, with the event date and items set or removed by hand.
// Edits go through the same tools as the assistant's (EventPlanStore.apply).
@Component({
  selector: 'app-calendar-tool',
  imports: [FormsModule],
  templateUrl: './calendar-tool.html',
  styleUrl: './calendar-tool.css',
})
export class CalendarToolComponent {
  private store = inject(EventPlanStore);

  plan = this.store.plan;
  locked = this.store.agentBusy;
  error = signal('');

  eventDate = signal('');
  // Add form; an empty date means the event date
  date = signal('');
  time = signal('');
  title = signal('');

  // The schedule is kept sorted by date and time, so days come out in order
  days = computed<Day[]>(() => {
    const days: Day[] = [];
    (this.plan()?.schedule ?? []).forEach((item, index) => {
      let day = days.at(-1);
      if (day?.date !== item.date) {
        day = { date: item.date, items: [] };
        days.push(day);
      }
      day.items.push({ item, index });
    });
    return days;
  });

  formatDate = formatDate;
  formatTime = formatTime;

  async setEventDate() {
    if (!this.eventDate()) return this.error.set('Pick a date.');
    const error = await this.store.apply('set_basics', { date: this.eventDate() });
    this.error.set(error ?? '');
    if (!error) this.eventDate.set('');
  }

  async add() {
    const title = this.title().trim();
    if (!this.date() && !this.plan()?.date) return this.error.set('Pick a date, or set the event date first.');
    if (!this.time() || !title) return this.error.set('Enter a time and what happens.');

    const input = { time: this.time(), title, ...(this.date() ? { date: this.date() } : {}) };
    const error = await this.store.apply('add_schedule_item', input);
    this.error.set(error ?? '');
    if (!error) {
      this.time.set('');
      this.title.set('');
    }
  }

  async remove(index: number) {
    this.error.set((await this.store.apply('remove_schedule_item', { index })) ?? '');
  }
}
