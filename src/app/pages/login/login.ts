import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';
    this.loading = true;

    const { error } = await this.supabase.signIn(this.email, this.password);

    this.loading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
