import { Component, inject } from '@angular/core';
import { PlanCardComponent } from '../plan-card/plan-card';
import { EventPlanStore } from '../event-plan.store';

// Mission Control's Overview tab: the live plan card, beside the chat
@Component({
  selector: 'app-overview',
  imports: [PlanCardComponent],
  template: `@if (plan(); as plan) { <app-plan-card [plan]="plan" /> }`,
  styles: `:host, app-plan-card { display: block; height: 100%; }`,
})
export class OverviewComponent {
  plan = inject(EventPlanStore).plan;
}
