import { Component, computed, inject, signal } from '@angular/core';
import { ACTIVITY_OPTIONS, OCCASIONS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

const ACTIVITY_LABELS = new Map(
  ACTIVITY_OPTIONS.flatMap(category => category.children ?? []).map(option => [option.id, option.label]),
);

@Component({
  selector: 'app-activities-card',
  templateUrl: './activities-card.html',
  styleUrl: './activities-card.css',
})
export class ActivitiesCardComponent {
  private draftService = inject(EventDraftService);

  readonly activityOptions = ACTIVITY_OPTIONS;
  readonly occasions = OCCASIONS;
  private selectedActivityIds = signal<Set<string>>(new Set(this.draftService.snapshot.activities));
  occasionId = signal<string | null>(this.draftService.snapshot.occasion ?? null);
  private details = signal<Record<string, string>>(this.draftService.snapshot.activityDetails ?? {});

  // The occasion's suggested activities, as chips above the full list
  ideas = computed(() =>
    (OCCASIONS.find(occasion => occasion.id === this.occasionId())?.ideas ?? []).map(id => ({
      id,
      label: ACTIVITY_LABELS.get(id) ?? id,
    })),
  );

  isActivitySelected(id: string): boolean { return this.selectedActivityIds().has(id); }

  toggleActivitySelect(id: string): void {
    const next = new Set(this.selectedActivityIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedActivityIds.set(next);
    this.details.update(details =>
      Object.fromEntries(Object.entries(details).filter(([key]) => next.has(key.split('/')[0]))),
    );
    this.draftService.setActivities([...next]);
  }

  toggleOccasion(id: string): void {
    const next = this.occasionId() === id ? null : id;
    this.occasionId.set(next);
    this.draftService.setOccasion(next);
  }

  detail(activityId: string, followUpId: string): string | undefined {
    return this.details()[`${activityId}/${followUpId}`];
  }

  // Clicking the chosen answer again clears it
  toggleDetail(activityId: string, followUpId: string, choiceId: string): void {
    const key = `${activityId}/${followUpId}`;
    const choice = this.details()[key] === choiceId ? null : choiceId;
    this.details.update(details => {
      const next = { ...details };
      if (choice === null) delete next[key];
      else next[key] = choice;
      return next;
    });
    this.draftService.setActivityDetail(key, choice);
  }
}
