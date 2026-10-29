import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FORMALITY_LEVELS, PLACE_OPTIONS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

@Component({
  selector: 'app-place-card',
  imports: [FormsModule],
  templateUrl: './place-card.html',
  styleUrl: './place-card.css',
})
export class PlaceCardComponent {
  private draftService = inject(EventDraftService);

  readonly placeOptions = PLACE_OPTIONS;
  readonly formalityLevels = FORMALITY_LEVELS;
  selectedFormality = signal<string | null>(this.draftService.snapshot.formality?.level ?? null);
  private expandedPlaceIds = signal<Set<string>>(new Set());
  private selectedPlaceIds = signal<Set<string>>(new Set(this.draftService.snapshot.places));
  specificVenue = '';

  isPlaceExpanded(id: string): boolean { return this.expandedPlaceIds().has(id); }
  isPlaceSelected(id: string): boolean { return this.selectedPlaceIds().has(id); }

  selectFormality(id: string): void {
    this.selectedFormality.set(id);
    this.draftService.setFormality(id);
  }

  togglePlaceExpand(id: string): void {
    const next = new Set(this.expandedPlaceIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expandedPlaceIds.set(next);
  }

  togglePlaceSelect(id: string): void {
    const next = new Set(this.selectedPlaceIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedPlaceIds.set(next);
    this.draftService.setPlaces([...next]);
  }
}
