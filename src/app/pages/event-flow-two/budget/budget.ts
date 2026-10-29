import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventPlanStore } from '../event-plan.store';
import { formatMoney, formatRange } from '../../../shared/format';
import { budgetRange } from '../../../shared/plan';

// The plan's budget: spend against the total, and line items added or removed by hand.
// Edits go through the same tools as the assistant's (EventPlanStore.apply).
@Component({
  selector: 'app-budget',
  imports: [FormsModule],
  templateUrl: './budget.html',
  styleUrl: './budget.css',
})
export class BudgetComponent {
  private store = inject(EventPlanStore);

  plan = this.store.plan;
  locked = this.store.agentBusy;
  error = signal('');

  // Add form; "upTo" turns the cost into a low–high estimate
  label = signal('');
  cost = signal<number | null>(null);
  upTo = signal<number | null>(null);
  total = signal<number | null>(null);

  range = computed(() => budgetRange(this.plan()?.budget ?? []));
  over = computed(() => {
    const total = this.plan()?.budgetTotal;
    return total != null && this.range().high > total;
  });
  // How full the bar is, by the high end of the estimates
  percent = computed(() => {
    const total = this.plan()?.budgetTotal;
    return total ? Math.min(100, (this.range().high / total) * 100) : 0;
  });
  remaining = computed(() => {
    const total = this.plan()?.budgetTotal;
    if (total == null) return '';
    const { low, high } = this.range();
    if (high <= total) return `${formatRange(total - high, total - low)} left`;
    if (low > total) return `Over by ${formatRange(low - total, high - total)}`;
    return `Could go over by up to ${formatMoney(high - total)}`;
  });

  formatMoney = formatMoney;
  formatRange = formatRange;

  async add() {
    const label = this.label().trim();
    const cost = this.cost();
    const upTo = this.upTo();
    if (!label || !cost || cost <= 0) return this.error.set('Enter what it’s for and a cost above $0.');
    if (upTo != null && upTo < cost) return this.error.set('“Up to” should be at least the cost.');

    const input = upTo != null && upTo > cost ? { label, low: cost, high: upTo } : { label, amount: cost };
    const error = await this.store.apply('add_budget_item', input);
    this.error.set(error ?? '');
    if (!error) {
      this.label.set('');
      this.cost.set(null);
      this.upTo.set(null);
    }
  }

  async remove(index: number) {
    this.error.set((await this.store.apply('remove_budget_item', { index })) ?? '');
  }

  async setTotal() {
    const total = this.total();
    if (!total || total <= 0) return this.error.set('Enter a total above $0.');
    const error = await this.store.apply('set_basics', { budgetTotal: total });
    this.error.set(error ?? '');
    if (!error) this.total.set(null);
  }
}
