import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { AgentService } from '../../../services/agent.service';
import type { Plan } from '../../../shared/plan';

interface ChatLine {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Birthday for 12 at my place next Saturday, board games, $300 budget',
  'A picnic in a city park for about 30 people',
];

@Component({
  selector: 'app-agent-chat',
  imports: [FormsModule],
  templateUrl: './agent-chat.html',
  styleUrl: './agent-chat.css',
})
export class AgentChatComponent {
  private agent = inject(AgentService);

  eventId = input.required<string>();
  planChange = output<Plan>();

  lines = signal<ChatLine[]>([]);
  busy = signal(false);
  errorMessage = signal('');
  draft = '';
  suggestions = SUGGESTIONS;

  private log = viewChild<ElementRef<HTMLElement>>('log');

  // The conversation in API form, sent back on every request. Kept in memory only:
  // a reload starts a fresh conversation, but the plan itself is saved on the server.
  private history: BetaMessageParam[] = [];

  async send(text = this.draft) {
    const message = text.trim();
    if (!message || this.busy()) return;

    this.draft = '';
    this.errorMessage.set('');
    this.busy.set(true);
    this.lines.update(lines => [...lines, { role: 'user', text: message }, { role: 'assistant', text: '' }]);
    this.scrollToEnd();

    // Set when a new round starts: its first words replace the reply so far
    let replaceReply = false;

    try {
      for await (const event of this.agent.send(this.eventId(), message, this.history)) {
        switch (event.type) {
          case 'text':
            this.appendToReply(event.delta, replaceReply);
            replaceReply = false;
            break;
          case 'round':
            replaceReply = true;
            break;
          case 'plan':
            this.planChange.emit(event.plan);
            break;
          case 'done':
            this.history = [...this.history, ...event.messages];
            this.planChange.emit(event.plan);
            break;
          case 'error':
            this.errorMessage.set(event.error);
            break;
        }
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      // Drop the reply bubble if nothing was written into it
      this.lines.update(lines => (lines.at(-1)?.text === '' ? lines.slice(0, -1) : lines));
      this.busy.set(false);
    }
  }

  onKeydown(event: KeyboardEvent) {
    // Enter sends; Shift+Enter adds a new line
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private appendToReply(delta: string, replace: boolean) {
    this.lines.update(lines => {
      const last = lines.at(-1)!;
      const text = replace ? delta : last.text + delta;
      return [...lines.slice(0, -1), { ...last, text }];
    });
    this.scrollToEnd();
  }

  private scrollToEnd() {
    requestAnimationFrame(() => {
      const el = this.log()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
