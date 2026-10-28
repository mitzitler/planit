import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EventsService, type EventRow } from '../../services/events.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ConfirmDialogComponent],
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

  // The event waiting on "Are you sure?", if any
  pendingDelete = signal<EventRow | null>(null);
  deleting = signal(false);
  deleteError = signal('');

  async ngOnInit() {
    try {
      this.events.set(await this.eventsService.list());
    } catch {
      this.errorMessage.set('Could not load your events. Refresh to try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Creates an empty event and opens it in Mission Control (where the assistant fills it in)
  // or in the step-by-step wizard
  async createEvent(open: 'manage' | 'plan' = 'manage') {
    this.creating.set(true);
    this.errorMessage.set('');
    try {
      const id = await this.eventsService.create();
      this.router.navigate(['/events', id, open]);
    } catch {
      this.errorMessage.set('Could not create the event. Try again.');
      this.creating.set(false);
    }
  }

  askDelete(event: EventRow) {
    this.deleteError.set('');
    this.pendingDelete.set(event);
  }

  async confirmDelete() {
    const event = this.pendingDelete();
    if (!event) return;
    this.deleting.set(true);
    try {
      await this.eventsService.delete(event.id);
      this.events.update(events => events.filter(e => e.id !== event.id));
      this.pendingDelete.set(null);
    } catch {
      this.deleteError.set('Could not delete the event. Try again.');
    } finally {
      this.deleting.set(false);
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
