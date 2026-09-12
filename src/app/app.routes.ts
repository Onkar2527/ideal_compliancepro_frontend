import { Routes } from '@angular/router';
import { AppLayout } from './shell/layout/component/app.layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadComponent: () => import('./features/dashboard/dashboard').then(mod => mod.Dashboard) },
      { path: 'circulars', loadComponent: () => import('./features/circulars/circulars.component').then(mod => mod.CircularsComponent) },
      { path: 'circulars/:id/chat', loadComponent: () => import('./features/circulars/circular-chat.component').then(m => m.CircularChatComponent) },
      { path: 'tasks', loadComponent: () => import('./features/tasks/tasks.component').then(mod => mod.TasksComponent) },
      { path: 'assignments', loadComponent: () => import('./features/assignments/assignments').then(mod => mod.AssignmentsComponent) },
      { path: 'assignments/:id', loadComponent: () => import('./features/assignments/assignment-details').then(mod => mod.AssignmentDetailsComponent) },
      { path: 'review', loadComponent: () => import('./features/review/review.component').then(mod => mod.ReviewComponent) },
      { path: 'review/:id', loadComponent: () => import('./features/review/review-details.component').then(mod => mod.ReviewDetailsComponent) },
      { path: 'co-review', loadComponent: () => import('./features/review/co-review.component').then(mod => mod.CoReviewComponent) },
      { path: 'co-review/:id', loadComponent: () => import('./features/review/co-review-details.component').then(mod => mod.CoReviewDetailsComponent) },
      { path: 'cco-review', loadComponent: () => import('./features/review/cco-review.component').then(mod => mod.CcoReviewComponent) },
      { path: 'cco-review/:id', loadComponent: () => import('./features/review/cco-review-details.component').then(mod => mod.CcoReviewDetailsComponent) },
      { path: 'task-sets', loadComponent: () => import('./features/task-sets/task-sets').then(mod => mod.TaskSetsComponent) },
      { path: 'notifications', loadComponent: () => import('./features/notifications/notifications').then(mod => mod.NotificationsComponent) },
      { path: 'admin/authorities', loadComponent: () => import('./features/admin/authorities/authorities').then(mod => mod.Authorities) },
      { path: 'admin/branches', loadComponent: () => import('./features/admin/branches/branches').then(mod => mod.Branches) },
      { path: 'admin/users', loadComponent: () => import('./features/admin/users/users').then(mod => mod.Users) },
      { path: 'admin/task-headers', loadComponent: () => import('./features/admin/task-headers.component').then(mod => mod.TaskHeadersComponent) },
      { path: 'admin/manage-assignments', loadComponent: () => import('./features/admin/manage-assignments/manage-assignments').then(mod => mod.ManageAssignmentsComponent) },
      { path: 'admin/documents', loadComponent: () => import('./features/documents/documents.component').then(mod => mod.DocumentsComponent) },
      { path: 'documents', redirectTo: 'admin/documents', pathMatch: 'full' },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(mod => mod.ReportsComponent) },
      { path: 'reports/:reportSlug', loadComponent: () => import('./features/reports/report-viewer/report-viewer.component').then(mod => mod.ReportViewerComponent) },
    ]
  },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) 
  },
  { path: '**', redirectTo: '/home' },
];
// Touch to trigger watcher reload
