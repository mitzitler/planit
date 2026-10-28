import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { AgentChatComponent } from './agent-chat/agent-chat';
import { PlanCardComponent } from './plan-card/plan-card';
import { EventsService } from '../../services/events.service';
import type { Plan } from '../../shared/plan';

@Component({
  selector: 'app-event-flow-two',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AgentChatComponent, PlanCardComponent],
  templateUrl: './event-flow-two.html',
  styleUrl: './event-flow-two.css',
})
export class EventFlowTwoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private eventsService = inject(EventsService);

  eventId = this.route.snapshot.paramMap.get('id')!;
  plan = signal<Plan | null>(null);
  loadError = signal('');

  tabs = [
    { label: '💰 Budget',        path: 'budget' },
    { label: '📅 Calendar',      path: 'calendar' },
    { label: '💬 Communication', path: 'communication' },
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
}
