import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SIZE_BUCKETS, PLACE_OPTIONS, ACTIVITY_OPTIONS } from '../../services/decision-tree';
import { EventDraftService } from '../../services/event-draft.service';

interface Card {
  id: 'size' | 'place' | 'activities' | 'cost' | 'extras';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-event-flow-one',
  imports: [FormsModule],
  templateUrl: './event-flow-one.html',
  styleUrl: './event-flow-one.css',
})
export class EventFlowOneComponent {
  private draftService = inject(EventDraftService);

  activeCardIndex = -1;

  cards: Card[] = [
    { id: 'size',       label: 'SIZE',       icon: '👥' },
    { id: 'place',      label: 'PLACE',      icon: '🏠' },
    { id: 'activities', label: 'ACTIVITIES', icon: '🎲' },
    { id: 'cost',       label: 'COST',       icon: '💰' },
    { id: 'extras',     label: 'EXTRAS',     icon: '💬' },
  ];

  // ── Size ─────────────────────────────────────────────────────
  readonly sizeBuckets = SIZE_BUCKETS;
  selectedSize = signal<string | null>(this.draftService.snapshot.size);
  exactGuestCount = '';

  selectSize(label: string): void {
    this.selectedSize.set(label);
    this.draftService.setSize(label);
  }

  // ── Place ─────────────────────────────────────────────────────
  readonly placeOptions = PLACE_OPTIONS;
  private expandedPlaceIds = signal<Set<string>>(new Set());
  private selectedPlaceIds = signal<Set<string>>(new Set(this.draftService.snapshot.places));
  specificVenue = '';

  isPlaceExpanded(id: string): boolean { return this.expandedPlaceIds().has(id); }
  isPlaceSelected(id: string): boolean { return this.selectedPlaceIds().has(id); }

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

  // ── Activities ────────────────────────────────────────────────
  readonly activityOptions = ACTIVITY_OPTIONS;
  private selectedActivityIds = signal<Set<string>>(new Set(this.draftService.snapshot.activities));

  isActivitySelected(id: string): boolean { return this.selectedActivityIds().has(id); }

  toggleActivitySelect(id: string): void {
    const next = new Set(this.selectedActivityIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedActivityIds.set(next);
    this.draftService.setActivities([...next]);
  }

  // ── Card layout ───────────────────────────────────────────────
  setActiveCard(index: number): void {
    this.activeCardIndex = this.activeCardIndex === index ? -1 : index;
  }

  getOverlayDistance(index: number): number {
    if (this.activeCardIndex === -1) return 0;
    return Math.abs(index - this.activeCardIndex);
  }
}
