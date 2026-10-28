import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute, Router } from '@angular/router';
import { AgentChatComponent } from './agent-chat/agent-chat';
import { PlanCardComponent } from './plan-card/plan-card';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';
import { PlanBarComponent } from '../../components/plan-bar/plan-bar';
import { EventsService } from '../../services/events.service';
import { applyTool, type Plan } from '../../shared/plan';

@Component({
  selector: 'app-event-flow-two',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AgentChatComponent, PlanCardComponent, ConfirmDialogComponent, PlanBarComponent],
  templateUrl: './event-flow-two.html',
  styleUrl: './event-flow-two.css',
})
export class EventFlowTwoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private eventsService = inject(EventsService);
  private router = inject(Router);

  eventId = this.route.snapshot.paramMap.get('id')!;
  plan = signal<Plan | null>(null);
  loadError = signal('');

  renameError = signal('');
  confirmingDelete = signal(false);
  deleting = signal(false);
  deleteError = signal('');

  tabs = [
    { label: 'Budget',        icon: 'money',         path: 'budget' },
    { label: 'Calendar',      icon: 'calendar',      path: 'calendar' },
    { label: 'Communication', icon: 'communication', path: 'communication' },
  ];

  async ngOnInit() {
    try {
      const event = await this.eventsService.get(this.eventId);
      if (event) this.plan.set(event.plan);
      else this.loadError.set('This event doesn’t exist, or it belongs to another account.');
    } catch {
      this.loadError.set('Could not load this event. Refresh to try again.');
    }
  }

  async rename(name: string) {
    const current = this.plan();
    if (!current) return;
    const result = applyTool(current, 'set_basics', { name });
    if (!result.ok) return;
    this.plan.set(result.plan);
    this.renameError.set('');
    try {
      await this.eventsService.savePlan(this.eventId, result.plan);
    } catch {
      this.plan.set(current);
      this.renameError.set("Couldn't save the new name. Try again.");
    }
  }

  askDelete() {
    this.deleteError.set('');
    this.confirmingDelete.set(true);
  }

  async confirmDelete() {
    this.deleting.set(true);
    try {
      await this.eventsService.delete(this.eventId);
      await this.router.navigate(['/dashboard']);
    } catch {
      this.deleteError.set('Could not delete the event. Try again.');
      this.deleting.set(false);
    }
  }
}
