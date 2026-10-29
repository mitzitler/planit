import { Component, inject, signal } from '@angular/core';
import { ACTIVITY_OPTIONS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

@Component({
  selector: 'app-activities-card',
  templateUrl: './activities-card.html',
  styleUrl: './activities-card.css',
})
export class ActivitiesCardComponent {
  private draftService = inject(EventDraftService);

  readonly activityOptions = ACTIVITY_OPTIONS;
  private selectedActivityIds = signal<Set<string>>(new Set(this.draftService.snapshot.activities));

  isActivitySelected(id: string): boolean { return this.selectedActivityIds().has(id); }

  toggleActivitySelect(id: string): void {
    const next = new Set(this.selectedActivityIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedActivityIds.set(next);
    this.draftService.setActivities([...next]);
  }
}
