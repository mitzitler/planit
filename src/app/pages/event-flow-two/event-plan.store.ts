import { Injectable, inject, signal } from '@angular/core';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { EventsService } from '../../services/events.service';
import { applyTool, type Plan, type ToolName } from '../../shared/plan';

// The open event's plan, shared by Mission Control, the chat, the Plan card and the tabs.
// Provided by EventFlowTwoComponent, so each open event gets its own store.
@Injectable()
export class EventPlanStore {
  private eventsService = inject(EventsService);

  eventId = '';
  plan = signal<Plan | null>(null);
  chat: BetaMessageParam[] = []; // the saved conversation, set before the plan when the event loads
  // True while the assistant is replying. Its run saves the plan it started from plus its own
  // changes, so edits made by hand meanwhile would be overwritten; the tabs wait instead.
  agentBusy = signal(false);
  saving = signal(false);

  // Applies a tool by hand, with the same validation the assistant gets, and saves the result.
  // Returns an error message, or null on success. The change shows straight away and is
  // undone if the save fails.
  async apply(name: ToolName, input: Record<string, unknown>): Promise<string | null> {
    const current = this.plan();
    if (!current) return 'The event is still loading.';
    if (this.agentBusy()) return 'Wait for the assistant to finish.';

    const result = applyTool(current, name, input);
    if (!result.ok) return result.error;

    this.plan.set(result.plan);
    this.saving.set(true);
    try {
      await this.eventsService.savePlan(this.eventId, result.plan);
      return null;
    } catch {
      this.plan.set(current);
      return "Couldn't save the change. Try again.";
    } finally {
      this.saving.set(false);
    }
  }
}
