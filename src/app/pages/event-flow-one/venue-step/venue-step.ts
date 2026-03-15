import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLACE_OPTIONS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

@Component({
  selector: 'app-venue-step',
  imports: [RouterLink],
  templateUrl: './venue-step.html',
  styleUrl: './venue-step.css',
})
export class VenueStepComponent {
  private draftService = inject(EventDraftService);

  readonly placeOptions = PLACE_OPTIONS;

  private expandedIds = signal<Set<string>>(new Set());
  private selectedIds  = signal<Set<string>>(
    new Set(this.draftService.snapshot.places)
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
    this.draftService.setPlaces([...next]);
  }
}
