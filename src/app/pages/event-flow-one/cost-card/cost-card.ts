import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BUDGET_BUCKETS } from '../../../services/decision-tree';
import { EventDraftService } from '../../../services/event-draft.service';

// Laid out like the size card: buckets, or a hard number. Hosts who'd rather add up line items
// are pointed to Mission Control's Budget tab.
@Component({
  selector: 'app-cost-card',
  imports: [FormsModule, RouterLink],
  templateUrl: './cost-card.html',
  styleUrls: ['../size-card/size-card.css', './cost-card.css'],
})
export class CostCardComponent {
  private draftService = inject(EventDraftService);

  eventId = input.required<string>();

  readonly budgetBuckets = BUDGET_BUCKETS;
  selectedBudget = signal<string | null>(this.draftService.snapshot.budgetSize ?? null);
  exactTotal: number | null = this.draftService.snapshot.budgetTotal;
  exactError = signal('');
  bottomUp = signal(false);

  selectBudget(label: string): void {
    this.selectedBudget.set(label);
    this.draftService.setBudgetSize(label);
    // A bucket that doesn't fit the hard number clears it from the plan, so clear the box too
    if (this.draftService.snapshot.budgetTotal === null) this.exactTotal = null;
  }

  // Saved when the box loses focus or on Enter, not on every keystroke. An empty box changes nothing.
  saveExactTotal(): void {
    if (this.exactTotal === null) {
      this.exactError.set('');
      return;
    }
    const error = this.draftService.setBudgetTotal(this.exactTotal);
    this.exactError.set(error ?? '');
    if (!error) this.selectedBudget.set(this.draftService.snapshot.budgetSize ?? null);
  }
}
