import { Component, computed, input } from '@angular/core';
import {
  ACTIVITY_OPTIONS,
  FORMALITY_LEVELS,
  OCCASIONS,
  PLACE_OPTIONS,
  type ActivityOption,
  type PlaceOption,
} from '../../../services/decision-tree';
import { formatDate, formatMoney, formatRange, formatShortDate, formatTime } from '../../../shared/format';
import { budgetRange, guestConflict, type Plan } from '../../../shared/plan';

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

// "<activity id>/<follow-up id>/<choice id>" → choice label, for the follow-up answers
const CHOICE_LABELS = new Map<string, string>();
for (const option of ACTIVITY_OPTIONS.flatMap(category => category.children ?? [])) {
  for (const followUp of option.followUps ?? []) {
    for (const choice of followUp.choices) CHOICE_LABELS.set(`${option.id}/${followUp.id}/${choice.id}`, choice.label);
  }
}

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
  // An activity's follow-up answers follow its name: "Cocktails · A bartender"
  activities = computed(() => {
    const details = Object.entries(this.plan().activityDetails ?? {});
    return this.plan().activities.map(id => {
      const answers = details
        .filter(([key]) => key.split('/')[0] === id)
        .map(([key, choice]) => CHOICE_LABELS.get(`${key}/${choice}`))
        .filter(Boolean);
      return [label(id), ...answers].join(' · ');
    });
  });
  occasion = computed(() => OCCASIONS.find(occasion => occasion.id === this.plan().occasion)?.label ?? null);
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

  private budget = computed(() => budgetRange(this.plan().budget));
  budgetLow = computed(() => this.budget().low);
  budgetHigh = computed(() => this.budget().high);
  overBudget = computed(() => {
    const total = this.plan().budgetTotal;
    return total !== null && this.budgetHigh() > total;
  });

  formatDate = formatDate;
  formatTime = formatTime;
  formatShortDate = formatShortDate;
  formatMoney = formatMoney;
  formatRange = formatRange;
}

function label(id: string) {
  return LABELS.get(id) ?? id;
}
