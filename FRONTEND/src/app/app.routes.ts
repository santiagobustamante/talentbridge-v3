import { Routes } from '@angular/router';
import { CandidateGuard, CompanyGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './shared/layout/app-shell.component';
import { CompanyShellComponent } from './features/company/company-shell.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'company/login',
    loadComponent: () =>
      import('./features/auth/company-login.component').then((m) => m.CompanyLoginComponent),
  },
  {
    path: 'company/register',
    loadComponent: () =>
      import('./features/auth/company-register.component').then((m) => m.CompanyRegisterComponent),
  },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [CandidateGuard],
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/home-candidate/home-candidate.component').then(
            (m) => m.HomeCandidateComponent,
          ),
      },
      { path: 'dashboard', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'skills',
        loadComponent: () =>
          import('./features/skills/skills.component').then(
            (m) => m.SkillsComponent,
          ),
      },
      {
        path: 'experience',
        loadComponent: () =>
          import('./features/experiences/experiences.component').then(
            (m) => m.ExperiencesComponent,
          ),
      },
      {
        path: 'education',
        loadComponent: () =>
          import('./features/education/education.component').then(
            (m) => m.EducationComponent,
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects.component').then(
            (m) => m.ProjectsComponent,
          ),
      },
      {
        path: 'cv-analysis',
        loadComponent: () =>
          import('./features/cv-analysis/cv-analysis.component').then(
            (m) => m.CvAnalysisComponent,
          ),
      },
      {
        path: 'public-view',
        loadComponent: () =>
          import('./features/public-preview/public-preview.component').then(
            (m) => m.PublicPreviewComponent,
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./features/jobs/candidate-jobs.component').then(
            (m) => m.CandidateJobsComponent,
          ),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messages/messages.component').then(
            (m) => m.MessagesComponent,
          ),
      },
      {
        path: 'company-view/:id',
        loadComponent: () =>
          import('./features/company-view/company-view.component').then(
            (m) => m.CompanyViewComponent,
          ),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  {
    path: 'company',
    component: CompanyShellComponent,
    canActivate: [CompanyGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/company/company-dashboard.component').then((m) => m.CompanyDashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/company/company-profile.component').then((m) => m.CompanyProfileComponent),
      },
      {
        path: 'candidates',
        loadComponent: () =>
          import('./features/company/company-candidates.component').then((m) => m.CompanyCandidatesComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messages/messages.component').then(
            (m) => m.MessagesComponent,
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./features/company/company-jobs.component').then(
            (m) => m.CompanyJobsComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'portfolio/:slug',
    loadComponent: () =>
      import('./features/public-portfolio/public-portfolio.component').then(
        (m) => m.PublicPortfolioComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
