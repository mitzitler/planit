import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventsService } from '../../services/events.service';
import { eventIcon } from '../../shared/avatars';
import { localToday } from '../../shared/dates';
import { dismissWrapUp } from '../../shared/wrap-up';
import { formatDate } from '../../shared/format';
import type { Plan } from '../../shared/plan';

// The full-screen burst after "Mark complete": stars fly out from the middle of the screen in every
// direction, then drift down and fade, like confetti in Messages. Picked fresh for each burst.
const SPARK_COUNT = 80;
const SPARK_COLORS = ['var(--color-star)', 'var(--color-accent)', 'var(--color-primary-hover)', '#ffffff'];
const BURST_MS = 3200; // the longest spark's delay plus duration, so the layer is gone once they are

interface Spark {
  dx: string; // how far it flies, in vmax so it reaches the corners on any screen
  dy: string;
  size: string;
  spin: string;
  color: string;
  delay: string;
  duration: string;
}

function makeSparks(): Spark[] {
  const random = (min: number, max: number) => min + Math.random() * (max - min);
  return Array.from({ length: SPARK_COUNT }, () => {
    const angle = random(0, 2 * Math.PI);
    const distance = random(15, 75);
    return {
      dx: `${(Math.cos(angle) * distance).toFixed(1)}vmax`,
      dy: `${(Math.sin(angle) * distance).toFixed(1)}vmax`,
      size: `${random(8, 20).toFixed(0)}px`,
      spin: `${random(-540, 540).toFixed(0)}deg`,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      delay: `${random(0, 300).toFixed(0)}ms`,
      duration: `${random(1800, 2800).toFixed(0)}ms`,
    };
  });
}

// Flow 3: wrapping up an event. Marking it complete keeps it (unlike Delete) and moves it to the
// dashboard's Completed list; reopening sends the host back to Mission Control.
@Component({
  selector: 'app-event-flow-three',
  imports: [RouterLink],
  templateUrl: './event-flow-three.html',
  styleUrl: './event-flow-three.css',
})
export class EventFlowThreeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventsService = inject(EventsService);

  eventId = this.route.snapshot.paramMap.get('id')!;
  icon = eventIcon(this.eventId);
  sparks = signal<Spark[]>([]); // empty except during a burst
  formatDate = formatDate;

  plan = signal<Plan | null>(null);
  loadError = signal('');
  busy = signal(false);
  error = signal('');
  celebrating = signal(false); // only right after the click, not on later visits
  private destroyRef = inject(DestroyRef);

  // "4 of 6 to-dos checked off", or null with nothing on the schedule
  todosText = computed(() => {
    const schedule = this.plan()?.schedule ?? [];
    if (!schedule.length) return null;
    return `${schedule.filter(item => item.done).length} of ${schedule.length} to-dos checked off`;
  });

  notHappenedYet = computed(() => {
    const date = this.plan()?.date;
    return !!date && date > localToday();
  });

  async ngOnInit() {
    try {
      const event = await this.eventsService.get(this.eventId);
      if (event) {
        this.plan.set(event.plan);
        // Completed from the dashboard's wrap-up prompt: celebrate here
        if (event.plan.completedAt && history.state?.celebrate) {
          history.replaceState({ ...history.state, celebrate: false }, ''); // not again on a refresh
          this.celebrate();
        }
      } else this.loadError.set('This event doesn’t exist, or it belongs to another account.');
    } catch {
      this.loadError.set('Could not load this event. Refresh to try again.');
    }
  }

  async complete() {
    const plan = this.plan();
    if (!plan) return;
    if (await this.save({ ...plan, completedAt: localToday() })) this.celebrate();
  }

  private celebrate() {
    this.celebrating.set(true);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.sparks.set(makeSparks());
    const timer = setTimeout(() => this.sparks.set([]), BURST_MS);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  async reopen() {
    const { completedAt, ...plan } = this.plan()!;
    // Reopened on purpose, so the dashboard shouldn't ask to wrap it up again
    dismissWrapUp(this.eventId);
    if (await this.save(plan)) await this.router.navigate(['/events', this.eventId, 'manage']);
  }

  private async save(plan: Plan): Promise<boolean> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.eventsService.savePlan(this.eventId, plan);
      this.plan.set(plan);
      return true;
    } catch {
      this.error.set("Couldn't save. Check your connection and try again.");
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
