import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsService } from '../../services/events.service';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private eventsService = inject(EventsService);

  // Signed-in hosts with an event on the go get a second button straight to the dashboard
  activeEvents = signal(0);

  async ngOnInit() {
    if (!(await this.supabase.ready)) return;
    try {
      this.activeEvents.set(await this.eventsService.countActive());
    } catch {
      // Not worth an error on the landing page; the button just doesn't show
    }
  }

  features = [
    {
      icon: 'orbit-satellite',
      title: 'Start with steps',
      text: 'Five quick cards for size, place, activities, cost and extras. Pick what fits and skip the rest.',
    },
    {
      icon: 'orbit-radar',
      title: 'Or chat instead',
      text: 'Describe the event in your own words. The agent fills in the plan as you talk, and you watch it change beside the chat.',
    },
    {
      icon: 'orbit-battery',
      title: 'Budget',
      text: 'A total and a line for each cost, with rough estimates from the agent so you know where the money goes.',
    },
    {
      icon: 'orbit-clock',
      title: 'Calendar',
      text: "The day's schedule and the to-dos leading up to it. Add it all to Apple or Google Calendar.",
    },
  ];
}
