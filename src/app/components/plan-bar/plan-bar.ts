import { Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVENT_NAME_MAX } from '../../shared/plan';

// The last name shown for each event, so switching screens keeps showing it while the next
// screen loads the plan (instead of flashing the placeholder)
const lastNames = new Map<string, string>();

// The rounded bar above both planning screens: the event name on the left (click to rename it)
// and a switch to the other way of planning on the right.
@Component({
  selector: 'app-plan-bar',
  imports: [RouterLink],
  templateUrl: './plan-bar.html',
  styleUrl: './plan-bar.css',
})
export class PlanBarComponent {
  eventId = input.required<string>();
  name = input.required<string | null>();
  mode = input.required<'manual' | 'agent'>(); // the screen this bar is on

  rename = output<string>();

  readonly maxLength = EVENT_NAME_MAX;
  editing = signal(false);
  draft = signal('');
  private field = viewChild<ElementRef<HTMLInputElement>>('field');

  displayName = computed(() => this.name() ?? lastNames.get(this.eventId()) ?? 'name your event');

  constructor() {
    effect(() => {
      const name = this.name();
      if (name) lastNames.set(this.eventId(), name);
    });
  }

  switchLink = computed(() => ['/events', this.eventId(), this.mode() === 'manual' ? 'manage' : 'plan']);
  switchLabel = computed(() => (this.mode() === 'manual' ? 'move to the agent window' : 'move to manual planning'));

  startEditing() {
    this.draft.set(this.name() ?? '');
    this.editing.set(true);
    // The input exists after this change renders
    setTimeout(() => this.field()?.nativeElement.select());
  }

  // On Enter or blur. An empty or unchanged name keeps the old one.
  finishEditing() {
    if (!this.editing()) return;
    this.editing.set(false);
    const name = this.draft().trim();
    if (name && name !== this.name()) this.rename.emit(name);
  }

  cancelEditing() {
    this.editing.set(false);
  }
}
