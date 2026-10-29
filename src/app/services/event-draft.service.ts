import { Injectable, inject, signal } from '@angular/core';
import { getSizeBucket } from './decision-tree';
import { EventsService } from './events.service';
import { NOTES_MAX, applyTool, type Plan } from '../shared/plan';

// The plan the step-by-step wizard is editing. Each choice is saved to the event's row straight away,
// so the assistant in Mission Control sees it and the plan survives a reload or another device.
@Injectable({ providedIn: 'root' })
export class EventDraftService {
  private eventsService = inject(EventsService);

  private eventId: string | null = null;
  private plan = signal<Plan | null>(null);
  private saving: Promise<unknown> = Promise.resolve();

  readonly snapshot$ = this.plan.asReadonly();
  readonly saveError = signal('');

  // Only read after load() has resolved; the wizard doesn't show its cards before then
  get snapshot(): Plan {
    return this.plan()!;
  }

  // Throws if the event can't be loaded; returns false if it doesn't exist or isn't the user's
  async load(eventId: string): Promise<boolean> {
    this.eventId = eventId;
    this.plan.set(null);
    this.saveError.set('');
    const event = await this.eventsService.get(eventId);
    if (event) this.plan.set(event.plan);
    return event !== null;
  }

  // Guest numbers that don't fit the chosen bucket are dropped, so the plan doesn't contradict itself
  setSize(label: string): void {
    this.update(plan => {
      const fits = plan.guestCount !== null && getSizeBucket(plan.guestCount)?.label === label;
      return fits ? { ...plan, size: label } : { ...plan, size: label, guestCount: null, guests: undefined };
    });
  }

  // A hard head count. Goes through set_basics so the size bucket is derived the same way the
  // assistant's changes are. Returns an error message for an invalid number.
  setExactGuests(count: number): string | null {
    const current = this.plan();
    if (!current) return null;
    const result = applyTool(current, 'set_basics', { guests: { exact: count } });
    if (!result.ok) return 'Enter a whole number of guests, 1 or more.';
    this.update(() => result.plan);
    return null;
  }

  // Returns an error message for a name that isn't allowed, or null
  setName(name: string): string | null {
    const current = this.plan();
    if (!current) return null;
    const result = applyTool(current, 'set_basics', { name });
    if (!result.ok) return result.error;
    this.update(() => result.plan);
    return null;
  }

  setPlaces(ids: string[]): void {
    this.update(plan => ({ ...plan, places: ids }));
  }

  setActivities(ids: string[]): void {
    this.update(plan => ({ ...plan, activities: ids }));
  }

  // Picked by the user, so it's confirmed and the assistant won't ask about it
  setFormality(level: string): void {
    this.update(plan => ({ ...plan, formality: { level, confirmed: true } }));
  }

  setNotes(text: string): void {
    const notes = text.trim().slice(0, NOTES_MAX) || null;
    if (notes === (this.plan()?.notes ?? null)) return;
    this.update(plan => ({ ...plan, notes }));
  }

  // On logout. Also removes the localStorage draft the wizard kept before it saved to the database.
  clear(): void {
    this.eventId = null;
    this.plan.set(null);
    this.saveError.set('');
    try {
      localStorage.removeItem('planit_event_draft');
    } catch {}
  }

  private update(change: (plan: Plan) => Plan): void {
    const current = this.plan();
    const eventId = this.eventId;
    if (!current || !eventId) return;
    const next = change(current);
    this.plan.set(next);
    // Saves run one after another, so a slow earlier save can't overwrite a later one
    this.saving = this.saving.then(async () => {
      try {
        await this.eventsService.savePlan(eventId, next);
        this.saveError.set('');
      } catch {
        this.saveError.set("Couldn't save your last change. Check your connection and try again.");
      }
    });
  }
}
