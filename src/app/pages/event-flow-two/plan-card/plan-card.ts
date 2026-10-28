import { Component, computed, input } from '@angular/core';
import { ACTIVITY_OPTIONS, PLACE_OPTIONS, type ActivityOption, type PlaceOption } from '../../../services/decision-tree';
import type { Plan } from '../../../shared/plan';

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
  budgetSpent = computed(() => this.plan().budget.reduce((sum, item) => sum + item.amount, 0));
  overBudget = computed(() => {
    const total = this.plan().budgetTotal;
    return total !== null && this.budgetSpent() > total;
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
}

function label(id: string) {
  return LABELS.get(id) ?? id;
}
