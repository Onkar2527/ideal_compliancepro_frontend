import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComplianceApiService } from '../../../core/services/api/compliance-api.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-co-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './co-dashboard.component.html',
  styleUrls: ['./co-dashboard.component.scss']
})
export class CoDashboardComponent {
  @Input() stats: any = null;
  @Input() role: string = '';

  private api = inject(ComplianceApiService);
  private auth = inject(AuthService);

  get currentUser(): any {
    return this.auth.currentUser();
  }

  get userDisplayName(): string {
    const u = this.currentUser;
    return u?.name || u?.username || 'Compliance Officer';
  }

  get totalMappedUnits(): number {
    return (this.stats?.coMetrics?.totalBranches ?? 0) + (this.stats?.coMetrics?.totalHeadOffice ?? 0);
  }

  get reviewPendingCount(): number {
    return this.stats?.assignments?.reviewPending ?? 0;
  }

  get inProgressCount(): number {
    return this.stats?.assignments?.inProgress ?? 0;
  }

  get overdueCount(): number {
    return this.stats?.coMetrics?.totalOverdue ?? 0;
  }

  get completedCount(): number {
    return this.stats?.assignments?.completed ?? 0;
  }

  get totalAssignments(): number {
    return this.stats?.assignments?.total ?? 0;
  }

  get overallComplianceRate(): number {
    const total = this.totalAssignments;
    const completed = this.completedCount;
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }

  getBranchCompliancePercent(br: any): number {
    const total = br.total_assignments || 0;
    const completed = br.completed_assignments || 0;
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  }
}
