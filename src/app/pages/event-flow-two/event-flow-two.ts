import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-event-flow-two',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './event-flow-two.html',
  styleUrl: './event-flow-two.css',
})
export class EventFlowTwoComponent {
  constructor(private route: ActivatedRoute) {}

  get eventId() {
    return this.route.snapshot.paramMap.get('id');
  }

  tabs = [
    { label: '💰 Budget',        path: 'budget' },
    { label: '📅 Calendar',      path: 'calendar' },
    { label: '💬 Communication', path: 'communication' },
  ];
}
