import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SIZE_BUCKETS, SizeBucket } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

@Component({
  selector: 'app-people-step',
  imports: [RouterLink],
  templateUrl: './people-step.html',
  styleUrl: './people-step.css',
})
export class PeopleStepComponent {
  private draftService = inject(EventDraftService);

  readonly buckets = SIZE_BUCKETS;
  selected = signal<SizeBucket | null>(null);

  constructor() {
    const saved = this.draftService.snapshot.size;
    if (saved) {
      const bucket = SIZE_BUCKETS.find(b => b.label === saved);
      if (bucket) this.selected.set(bucket);
    }
  }

  select(bucket: SizeBucket): void {
    this.selected.set(bucket);
    this.draftService.setSize(bucket.label);
  }
}
