import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class SignupComponent implements OnDestroy {
  private supabase = inject(SupabaseService);

  email = '';
  password = '';
  errorMessage = signal('');
  loading = signal(false);

  // Set once signup succeeds; switches the card to the "check your inbox" view
  sentTo = signal<string | null>(null);
  resendMessage = signal('');
  resendCooldown = signal(0);
  private cooldownTimer?: ReturnType<typeof setInterval>;

  async onSubmit() {
    this.errorMessage.set('');
    this.loading.set(true);

    const { data, error } = await this.supabase.signUp(this.email, this.password);

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
    } else if (data.user && data.user.identities?.length === 0) {
      // Supabase returns a user with no identities when the email is already registered
      this.errorMessage.set('An account with this email already exists. Try logging in.');
    } else {
      this.sentTo.set(this.email);
      this.startCooldown();
    }
  }

  async resend() {
    const email = this.sentTo();
    if (!email || this.resendCooldown() > 0) return;

    this.resendMessage.set('');
    const { error } = await this.supabase.resendConfirmation(email);
    this.resendMessage.set(error ? error.message : 'Sent again. Check your spam folder too.');
    this.startCooldown();
  }

  ngOnDestroy() {
    clearInterval(this.cooldownTimer);
  }

  private startCooldown() {
    clearInterval(this.cooldownTimer);
    this.resendCooldown.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown.update(s => s - 1);
      if (this.resendCooldown() <= 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }
}
