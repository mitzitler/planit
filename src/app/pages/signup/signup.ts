import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class SignupComponent {
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    const { error } = await this.supabase.signUp(this.email, this.password);

    this.loading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      // Supabase sends a confirmation email by default
      this.successMessage = 'Check your email to confirm your account, then log in.';
    }
  }
}
