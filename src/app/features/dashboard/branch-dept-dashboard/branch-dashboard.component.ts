import { Component, Input, inject, computed, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ComplianceApiService } from '../../../core/services/api/compliance-api.service';

export interface SubDeptTaskStats {
  total: number;
  completed: number;
  pending: number;
  reviewPending: number;
}

export interface DepartmentTaskStatItem {
  id: number;
  name: string;
  isParent: boolean;
  typeLabel: string;
  total: number;
  completed: number;
  pending: number;
  reviewPending: number;
  icon: string;
  theme: string;
  queryParams: any;
  completedQueryParams: any;
  pendingQueryParams: any;
  reviewQueryParams: any;
}

@Component({
  selector: 'app-branch-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './branch-dashboard.component.html',
  styleUrls: ['./branch-dashboard.component.scss']
})
export class BranchDashboardComponent implements OnInit, OnChanges {
  @Input() stats: any = null;
  @Input() statusCards: { label: string; value: number; color: string }[] = [];
  @Input() role: string = '';

  private auth = inject(AuthService);
  private api = inject(ComplianceApiService);
  private cdr = inject(ChangeDetectorRef);

  subDeptStats: SubDeptTaskStats = {
    total: 0,
    completed: 0,
    pending: 0,
    reviewPending: 0
  };

  departmentTaskStats: DepartmentTaskStatItem[] = [];

  recentWorksheets: any[] = [];
  private isLoadingSubDept = false;

  ngOnInit() {
    this.initRecentWorksheets();
    this.loadSubDeptData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['stats']) {
      this.initRecentWorksheets();
      this.loadSubDeptData();
    }
  }

  private initRecentWorksheets() {
    if (this.stats?.recentAssignments && Array.isArray(this.stats.recentAssignments)) {
      this.recentWorksheets = this.stats.recentAssignments.map((a: any) => ({ ...a }));
    }
  }

  loadSubDeptData() {
    if (this.isLoadingSubDept) return;
    this.isLoadingSubDept = true;

    const u = this.currentUser;
    const userBranchId = u?.branch_id ?? u?.branchId;
    const headDeptName = this.branchDisplayName || 'IT DEPARTMENT';

    this.api.getBranches().pipe(
      catchError(() => of([]))
    ).subscribe((branches: any[]) => {
      const childBranches = (branches || []).filter((b: any) =>
        userBranchId && String(b.parent_id) === String(userBranchId)
      );
      const childBranchIds = new Set<number>(childBranches.map((b: any) => Number(b.id)));
      const childBranchNames = new Set<string>(childBranches.map((b: any) => (b.name || '').trim().toLowerCase()));

      // 1. Gather all unique assignments to scan (from recentAssignments + API call)
      const assignmentMap = new Map<number, any>();
      (this.recentWorksheets || []).forEach(a => {
        if (a.id) assignmentMap.set(Number(a.id), a);
      });

      this.api.getAssignments({ limit: 1000, branch_id: userBranchId }).pipe(
        catchError(() => of({ data: [] }))
      ).subscribe((res: any) => {
        const fetched = res?.data || [];
        fetched.forEach((a: any) => {
          if (a.id && !assignmentMap.has(Number(a.id))) {
            assignmentMap.set(Number(a.id), a);
          }
        });

        const allAssignments = Array.from(assignmentMap.values());
        if (allAssignments.length === 0) {
          this.isLoadingSubDept = false;
          this.cdr.markForCheck();
          return;
        }

        // 2. Fetch tasks for each assignment in parallel
        const taskObservables = allAssignments.map(a =>
          this.api.getAssignmentTasks(a.id).pipe(catchError(() => of([])))
        );

        forkJoin(taskObservables).subscribe({
          next: (results) => {
            const subDeptMap = new Map<string, DepartmentTaskStatItem>();
            const subDeptThemes = ['theme-indigo', 'theme-purple', 'theme-cyan', 'theme-orange', 'theme-emerald'];

            // Seed known child branches from DB
            childBranches.forEach((cb: any, cIdx: number) => {
              const cName = (cb.name || '').trim();
              if (cName) {
                const cKey = cName.toLowerCase();
                const theme = subDeptThemes[cIdx % subDeptThemes.length];
                subDeptMap.set(cKey, {
                  id: Number(cb.id),
                  name: cName,
                  isParent: false,
                  typeLabel: 'Sub-Dept',
                  total: 0,
                  completed: 0,
                  pending: 0,
                  reviewPending: 0,
                  icon: 'pi pi-sitemap',
                  theme,
                  queryParams: { view: 'dept_tasks', branch: cName, sub_dept: 'all' },
                  completedQueryParams: { view: 'dept_tasks', branch: cName, sub_dept: 'COMPLETED' },
                  pendingQueryParams: { view: 'dept_tasks', branch: cName, sub_dept: 'PENDING' },
                  reviewQueryParams: { view: 'dept_tasks', branch: cName, sub_dept: 'REVIEW_PENDING' }
                });
              }
            });

            allAssignments.forEach((a, idx) => {
              const tasks = results[idx] || [];
              let aTotal = 0;
              let aCompleted = 0;
              let aPending = 0;
              let aReviewPending = 0;
              const aSubDeptNames = new Set<string>();

              tasks.forEach((t: any) => {
                // Determine if task is assigned to a sub-department
                let targetSubDeptName: string | null = null;
                let targetSubDeptId: number | null = null;

                if (t.sub_dept_id && String(t.sub_dept_id) !== String(userBranchId)) {
                  targetSubDeptId = Number(t.sub_dept_id);
                  const bObj = (branches || []).find((b: any) => Number(b.id) === targetSubDeptId);
                  targetSubDeptName = bObj ? (bObj.name || '').trim() : (t.sub_dept_name || `Sub-Dept ${targetSubDeptId}`).trim();
                } else if (t.sub_dept_name && t.sub_dept_name.trim().toLowerCase() !== headDeptName.trim().toLowerCase()) {
                  targetSubDeptName = t.sub_dept_name.trim();
                  const bObj = (branches || []).find((b: any) => (b.name || '').trim().toLowerCase() === targetSubDeptName!.toLowerCase());
                  if (bObj) targetSubDeptId = Number(bObj.id);
                } else if (a.branch_id && childBranchIds.has(Number(a.branch_id))) {
                  targetSubDeptId = Number(a.branch_id);
                  const bObj = (branches || []).find((b: any) => Number(b.id) === targetSubDeptId);
                  targetSubDeptName = bObj ? (bObj.name || '').trim() : (a.branch_name || `Sub-Dept ${targetSubDeptId}`).trim();
                }

                const isApproved = t.review_status === 'APPROVED';
                const hasSubSubmission = !!(t.remarks?.trim() || t.has_evidence || t.evidence_url || t.compliance_status === 'COMPLIED' || t.status === 'COMPLETED');

                if (targetSubDeptName) {
                  // Sub-department task!
                  aTotal++;
                  aSubDeptNames.add(targetSubDeptName);

                  const sKey = targetSubDeptName.toLowerCase();
                  let subItem = subDeptMap.get(sKey);
                  if (!subItem) {
                    const theme = subDeptThemes[subDeptMap.size % subDeptThemes.length];
                    subItem = {
                      id: targetSubDeptId || 0,
                      name: targetSubDeptName,
                      isParent: false,
                      typeLabel: 'Sub-Dept',
                      total: 0,
                      completed: 0,
                      pending: 0,
                      reviewPending: 0,
                      icon: 'pi pi-sitemap',
                      theme,
                      queryParams: { view: 'dept_tasks', branch: targetSubDeptName, sub_dept: 'all' },
                      completedQueryParams: { view: 'dept_tasks', branch: targetSubDeptName, sub_dept: 'COMPLETED' },
                      pendingQueryParams: { view: 'dept_tasks', branch: targetSubDeptName, sub_dept: 'PENDING' },
                      reviewQueryParams: { view: 'dept_tasks', branch: targetSubDeptName, sub_dept: 'REVIEW_PENDING' }
                    };
                    subDeptMap.set(sKey, subItem);
                  }

                  subItem.total++;
                  if (isApproved) {
                    subItem.completed++;
                    aCompleted++;
                  } else if (t.review_status === 'NEEDS_REDO') {
                    subItem.pending++;
                    aPending++;
                  } else if (hasSubSubmission || t.review_status === 'IN_REVIEW' || t.review_status === 'REVIEW_PENDING' || t.status === 'REVIEW_PENDING') {
                    subItem.reviewPending++;
                    aReviewPending++;
                  } else {
                    subItem.pending++;
                    aPending++;
                  }
                }
              });

              a.sub_dept_stats = {
                total: aTotal,
                completed: aCompleted,
                pending: aPending,
                reviewPending: aReviewPending,
                subDeptNames: Array.from(aSubDeptNames)
              };

              // Also update the matching object in recentWorksheets if present
              const recentMatch = this.recentWorksheets.find(rw => Number(rw.id) === Number(a.id));
              if (recentMatch) {
                recentMatch.sub_dept_stats = a.sub_dept_stats;
              }
            });

            // Gather active sub-departments (those with tasks or configured child branches)
            const activeSubDepts = Array.from(subDeptMap.values()).filter(s => s.total > 0 || childBranchIds.has(s.id));

            // Aggregate sub-department statistics
            let subTotal = 0;
            let subCompleted = 0;
            let subPending = 0;
            let subReviewPending = 0;
            activeSubDepts.forEach(s => {
              subTotal += s.total;
              subCompleted += s.completed;
              subPending += s.pending;
              subReviewPending += s.reviewPending;
            });
            this.subDeptStats = { total: subTotal, completed: subCompleted, pending: subPending, reviewPending: subReviewPending };

            // Sub-Department task stats list: only Sub-Departments as requested
            this.departmentTaskStats = [...activeSubDepts];
            this.isLoadingSubDept = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.isLoadingSubDept = false;
            this.cdr.markForCheck();
          }
        });
      });
    });
  }

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

  get totalTasks(): number {
    return this.stats?.tasks || 0;
  }

  get pendingTasks(): number {
    if (this.stats?.pendingTasks !== undefined && this.stats?.pendingTasks !== null) {
      return this.stats.pendingTasks;
    }
    const derived = this.totalTasks - this.completedTasks;
    return derived > 0 ? derived : 0;
  }

  get completedTasks(): number {
    if (this.stats?.completedTasks !== undefined && this.stats?.completedTasks !== null) {
      return this.stats.completedTasks;
    }
    if (this.stats?.approvedTasks !== undefined && this.stats?.approvedTasks !== null) {
      return this.stats.approvedTasks;
    }
    const derived = this.totalTasks - this.pendingTasks;
    return derived > 0 ? derived : 0;
  }

  get overdueTasks(): number {
    return this.stats?.overdueTasks || this.stats?.ccoMetrics?.totalOverdue || 0;
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
    const total = this.totalTasks;
    const completed = this.completedTasks;
    if (!total || total === 0) {
      const aTotal = this.totalAssignments;
      const aCompleted = this.completedAssignments;
      if (!aTotal || aTotal === 0) return 0;
      return Math.min(100, Math.round((aCompleted / aTotal) * 100));
    }
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
