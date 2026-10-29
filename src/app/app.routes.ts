import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { SignupComponent } from './pages/signup/signup';
import { authGuard } from './guards/auth-guard';

// Public pages load up front; the signed-in pages are lazy-loaded so the first visit stays small
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  // Protected routes — require a valid session
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },

  {
    path: 'account',
    loadComponent: () => import('./pages/account/account').then(m => m.AccountComponent),
    canActivate: [authGuard],
  },

  // Event Flow 1 — event specification (5-card layout), saved into the event as you go
  {
    path: 'events/:id/plan',
    loadComponent: () => import('./pages/event-flow-one/event-flow-one').then(m => m.EventFlowOneComponent),
    canActivate: [authGuard],
  },

  // Event Flow 2 — management tools
  {
    path: 'events/:id/manage',
    loadComponent: () => import('./pages/event-flow-two/event-flow-two').then(m => m.EventFlowTwoComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'budget', pathMatch: 'full' },
      { path: 'budget', loadComponent: () => import('./pages/event-flow-two/budget/budget').then(m => m.BudgetComponent) },
      {
        path: 'calendar',
        loadComponent: () => import('./pages/event-flow-two/calendar-tool/calendar-tool').then(m => m.CalendarToolComponent),
      },
    ],
  },

  // Event Flow 3 — follow-up management
  {
    path: 'events/:id/followup',
    loadComponent: () => import('./pages/event-flow-three/event-flow-three').then(m => m.EventFlowThreeComponent),
    canActivate: [authGuard],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
