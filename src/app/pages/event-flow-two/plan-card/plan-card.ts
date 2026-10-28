import { Component, computed, input } from '@angular/core';
import {
  ACTIVITY_OPTIONS,
  FORMALITY_LEVELS,
  PLACE_OPTIONS,
  type ActivityOption,
  type PlaceOption,
} from '../../../services/decision-tree';
import { guestConflict, type Plan } from '../../../shared/plan';

// id → label for every place and activity
const LABELS = new Map<string, string>();
const collect = (nodes: (PlaceOption | ActivityOption)[]) => {
  for (const node of nodes) {
    LABELS.set(node.id, node.label);
    if (node.children) collect(node.children);
  }
};
collect(PLACE_OPTIONS);
collect(ACTIVITY_OPTIONS);

// Read-only view of the plan. It redraws whenever the parent passes a new plan,
// including mid-reply as the assistant's tool calls land.
@Component({
  selector: 'app-plan-card',
  templateUrl: './plan-card.html',
  styleUrl: './plan-card.css',
})
export class PlanCardComponent {
  plan = input.required<Plan>();

  places = computed(() => this.plan().places.map(label));
  activities = computed(() => this.plan().activities.map(label));
  guestClash = computed(() => guestConflict(this.plan().guests));
  formality = computed(() => {
    const formality = this.plan().formality;
    const level = FORMALITY_LEVELS.find(l => l.id === formality?.level);
    return level && formality ? { label: level.label, guess: !formality.confirmed } : null;
  });

  // e.g. "8–12", "Exactly 20", "19+ · prefers 15"; plans saved before `guests` existed show guestCount
  guestsLabel = computed(() => {
    const { guests, guestCount } = this.plan();
    if (!guests) return guestCount === null ? null : `${guestCount}`;
    const { min, max, exact, preferred } = guests;
    const range =
      exact !== undefined ? `Exactly ${exact}`
      : min !== undefined && max !== undefined ? (min === max ? `${min}` : `${min}–${max}`)
      : min !== undefined ? `${min}+`
      : max !== undefined ? `Up to ${max}`
      : null;
    if (preferred === undefined) return range;
    return range ? `${range} · prefers ${preferred}` : `About ${preferred}`;
  });

  // Estimates count at their low end here and at their high end (amount) in budgetHigh
  budgetLow = computed(() => this.plan().budget.reduce((sum, item) => sum + (item.low ?? item.amount), 0));
  budgetHigh = computed(() => this.plan().budget.reduce((sum, item) => sum + item.amount, 0));
  overBudget = computed(() => {
    const total = this.plan().budgetTotal;
    return total !== null && this.budgetHigh() > total;
  });

  formatDate(date: string) {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  formatMoney(amount: number) {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  }

  // "$40–70" for a range, "$60" otherwise
  formatRange(low: number, high: number) {
    return low === high ? this.formatMoney(high) : `${this.formatMoney(low)}–${this.formatMoney(high).slice(1)}`;
  }
}

function label(id: string) {
  return LABELS.get(id) ?? id;
}
