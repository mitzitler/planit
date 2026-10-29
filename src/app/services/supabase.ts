import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  // Emits the current session — null means logged out
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  session$ = this.sessionSubject.asObservable();

  // Resolves once the stored session has been read; guards await this before checking
  readonly ready: Promise<Session | null>;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // Hydrate session on startup (handles page refresh)
    this.ready = this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSubject.next(data.session);
      return data.session;
    });

    // Keep session in sync on login/logout/token refresh
    this.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      this.sessionSubject.next(session);
    });
  }

  get client() {
    return this.supabase;
  }

  get currentSession() {
    return this.sessionSubject.value;
  }

  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: this.confirmRedirectUrl },
    });
  }

  resendConfirmation(email: string) {
    return this.supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: this.confirmRedirectUrl },
    });
  }

  // Confirmation links land back on this deployment's login page
  private get confirmRedirectUrl() {
    return `${window.location.origin}/login?confirmed=1`;
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  // Profile fields live in the user's metadata: { name?: string, avatar?: string (a public/icons name) }
  updateProfile(data: { name?: string | null; avatar?: string }) {
    return this.supabase.auth.updateUser({ data });
  }

  // Supabase emails a confirmation link; the address changes once it's clicked
  updateEmail(email: string) {
    return this.supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/account` });
  }

  updatePassword(password: string) {
    return this.supabase.auth.updateUser({ password });
  }
}
