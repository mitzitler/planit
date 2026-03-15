import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ACTIVITY_OPTIONS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

@Component({
  selector: 'app-activities-step',
  imports: [RouterLink],
  templateUrl: './activities-step.html',
  styleUrl: './activities-step.css',
})
export class ActivitiesStepComponent {
  private draftService = inject(EventDraftService);

  readonly activityOptions = ACTIVITY_OPTIONS;

  private expandedIds = signal<Set<string>>(new Set());
  private selectedIds  = signal<Set<string>>(
    new Set(this.draftService.snapshot.activities)
  );

  isExpanded(id: string): boolean { return this.expandedIds().has(id); }
  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  toggleExpand(id: string): void {
    const next = new Set(this.expandedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expandedIds.set(next);
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
    this.draftService.setActivities([...next]);
  }
}
