import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EventsService, type EventRow } from '../../services/events.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';
import { NameDialogComponent } from '../../components/name-dialog/name-dialog';
import { NAME_NOT_ALLOWED, budgetRange, type Plan } from '../../shared/plan';
import { formatDate, formatMoney, formatRange } from '../../shared/format';
import { isNameAllowed } from '../../shared/profanity';

// "Welcome back, <title>" starts with the first, then picks the others at random
const TITLES = [
  'Astronaut', 'Space Cadet', 'Captain', 'Traveler', 'Starfarer',
  'Scientist', 'Navigator', 'Pilot', 'Commander', 'Explorer',
  'Voyager', 'Stargazer', 'Cosmonaut', 'Pioneer', 'Ranger',
  'Engineer', 'Spacefarer', 'Comet Chaser', 'Moonwalker', 'Orbiter',
  'Wayfinder', 'Rocketeer',
];
const TITLE_MS = 6250; // how long each title shows
const FADE_MS = 600; // matches .dashboard-title-word's transition

// Any title except the one showing, so it never repeats twice in a row
function nextTitle(current: string): string {
  const others = TITLES.filter(t => t !== current);
  return others[Math.floor(Math.random() * others.length)];
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ConfirmDialogComponent, NameDialogComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  title = signal(TITLES[0]);
  titleHidden = signal(false); // fades the word out before it changes

  events = signal<EventRow[]>([]);
  loading = signal(true);
  creating = signal(false);
  errorMessage = signal('');

  // Where the new event opens once the name popup is filled in; null while the popup is closed
  pendingCreate = signal<'manage' | 'plan' | null>(null);
  createError = signal('');

  // The event waiting on "Are you sure?", if any
  pendingDelete = signal<EventRow | null>(null);
  deleting = signal(false);
  deleteError = signal('');

  async ngOnInit() {
    // Stays on the first title for people who've asked their system for less motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let swap: ReturnType<typeof setTimeout> | undefined;
      const timer = setInterval(() => {
        this.titleHidden.set(true);
        swap = setTimeout(() => {
          this.title.set(nextTitle(this.title()));
          this.titleHidden.set(false);
        }, FADE_MS);
      }, TITLE_MS);
      this.destroyRef.onDestroy(() => {
        clearInterval(timer);
        clearTimeout(swap);
      });
    }

    try {
      this.events.set(await this.eventsService.list());
    } catch {
      this.errorMessage.set('Could not load your events. Refresh to try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Both create buttons ask for a name first, then open the event in Mission Control
  // (where the assistant fills it in) or in the step-by-step wizard
  askName(open: 'manage' | 'plan') {
    this.createError.set('');
    this.pendingCreate.set(open);
  }

  async createEvent(name: string) {
    const open = this.pendingCreate();
    if (!open) return;
    if (!isNameAllowed(name)) return this.createError.set(NAME_NOT_ALLOWED);
    this.creating.set(true);
    try {
      const id = await this.eventsService.create(name);
      this.router.navigate(['/events', id, open]);
    } catch {
      this.createError.set('Could not create the event. Try again.');
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

  formatDate = formatDate;

  // "12 planned", or "8–12, planning for 12" for a range. RSVPs aren't tracked yet, so there's no "confirmed".
  guestsText(plan: Plan): string {
    if (plan.guestCount === null) return 'not set yet';
    const { min, max } = plan.guests ?? {};
    if (min !== undefined && max !== undefined && min !== max) return `${min}–${max}, planning for ${plan.guestCount}`;
    return `${plan.guestCount} planned`;
  }

  // "$300 planned / $210–260 estimated": the host's total, then the line items' estimates
  budgetText(plan: Plan): string {
    const parts: string[] = [];
    if (plan.budgetTotal !== null) parts.push(`${formatMoney(plan.budgetTotal)} planned`);
    if (plan.budget.length) {
      const { low, high } = budgetRange(plan.budget);
      parts.push(`${formatRange(low, high)} estimated`);
    }
    return parts.join(' / ') || 'not set yet';
  }
}
