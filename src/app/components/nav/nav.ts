import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { EventDraftService } from '../../services/event-draft.service';

// Keeps the logout overlay up long enough to read instead of flashing
const MIN_LOGOUT_MS = 600;
const OVERLAY_FADE_MS = 300;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Component({
  selector: 'app-nav',
  imports: [RouterLink, AsyncPipe],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class NavComponent {
  private supabase = inject(SupabaseService);
  private draftService = inject(EventDraftService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  session$ = this.supabase.session$;

  menuOpen = signal(false);
  loggingOut = signal(false);
  overlayLeaving = signal(false);
  logoutError = signal('');

  private avatarButton = viewChild<ElementRef<HTMLButtonElement>>('avatarButton');
  private firstMenuItem = viewChild<ElementRef<HTMLElement>>('firstMenuItem');

  getInitials(email: string): string {
    const username = email.split('@')[0];
    return username.slice(0, 2).toUpperCase();
  }

  toggleMenu() {
    this.logoutError.set('');
    this.menuOpen.update(open => !open);
    if (this.menuOpen()) {
      // Wait a tick for the menu to render, then move focus into it
      setTimeout(() => this.firstMenuItem()?.nativeElement.focus());
    }
  }

  closeMenu(returnFocus = false) {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (returnFocus) this.avatarButton()?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu(true);
  }

  async signOut() {
    this.closeMenu();
    this.logoutError.set('');
    this.loggingOut.set(true);

    const [{ error }] = await Promise.all([this.supabase.signOut(), wait(MIN_LOGOUT_MS)]);

    if (error) {
      this.loggingOut.set(false);
      this.logoutError.set('Couldn’t log you out. Check your connection and try again.');
      this.menuOpen.set(true);
      return;
    }

    // Don't leave this user's draft behind for the next person on this browser
    this.draftService.clear();
    await this.router.navigate(['/']);

    this.overlayLeaving.set(true);
    await wait(OVERLAY_FADE_MS);
    this.loggingOut.set(false);
    this.overlayLeaving.set(false);
  }
}
