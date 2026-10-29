import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  errorMessage = signal('');
  infoMessage = signal('');
  loading = signal(false);

  // Shown when the account exists but the email link hasn't been clicked (or expired)
  canResend = signal(false);

  async ngOnInit() {
    // Supabase puts link errors (e.g. an expired confirmation link) in the URL hash
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const linkError = hash.get('error_code');

    if (linkError) {
      this.errorMessage.set(
        linkError === 'otp_expired'
          ? 'That confirmation link has expired or was already used. Enter your email below to get a new one.'
          : (hash.get('error_description') ?? 'That link didn’t work.'),
      );
      this.canResend.set(true);
      return;
    }

    if (this.route.snapshot.queryParamMap.has('confirmed')) {
      // Clicking the link signs the user in, so skip the form when a session came with it
      const session = await this.supabase.ready;
      if (session) {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.infoMessage.set('Your email is confirmed. Log in to get started.');
    }
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.canResend.set(false);
    this.loading.set(true);

    const { error } = await this.supabase.signIn(this.email, this.password);

    this.loading.set(false);

    if (!error) {
      this.router.navigate(['/dashboard']);
    } else if (error.code === 'email_not_confirmed') {
      this.errorMessage.set('You haven’t confirmed your email yet. Check your inbox, or resend the link.');
      this.canResend.set(true);
    } else {
      this.errorMessage.set(error.message);
    }
  }

  async resend() {
    if (!this.email) {
      this.errorMessage.set('Enter your email above, then resend.');
      return;
    }

    const { error } = await this.supabase.resendConfirmation(this.email);
    if (error) {
      this.errorMessage.set(error.message);
    } else {
      this.errorMessage.set('');
      this.infoMessage.set(`New confirmation link sent to ${this.email}.`);
      this.canResend.set(false);
    }
  }
}
