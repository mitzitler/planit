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
  exactGuestCount: number | null = this.draftService.snapshot.guests?.exact ?? null;
  exactError = signal('');

  selectSize(label: string): void {
    this.selectedSize.set(label);
    this.draftService.setSize(label);
    // A bucket that doesn't fit the hard number clears it from the plan, so clear the box too
    if (this.draftService.snapshot.guests?.exact === undefined) this.exactGuestCount = null;
  }

  // Saved when the box loses focus or on Enter, not on every keystroke. An empty box changes nothing.
  saveExactGuests(): void {
    if (this.exactGuestCount === null) {
      this.exactError.set('');
      return;
    }
    const error = this.draftService.setExactGuests(this.exactGuestCount);
    this.exactError.set(error ?? '');
    if (!error) this.selectedSize.set(this.draftService.snapshot.size);
  }
}
