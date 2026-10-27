import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SIZE_BUCKETS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

@Component({
  selector: 'app-size-card',
  imports: [FormsModule],
  templateUrl: './size-card.html',
  styleUrl: './size-card.css',
})
export class SizeCardComponent {
  private draftService = inject(EventDraftService);

  readonly sizeBuckets = SIZE_BUCKETS;
  selectedSize = signal<string | null>(this.draftService.snapshot.size);
  exactGuestCount = '';

  selectSize(label: string): void {
    this.selectedSize.set(label);
    this.draftService.setSize(label);
  }
}
