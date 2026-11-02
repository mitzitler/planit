import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventDraftService } from '../../services/event-draft.service';
import { PlanBarComponent } from '../../components/plan-bar/plan-bar';
import { SizeCardComponent } from './size-card/size-card';
import { PlaceCardComponent } from './place-card/place-card';
import { ActivitiesCardComponent } from './activities-card/activities-card';
import { NOTES_MAX } from '../../shared/plan';

interface Card {
  id: 'size' | 'place' | 'activities' | 'cost' | 'extras';
  label: string;
  icon: string; // file name in public/icons
}

@Component({
  selector: 'app-event-flow-one',
  imports: [RouterLink, PlanBarComponent, SizeCardComponent, PlaceCardComponent, ActivitiesCardComponent],
  templateUrl: './event-flow-one.html',
  styleUrl: './event-flow-one.css',
})
export class EventFlowOneComponent implements OnInit {
  private route = inject(ActivatedRoute);
  draftService = inject(EventDraftService);

  eventId = this.route.snapshot.paramMap.get('id')!;
  loaded = signal(false);
  renameError = signal('');
  notesMax = NOTES_MAX;
  loadError = signal('');
  activeCardIndex = -1;

  cards: Card[] = [
    { id: 'size',       label: 'SIZE',       icon: 'orbit-satellite' },
    { id: 'place',      label: 'PLACE',      icon: 'orbit-map'       },
    { id: 'activities', label: 'ACTIVITIES', icon: 'orbit-rocket'    },
    { id: 'cost',       label: 'COST',       icon: 'orbit-battery'   },
    { id: 'extras',     label: 'EXTRAS',     icon: 'orbit-cargo'     },
  ];

  // The cards read the plan when they open, so they're only shown once it has loaded
  async ngOnInit() {
    try {
      if (await this.draftService.load(this.eventId)) this.loaded.set(true);
      else this.loadError.set("This event doesn't exist, or it isn't yours.");
    } catch {
      this.loadError.set('Could not load this event. Refresh to try again.');
    }
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
