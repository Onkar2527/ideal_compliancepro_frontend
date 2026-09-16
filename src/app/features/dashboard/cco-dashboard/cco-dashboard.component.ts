import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComplianceApiService } from '../../../core/services/api/compliance-api.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-cco-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cco-dashboard.component.html',
  styleUrls: ['./cco-dashboard.component.scss']
})
export class CcoDashboardComponent {
  @Input() stats: any = null;
  @Input() role: string = '';

  constructor(
    private api: ComplianceApiService,
    private auth: AuthService
  ) {}

  get userDisplayName(): string {
    const user = this.auth.currentUser();
    return user?.full_name || user?.username || 'Executive';
  }

  get totalBranches(): number {
    return this.stats?.ccoMetrics?.totalBranches ?? 0;
  }

  get totalHeadOffice(): number {
    return this.stats?.ccoMetrics?.totalHeadOffice ?? 0;
  }

  get totalOperatingUnits(): number {
    return this.totalBranches + this.totalHeadOffice;
  }

  get pendingComplianceCount(): number {
    return this.stats?.ccoMetrics?.pendingCompliance ?? 0;
  }

  get totalOverdue(): number {
    return this.stats?.ccoMetrics?.totalOverdue ?? 0;
  }

  get totalAssignments(): number {
    return this.stats?.assignments?.total ?? 0;
  }

  get totalCompletedAssignments(): number {
    return this.stats?.assignments?.completed ?? 0;
  }

  get overallComplianceRate(): number {
    if (!this.totalAssignments || this.totalAssignments === 0) return 100;
    return Math.round((this.totalCompletedAssignments / this.totalAssignments) * 100);
  }

  get totalPenaltyAmount(): number {
    const reports = this.stats?.ccoMetrics?.authorityReports || [];
    return reports.reduce((acc: number, curr: any) => acc + (Number(curr.total_penalty) || 0), 0);
  }

  get totalCircularsCount(): number {
    const reports = this.stats?.ccoMetrics?.authorityReports || [];
    const countFromReports = reports.reduce((acc: number, curr: any) => acc + (Number(curr.applicable_circulars) || 0), 0);
    return countFromReports || (this.stats?.circulars ?? 0);
  }

  getAuthorityCompliancePercent(auth: any): number {
    if (!auth || !auth.total_tasks || auth.total_tasks === 0) {
      return auth?.completed_tasks > 0 ? 100 : 0;
    }
    return Math.min(100, Math.round((auth.completed_tasks / auth.total_tasks) * 100));
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }
}

