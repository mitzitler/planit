import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EventsService, type EventRow } from '../../services/events.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private eventsService = inject(EventsService);
  private router = inject(Router);

  events = signal<EventRow[]>([]);
  loading = signal(true);
  creating = signal(false);
  errorMessage = signal('');

  async ngOnInit() {
    try {
      this.events.set(await this.eventsService.list());
    } catch {
      this.errorMessage.set('Could not load your events. Refresh to try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Creates an empty event and opens it in Mission Control, where the assistant fills it in
  async createEvent() {
    this.creating.set(true);
    this.errorMessage.set('');
    try {
      const id = await this.eventsService.create();
      this.router.navigate(['/events', id, 'manage']);
    } catch {
      this.errorMessage.set('Could not create the event. Try again.');
      this.creating.set(false);
    }
  }

  // Plan dates are YYYY-MM-DD; formatted in UTC so the day doesn't shift with the time zone
  formatDate(date: string) {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
}
