import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, AsyncPipe],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class NavComponent {
  session$;

  constructor(private supabase: SupabaseService, private router: Router) {
    this.session$ = supabase.session$;
  }

  getInitials(email: string): string {
    const username = email.split('@')[0];
    return username.slice(0, 2).toUpperCase();
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/']);
  }
}
