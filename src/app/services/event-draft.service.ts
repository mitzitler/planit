import { Injectable, signal } from '@angular/core';

export interface EventDraft {
  size:        string | null;  // SizeBucket label
  places:      string[];       // selected place IDs
  activities:  string[];       // selected activity IDs
}

const EMPTY_DRAFT: EventDraft = { size: null, places: [], activities: [] };
const STORAGE_KEY = 'planit_event_draft';

@Injectable({ providedIn: 'root' })
export class EventDraftService {
  private draft = signal<EventDraft>(this.load());

  readonly snapshot$ = this.draft.asReadonly();

  get snapshot(): EventDraft {
    return this.draft();
  }

  setSize(label: string): void {
    this.draft.update(d => ({ ...d, size: label }));
    this.persist();
  }

  setPlaces(ids: string[]): void {
    this.draft.update(d => ({ ...d, places: ids }));
    this.persist();
  }

  setActivities(ids: string[]): void {
    this.draft.update(d => ({ ...d, activities: ids }));
    this.persist();
  }

  clear(): void {
    this.draft.set({ ...EMPTY_DRAFT });
    localStorage.removeItem(STORAGE_KEY);
  }

  private load(): EventDraft {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...EMPTY_DRAFT, ...JSON.parse(stored) };
    } catch {}
    return { ...EMPTY_DRAFT };
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.draft()));
  }
}
