import { Component } from '@angular/core';
import { SizeCardComponent } from './size-card/size-card';
import { PlaceCardComponent } from './place-card/place-card';
import { ActivitiesCardComponent } from './activities-card/activities-card';

interface Card {
  id: 'size' | 'place' | 'activities' | 'cost' | 'extras';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-event-flow-one',
  imports: [SizeCardComponent, PlaceCardComponent, ActivitiesCardComponent],
  templateUrl: './event-flow-one.html',
  styleUrl: './event-flow-one.css',
})
export class EventFlowOneComponent {
  activeCardIndex = -1;

  cards: Card[] = [
    { id: 'size',       label: 'SIZE',       icon: '👥' },
    { id: 'place',      label: 'PLACE',      icon: '🏠' },
    { id: 'activities', label: 'ACTIVITIES', icon: '🎲' },
    { id: 'cost',       label: 'COST',       icon: '💰' },
    { id: 'extras',     label: 'EXTRAS',     icon: '💬' },
  ];

  // ── Card layout ───────────────────────────────────────────────
  setActiveCard(index: number): void {
    this.activeCardIndex = this.activeCardIndex === index ? -1 : index;
  }

  getOverlayDistance(index: number): number {
    if (this.activeCardIndex === -1) return 0;
    return Math.abs(index - this.activeCardIndex);
  }
}
