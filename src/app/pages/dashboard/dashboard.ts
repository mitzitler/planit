import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface EventCard {
  id: string;
  name: string;
  date: string;
  guestCount: number;
  status: 'planning' | 'confirmed' | 'complete';
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  // Stub events — will be replaced with real Supabase data after auth
  events: EventCard[] = [
    { id: '1', name: 'Mia\'s Birthday Bash', date: 'Mar 15, 2026', guestCount: 24, status: 'planning' },
    { id: '2', name: 'Summer Rooftop Hang', date: 'Jun 21, 2026', guestCount: 40, status: 'confirmed' },
    { id: '3', name: 'Book Club Potluck', date: 'Feb 28, 2026', guestCount: 10, status: 'complete' },
  ];

  statusLabel: Record<EventCard['status'], string> = {
    planning:  '🛸 Planning',
    confirmed: '✅ Confirmed',
    complete:  '🏁 Complete',
  };
}
