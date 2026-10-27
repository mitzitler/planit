import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = async () => {
  if (environment.skipAuth) return true;

  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Wait for the stored session to load, otherwise a page refresh looks logged out
  await supabase.ready;

  if (supabase.currentSession) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
