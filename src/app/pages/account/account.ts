import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { AVATARS } from '../../shared/avatars';
import { isNameAllowed } from '../../shared/profanity';

const NAME_MAX = 40;
const PASSWORD_MIN = 8;

// Display name, picture, email and password. Each section saves on its own.
@Component({
  selector: 'app-account',
  imports: [FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountComponent {
  private supabase = inject(SupabaseService);

  avatars = AVATARS;
  nameMax = NAME_MAX;
  passwordMin = PASSWORD_MIN;

  private user = this.supabase.currentSession?.user;
  currentEmail = this.user?.email ?? '';

  name = signal<string>(this.user?.user_metadata?.['name'] ?? '');
  avatar = signal<string>(this.user?.user_metadata?.['avatar'] ?? '');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  // One message per section, so a result shows next to the form it came from
  profileMessage = signal<Message | null>(null);
  emailMessage = signal<Message | null>(null);
  passwordMessage = signal<Message | null>(null);
  busy = signal(false);

  async saveProfile() {
    const name = this.name().trim().replace(/\s+/g, ' ');
    if (name && !isNameAllowed(name)) return this.profileMessage.set(error("That name isn't allowed. Try something else."));
    await this.run(this.profileMessage, () => this.supabase.updateProfile({ name: name || null, avatar: this.avatar() }), 'Saved.');
  }

  async saveEmail() {
    const email = this.email().trim();
    if (!email || email === this.currentEmail) return this.emailMessage.set(error('Enter a new email address.'));
    const done = await this.run(this.emailMessage, () => this.supabase.updateEmail(email),
      `Check ${email} for a confirmation link. Your email changes once you click it.`);
    if (done) this.email.set('');
  }

  async savePassword() {
    if (this.password().length < PASSWORD_MIN) {
      return this.passwordMessage.set(error(`Use at least ${PASSWORD_MIN} characters.`));
    }
    if (this.password() !== this.confirmPassword()) return this.passwordMessage.set(error("The passwords don't match."));
    const done = await this.run(this.passwordMessage, () => this.supabase.updatePassword(this.password()), 'Password changed.');
    if (done) {
      this.password.set('');
      this.confirmPassword.set('');
    }
  }

  private async run(
    message: WritableSignal<Message | null>,
    call: () => Promise<{ error: { message: string } | null }>,
    success: string,
  ): Promise<boolean> {
    this.busy.set(true);
    message.set(null);
    try {
      const { error: failure } = await call();
      message.set(failure ? error(failure.message) : { ok: true, text: success });
      return !failure;
    } catch {
      message.set(error('Something went wrong. Check your connection and try again.'));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}

interface Message {
  ok: boolean;
  text: string;
}

function error(text: string): Message {
  return { ok: false, text };
}
