import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { PageComponent } from '../../shared/components/page/page.component';
import { BranchDashboardComponent } from './branch-dept-dashboard/branch-dashboard.component';
import { CoDashboardComponent } from './co-dashboard/co-dashboard.component';
import { CcoDashboardComponent } from './cco-dashboard/cco-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BranchDashboardComponent, CoDashboardComponent, CcoDashboardComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  stats: any = null;
  statusCards: { label: string; value: number; color: string }[] = [];
  loading = signal<boolean>(true);

  constructor(
    private api: ComplianceApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  get role(): string {
    return this.auth.currentUser()?.role || '';
  }

  ngOnInit() {
    this.loading.set(true);
    this.api.getBranches().subscribe({
      next: (branches) => {
        const user = this.auth.currentUser();
        let allowedBranchNames: string[] = [];
        let allowedBranchIds: number[] = [];

        if (user && user.role === 'CO') {
          const userManagedBranches = branches.filter((b: any) => String(b.co_user_id) === String(user.id));
          if (userManagedBranches.length > 0) {
            allowedBranchNames = userManagedBranches.map((b: any) => (b.name || '').trim().toLowerCase());
            allowedBranchIds = userManagedBranches.map((b: any) => b.id);
          } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
            const mappedIds = new Set(user.managed_branch_ids);
            const userMapped = branches.filter((b: any) => mappedIds.has(b.id));
            allowedBranchNames = userMapped.map((b: any) => (b.name || '').trim().toLowerCase());
            allowedBranchIds = userMapped.map((b: any) => b.id);
          }
        } else if (user && user.role === 'CCO') {
          const userManagedBranches = branches.filter((b: any) => String(b.cco_user_id) === String(user.id));
          if (userManagedBranches.length > 0) {
            allowedBranchNames = userManagedBranches.map((b: any) => (b.name || '').trim().toLowerCase());
            allowedBranchIds = userManagedBranches.map((b: any) => b.id);
          } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
            const mappedIds = new Set(user.managed_branch_ids);
            const userMapped = branches.filter((b: any) => mappedIds.has(b.id));
            allowedBranchNames = userMapped.map((b: any) => (b.name || '').trim().toLowerCase());
            allowedBranchIds = userMapped.map((b: any) => b.id);
          }
        }

        this.api.getDashboardStats().subscribe({
          next: (data) => {
            if (allowedBranchNames.length > 0) {
              const allowedNamesSet = new Set(allowedBranchNames);
              const allowedIdsSet = new Set(allowedBranchIds);
              if (data.coMetrics?.branchReports) {
                data.coMetrics.branchReports = data.coMetrics.branchReports.filter((br: any) => allowedIdsSet.has(br.id) || (br.name && allowedNamesSet.has(br.name.trim().toLowerCase())));
                if (data.coMetrics) {
                  data.coMetrics.totalBranches = data.coMetrics.branchReports.filter((br: any) => br.type === 'BRANCH').length;
                  data.coMetrics.totalHeadOffice = data.coMetrics.branchReports.filter((br: any) => br.type === 'DEPARTMENT').length;
                }
              }
              if (data.coMetrics?.awaitingActionQueue) {
                data.coMetrics.awaitingActionQueue = data.coMetrics.awaitingActionQueue.filter((item: any) => item.branch_name && allowedNamesSet.has(item.branch_name.trim().toLowerCase()));
              }
              if (data.ccoMetrics?.awaitingActionQueue) {
                data.ccoMetrics.awaitingActionQueue = data.ccoMetrics.awaitingActionQueue.filter((item: any) => item.branch_name && allowedNamesSet.has(item.branch_name.trim().toLowerCase()));
              }
              if (data.ccoMetrics) {
                const deptCount = branches.filter((b: any) => allowedIdsSet.has(b.id) && b.type === 'DEPARTMENT').length;
                const branchCount = branches.filter((b: any) => allowedIdsSet.has(b.id) && b.type === 'BRANCH').length;
                data.ccoMetrics.totalBranches = branchCount;
                data.ccoMetrics.totalHeadOffice = deptCount;
              }
            }
            this.stats = data;
            this.statusCards = [
              { label: 'Pending Timeline', value: data.assignments?.pendingTimeline ?? 0, color: '#eab308' },
              { label: 'Timeline Review', value: data.assignments?.timelineReview ?? 0, color: '#f97316' },
              { label: 'In Progress', value: data.assignments?.inProgress ?? 0, color: '#3b82f6' },
              { label: 'Review Pending', value: data.assignments?.reviewPending ?? 0, color: '#a855f7' },
              { label: 'Completed', value: data.assignments?.completed ?? 0, color: '#22c55e' },
            ];
            if (this.role === 'CCO' || this.role === 'ADMIN') {
              this.statusCards.push({ label: 'Escalated', value: data.assignments?.escalated ?? 0, color: '#ef4444' });
            }
            this.loading.set(false);
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error fetching dashboard stats:', err);
            this.loading.set(false);
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.api.getDashboardStats().subscribe({
          next: (data) => {
            this.stats = data;
            this.loading.set(false);
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading.set(false);
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getStatusLabel(status: string): string {
    if (!status) return '';
    const map: Record<string, string> = {
      'Pending_Timeline': 'Pending Timeline',
      'Timeline_Review': 'Timeline Review',
      'In_Progress': 'In Progress',
      'REVIEW_PENDING': 'Review Pending',
      'COMPLETED': 'Completed',
      'ESCALATED_TO_CCO': 'Escalated to CCO',
      'REJECTED': 'Rejected',
      'PENDING_RECOMPLIANCE': 'Pending Recompliance'
    };
    return map[status] || status;
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }
}
