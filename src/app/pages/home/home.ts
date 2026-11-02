import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
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
