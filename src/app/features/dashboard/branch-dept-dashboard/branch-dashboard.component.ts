import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-branch-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './branch-dashboard.component.html',
  styleUrls: ['./branch-dashboard.component.scss']
})
export class BranchDashboardComponent {
  @Input() stats: any = null;
  @Input() statusCards: { label: string; value: number; color: string }[] = [];
  @Input() role: string = '';

  private auth = inject(AuthService);

  get currentUser(): any {
    return this.auth.currentUser();
  }

  get userDisplayName(): string {
    const u = this.currentUser;
    return u?.name || u?.username || 'Department User';
  }

  get branchDisplayName(): string {
    const u = this.currentUser;
    return u?.branch_name || u?.branchName || 'Department / Branch Unit';
  }

  get totalAssignments(): number {
    return this.stats?.assignments?.total || 0;
  }

  get completedAssignments(): number {
    return this.stats?.assignments?.completed || 0;
  }

  get inProgressAssignments(): number {
    return this.stats?.assignments?.inProgress || 0;
  }

  get reviewPendingAssignments(): number {
    return this.stats?.assignments?.reviewPending || 0;
  }

  get recomplianceAssignments(): number {
    return this.stats?.assignments?.rejected || 0;
  }

  get pendingTimelineAssignments(): number {
    return this.stats?.assignments?.pendingTimeline || 0;
  }

  get complianceRate(): number {
    const total = this.totalAssignments;
    const completed = this.completedAssignments;
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
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
      'REJECTED': 'Pending Recompliance',
      'PENDING_RECOMPLIANCE': 'Pending Recompliance'
    };
    return map[status] || status;
  }
}
