import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { SignupComponent } from './pages/signup/signup';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { EventFlowOneComponent } from './pages/event-flow-one/event-flow-one';
import { EventFlowTwoComponent } from './pages/event-flow-two/event-flow-two';
import { BudgetComponent } from './pages/event-flow-two/budget/budget';
import { CalendarToolComponent } from './pages/event-flow-two/calendar-tool/calendar-tool';
import { CommunicationComponent } from './pages/event-flow-two/communication/communication';
import { EventFlowThreeComponent } from './pages/event-flow-three/event-flow-three';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  // Protected routes — require a valid session
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // Event Flow 1 — event specification (5-card layout)
  { path: 'events/new', component: EventFlowOneComponent, canActivate: [authGuard] },

  // Event Flow 2 — management tools
  {
    path: 'events/:id/manage',
    component: EventFlowTwoComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'budget', pathMatch: 'full' },
      { path: 'budget', component: BudgetComponent },
      { path: 'calendar', component: CalendarToolComponent },
      { path: 'communication', component: CommunicationComponent },
    ],
  },

  // Event Flow 3 — follow-up management
  { path: 'events/:id/followup', component: EventFlowThreeComponent, canActivate: [authGuard] },

  // Fallback
  { path: '**', redirectTo: '' },
];
