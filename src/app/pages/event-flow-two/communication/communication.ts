import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventPlanStore } from '../event-plan.store';
import { askMessage, changeMessage, inviteApps, reminderMessage } from '../../../shared/messages';

interface Message {
  id: string;
  label: string;
  text: string;
  ask?: number; // index into plan.asks, for removing it
}

// Invite links and short messages the host sends from their own apps; Planit never sends anything.
// Edits go through the same tools as the assistant's (EventPlanStore.apply).
@Component({
  selector: 'app-communication',
  imports: [FormsModule],
  templateUrl: './communication.html',
  styleUrl: './communication.css',
})
export class CommunicationComponent {
  private store = inject(EventPlanStore);

  plan = this.store.plan;
  locked = this.store.agentBusy;
  error = signal('');
  copied = signal<string | null>(null);

  link = signal('');
  // Add an ask
  who = signal('');
  what = signal('');
  time = signal('');

  apps = computed(() => (this.plan() ? inviteApps(this.plan()!) : []));

  messages = computed<Message[]>(() => {
    const plan = this.plan();
    if (!plan) return [];
    return [
      { id: 'msg-reminder', label: 'Reminder', text: reminderMessage(plan) },
      { id: 'msg-change', label: 'A change', text: changeMessage(plan) },
      ...(plan.asks ?? []).map((ask, i) => ({ id: `msg-ask-${i}`, label: `To ${ask.who}`, text: askMessage(plan, ask), ask: i })),
    ];
  });

  async setLink(url: string) {
    const error = await this.store.apply('set_basics', { inviteUrl: url });
    this.error.set(error ? 'That doesn’t look like a link. Copy it from the invite app and paste it here.' : '');
    if (!error) this.link.set('');
  }

  async addAsk() {
    if (!this.who().trim() || !this.what().trim()) return this.error.set('Enter who, and what you asked them to do.');
    const input = { who: this.who(), what: this.what(), ...(this.time() ? { time: this.time() } : {}) };
    const error = await this.store.apply('add_ask', input);
    this.error.set(error ?? '');
    if (!error) {
      this.who.set('');
      this.what.set('');
      this.time.set('');
    }
  }

  async removeAsk(index: number) {
    this.error.set((await this.store.apply('remove_ask', { index })) ?? '');
  }

  async copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(id);
      setTimeout(() => this.copied.set(null), 2000);
    } catch {
      this.error.set("Couldn't copy. Select the text and copy it instead.");
    }
  }

  // Opens the host's own Messages or email app with the text filled in; they pick who it goes to
  open(app: 'sms' | 'email', text: string) {
    const body = encodeURIComponent(text);
    const subject = encodeURIComponent(this.plan()?.name ?? 'The party');
    location.href = app === 'sms' ? `sms:?&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
  }
}
