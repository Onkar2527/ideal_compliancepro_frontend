import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ComplianceApiService, ComplianceDocument } from '../../core/services/api/compliance-api.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { getCompliancePeriodInfo } from '../../shared/utils/compliance-period.util';

export interface DepartmentOption {
  label: string;
  value: number | null;
  name: string;
  type?: string;
  isHead?: boolean;
  isSub?: boolean;
  isBranch?: boolean;
  parentId?: number | null;
  parentName?: string;
}

@Component({
  selector: 'app-evidence',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    RippleModule,
    TagModule,
    TooltipModule,
    SelectModule,
    InputTextModule
  ],
  templateUrl: './evidence.component.html',
  styleUrls: ['./evidence.component.scss']
})
export class EvidenceComponent implements OnInit {
  private api = inject(ComplianceApiService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);

  evidenceList = signal<ComplianceDocument[]>([]);
  rawBranches = signal<any[]>([]);
  departments = signal<DepartmentOption[]>([]);
  loading = signal<boolean>(true);

  // User context
  currentUserId: number | null = null;
  currentUserRole = '';
  currentUserBranchId: number | null = null;
  currentUserBranchName = '';
  currentUserUserName = '';

  // Search & Filters
  searchTerm = '';
  selectedDeptFilter: number | null = null;
  selectedStatusFilter: string | null = null;
  selectedTaskSetFilter = signal<string | null>(null);
  selectedFrequencyFilter = signal<string | null>(null);

  // Pagination
  rowsPerPageOptions = [10, 25, 50, 100];

  // Preview Modal
  previewDialog = signal<boolean>(false);
  previewFileUrl = signal<string | null>(null);
  previewFileName = signal<string | null>(null);

  resolveFileUrl(url: string | null | undefined): string | null {
    return this.api.resolveFileUrl(url);
  }

  safePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const rawUrl = this.previewFileUrl();
    if (!rawUrl) return null;
    const fullUrl = this.resolveFileUrl(rawUrl);
    return fullUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl) : null;
  });

  readonly frequencyMap: Record<string, string> = {
    '0': 'Daily',
    '7': 'Weekly',
    '1': 'Fortnight',
    '2': 'Monthly',
    '3': 'Quarterly',
    '4': 'Semi-Annually',
    '5': 'Yearly',
    '6': '1 Time Use',
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'FORTNIGHT': 'Fortnight',
    'MONTHLY': 'Monthly',
    'QUARTERLY': 'Quarterly',
    'SEMI_ANNUALLY': 'Semi-Annually',
    'YEARLY': 'Yearly'
  };

  /**
   * Dynamically resolves the department family (Head Dept + all child Sub-Depts + sibling Sub-Depts)
   * for the logged in user, whether they are in IT, HR, Electrical, or any other department.
   */
  get allowedDepartmentIds(): Set<number> {
    const set = new Set<number>();
    const userDeptId = this.currentUserBranchId ? Number(this.currentUserBranchId) : null;
    if (!userDeptId) return set;

    set.add(userDeptId);

    const branches = this.rawBranches();
    const userBranch = branches.find(b => Number(b.id) === userDeptId);

    // If user belongs to a sub-department (has parent_id)
    if (userBranch?.parent_id) {
      const parentId = Number(userBranch.parent_id);
      set.add(parentId);
      // Include all sibling sub-departments under the same parent
      branches
        .filter(b => Number(b.parent_id) === parentId)
        .forEach(b => set.add(Number(b.id)));
    } else {
      // User is in a head department: include all child sub-departments
      branches
        .filter(b => Number(b.parent_id) === userDeptId)
        .forEach(b => set.add(Number(b.id)));
    }

    return set;
  }

  // Scoped list based on user role and department permissions
  scopedEvidenceList = computed(() => {
    let list = this.evidenceList().filter(d => !!d.is_evidence);
    if (!this.isElevatedUser && this.currentUserBranchId) {
      list = list.filter(d => this.isEvidenceVisibleToCurrentUser(d));
    }
    return list;
  });

  // KPI Metrics (strictly for visible evidence)
  totalCount = computed(() => this.filteredEvidenceList.length);
  activeCount = computed(() => this.filteredEvidenceList.filter(d => d.status === 'ACTIVE').length);
  taskSetsCount = computed(() => {
    const set = new Set<string>();
    this.filteredEvidenceList.forEach(d => {
      if (d.task_set_name) set.add(d.task_set_name);
    });
    return set.size;
  });
  departmentsCount = computed(() => {
    const set = new Set<string>();
    this.filteredEvidenceList.forEach(d => {
      if (d.department_name) set.add(d.department_name);
    });
    return set.size;
  });

  // Filter options: CCO/CO/Admin see all branches; department users see their own head & sub-depts
  deptFilterOptions = computed(() => {
    if (!this.isElevatedUser && this.currentUserBranchId) {
      const allowed = this.allowedDepartmentIds;
      const myDepts = this.departments().filter(d => d.value !== null && allowed.has(Number(d.value)));
      if (myDepts.length > 1) {
        return [{ label: 'All My Sub-Departments', value: null }, ...myDepts];
      }
      const userBranch = this.rawBranches().find(b => Number(b.id) === Number(this.currentUserBranchId));
      return myDepts.length > 0 ? myDepts : [{ label: userBranch?.name || 'My Department', value: Number(this.currentUserBranchId) }];
    }
    return [
      { label: 'All Branches / Departments', value: null },
      ...this.departments()
    ];
  });

  statusFilterOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Archived', value: 'ARCHIVED' }
  ];

  taskSetFilterOptions = computed(() => {
    const names = new Set<string>();
    this.scopedEvidenceList().forEach(d => {
      if (d.task_set_name && d.task_set_name.trim()) {
        names.add(d.task_set_name.trim());
      }
    });
    const sorted = Array.from(names).sort();
    return [
      { label: 'All Task Sets', value: null },
      ...sorted.map(name => ({ label: name, value: name }))
    ];
  });

  frequencyFilterOptions = computed(() => {
    const freqs = new Set<string>();
    this.scopedEvidenceList().forEach(d => {
      if (d.frequency) {
        const normalized = this.frequencyMap[String(d.frequency).toUpperCase().trim()] || String(d.frequency);
        freqs.add(normalized);
      }
    });
    const sorted = Array.from(freqs).sort();
    return [
      { label: 'All Frequencies', value: null },
      ...sorted.map(f => ({ label: f, value: f }))
    ];
  });

  /**
   * Determine if an evidence record is strictly allowed for the current logged-in user.
   * CCO, CO, Admin, Auditor see all evidence.
   * Department users (IT, HR, Electrical, etc.) see only evidence belonging to their department family.
   */
  isEvidenceVisibleToCurrentUser(doc: ComplianceDocument): boolean {
    if (!doc) return false;
    // CCO, CO, Admin, Auditor see all evidence across all departments
    if (this.isElevatedUser) return true;
    if (!this.currentUserBranchId && !this.currentUserId) return true;

    // 1. Direct user ownership (uploader or assignment user)
    if (this.currentUserId !== null) {
      if (doc.user_id !== null && doc.user_id !== undefined && Number(doc.user_id) === Number(this.currentUserId)) {
        return true;
      }
      if (doc.created_by_user_id !== null && doc.created_by_user_id !== undefined && Number(doc.created_by_user_id) === Number(this.currentUserId)) {
        return true;
      }
    }
    if (this.currentUserUserName && doc.user_name) {
      if (doc.user_name.toLowerCase().trim() === this.currentUserUserName.toLowerCase().trim()) {
        return true;
      }
    }

    // 2. Department family ID check (Head Dept, Sub-Dept, or Sibling Sub-Depts)
    const allowed = this.allowedDepartmentIds;
    if (doc.department_id !== null && doc.department_id !== undefined) {
      if (allowed.has(Number(doc.department_id))) {
        return true;
      }
    }

    // 3. Department name match
    const userBranch = this.rawBranches().find(b => Number(b.id) === Number(this.currentUserBranchId));
    const myDeptName = (this.currentUserBranchName || userBranch?.name || '').toLowerCase().trim();
    if (myDeptName && doc.department_name) {
      const docDept = doc.department_name.toLowerCase().trim();
      if (docDept === myDeptName || docDept.includes(myDeptName) || myDeptName.includes(docDept)) {
        return true;
      }
    }

    return false;
  }

  get filteredEvidenceList(): ComplianceDocument[] {
    let list = this.scopedEvidenceList();

    const term = this.searchTerm.trim().toLowerCase();
    const dept = this.selectedDeptFilter;
    const st = this.selectedStatusFilter;
    const taskSet = this.selectedTaskSetFilter();
    const freq = this.selectedFrequencyFilter();

    if (term) {
      list = list.filter(d =>
        (d.document_name && d.document_name.toLowerCase().includes(term)) ||
        (d.file_name && d.file_name.toLowerCase().includes(term)) ||
        (d.document_number && d.document_number.toLowerCase().includes(term)) ||
        (d.department_name && d.department_name.toLowerCase().includes(term)) ||
        (d.task_set_name && d.task_set_name.toLowerCase().includes(term)) ||
        (d.description && d.description.toLowerCase().includes(term)) ||
        (d.user_name && d.user_name.toLowerCase().includes(term))
      );
    }

    if (taskSet) {
      list = list.filter(d => d.task_set_name && d.task_set_name.trim().toLowerCase() === taskSet.trim().toLowerCase());
    }

    if (freq) {
      list = list.filter(d => {
        if (!d.frequency) return false;
        const normalized = this.frequencyMap[String(d.frequency).toUpperCase().trim()] || String(d.frequency);
        return normalized.toLowerCase() === freq.toLowerCase();
      });
    }

    if (dept !== null && dept !== undefined) {
      const selectedOption = this.departments().find(o => o.value === Number(dept));
      if (selectedOption?.isHead) {
        const subDeptIds = this.rawBranches()
          .filter(b => Number(b.parent_id) === Number(dept))
          .map(b => Number(b.id));
        const targetIds = new Set<number>([Number(dept), ...subDeptIds]);
        list = list.filter(d => d.department_id !== null && d.department_id !== undefined && targetIds.has(Number(d.department_id)));
      } else {
        list = list.filter(d => Number(d.department_id) === Number(dept));
      }
    }

    if (st !== null && st !== undefined) {
      list = list.filter(d => (d.status || 'ACTIVE') === st);
    }

    return list;
  }

  ngOnInit(): void {
    const cached = this.api.getCachedBranches();
    if (cached && cached.length > 0) {
      this.rawBranches.set(cached);
    }
    this.loadCurrentUser();
    this.loadDepartments();
    this.loadEvidence();
  }

  loadCurrentUser(): void {
    try {
      const u = this.auth.currentUser();
      if (u) {
        this.currentUserId = u.id ? Number(u.id) : null;
        this.currentUserRole = String(u.role || '').toUpperCase();
        this.currentUserBranchId = u.branch_id ? Number(u.branch_id) : (u.branchId ? Number(u.branchId) : null);
        this.currentUserBranchName = u.branch_name || u.branchName || '';
        this.currentUserUserName = u.username || u.name || '';
      }
    } catch (e) {
      console.warn('Could not load current user:', e);
    }
  }

  get isElevatedUser(): boolean {
    const r = this.currentUserRole;
    return (
      r === 'ADMIN' ||
      r === 'SUPERADMIN' ||
      r === 'CO' ||
      r === 'CO_REVIEWER' ||
      r === 'CCO' ||
      r === 'CCO_REVIEWER' ||
      r === 'AUDITOR' ||
      r === 'REVIEWER'
    );
  }

  loadDepartments(): void {
    this.api.getBranches().subscribe({
      next: (data) => {
        const raw = data || [];
        this.rawBranches.set(raw);
        const deptMap = new Map(raw.map((b: any) => [Number(b.id), b.name]));

        const mainDepts = raw.filter((b: any) => b.type === 'DEPARTMENT' && !b.parent_id);
        const subDepts = raw.filter((b: any) => b.type === 'DEPARTMENT' && !!b.parent_id);

        const options: DepartmentOption[] = [];

        for (const head of mainDepts) {
          options.push({
            label: `🏛️ ${head.name} (Head Dept)`,
            value: Number(head.id),
            name: head.name,
            type: 'DEPARTMENT',
            isHead: true,
            isSub: false,
            isBranch: false,
            parentId: null
          });

          const children = subDepts.filter((s: any) => Number(s.parent_id) === Number(head.id));
          for (const sub of children) {
            options.push({
              label: `　↳ ${sub.name} [Sub-Dept of ${head.name}]`,
              value: Number(sub.id),
              name: sub.name,
              type: 'DEPARTMENT',
              isHead: false,
              isSub: true,
              isBranch: false,
              parentId: Number(head.id),
              parentName: head.name
            });
          }
        }

        const handledSubIds = new Set(options.map(o => o.value));
        for (const sub of subDepts) {
          if (!handledSubIds.has(Number(sub.id))) {
            const pName = deptMap.get(Number(sub.parent_id)) || 'Parent Dept';
            options.push({
              label: `　↳ ${sub.name} [Sub-Dept of ${pName}]`,
              value: Number(sub.id),
              name: sub.name,
              type: 'DEPARTMENT',
              isHead: false,
              isSub: true,
              isBranch: false,
              parentId: Number(sub.parent_id),
              parentName: pName
            });
          }
        }

        this.departments.set(options);
      },
      error: () => this.departments.set([])
    });
  }

  loadEvidence(isRefresh = false): void {
    this.loading.set(true);
    let cachedEvidences = (this.api.getEvidenceDocuments() || []).filter(d => !!d.is_evidence);

    // Strictly filter cached evidences immediately so other departments are never shown on first frame
    if (!this.isElevatedUser && this.currentUserBranchId) {
      cachedEvidences = cachedEvidences.filter(d => this.isEvidenceVisibleToCurrentUser(d));
    }

    if (cachedEvidences.length > 0) {
      this.evidenceList.set(cachedEvidences);
      this.loading.set(false);
    }

    // Background sync from live task assignments
    this.syncEvidencesFromAssignments(isRefresh, cachedEvidences.length === 0);
  }

  private syncEvidencesFromAssignments(isRefresh: boolean, showLoadingSpinner: boolean): void {
    const userBranchId = this.currentUserBranchId;
    const isElevated = this.isElevatedUser;

    this.api.getAssignments({ limit: 40 }).pipe(catchError(() => of({ data: [] }))).subscribe({
      next: (res) => {
        const rawAssignments = res?.data || [];
        const allowedDeptIds = this.allowedDepartmentIds;

        let relevantAssignments = rawAssignments;
        if (!isElevated && userBranchId) {
          const userBranch = this.rawBranches().find(b => Number(b.id) === Number(userBranchId));

          // Retain assignments that match the user's department family, or company-wide sets where delegated tasks may be inside
          relevantAssignments = rawAssignments.filter((asg: any) => {
            const bId = asg.branch_id ? Number(asg.branch_id) : null;
            if (bId !== null && allowedDeptIds.has(bId)) return true;
            if (userBranch?.name && asg.branch_name && asg.branch_name.toLowerCase().trim() === userBranch.name.toLowerCase().trim()) return true;
            // General / Company-wide assignments (branch_id is null/empty)
            if (bId === null || bId === 0 || !asg.branch_id) return true;
            return false;
          });
        }

        if (relevantAssignments.length === 0) {
          this.loading.set(false);
          return;
        }

        const observables = relevantAssignments.slice(0, 30).map((asg: any) =>
          forkJoin({
            evidenceList: this.api.getAssignmentEvidence(asg.id).pipe(catchError(() => of([]))),
            tasksList: this.api.getAssignmentTasks(asg.id).pipe(catchError(() => of([])))
          }).pipe(
            map(({ evidenceList, tasksList }) => ({
              asg,
              evidenceList: Array.isArray(evidenceList) ? evidenceList : [],
              tasksList: Array.isArray(tasksList) ? tasksList : []
            })),
            catchError(() => of({ asg, evidenceList: [], tasksList: [] }))
          )
        );

        forkJoin(observables).subscribe({
          next: (results) => {
            const newEvDocs: ComplianceDocument[] = [];
            const seenUrls = new Set<string>();

            results.forEach(({ asg, evidenceList, tasksList }) => {
              const taskMap = new Map<number, any>();
              tasksList.forEach(t => {
                if (t.assignment_task_id) taskMap.set(Number(t.assignment_task_id), t);
                if (t.task_id) taskMap.set(Number(t.task_id), t);
              });

              evidenceList.forEach((ev: any) => {
                if (!ev.file_url) return;
                const normalizedUrl = ev.file_url.toLowerCase().trim();
                if (seenUrls.has(normalizedUrl)) return;
                seenUrls.add(normalizedUrl);

                const matchedTask = taskMap.get(Number(ev.assignment_task_id || ev.task_id));
                const targetDeptId = matchedTask?.sub_dept_id || matchedTask?.branch_id || ev.sub_dept_id || asg.branch_id;
                const targetDeptName = matchedTask?.sub_dept_name || matchedTask?.branch_name || ev.sub_dept_name || asg.branch_name;
                const fileName = this.cleanFileName(ev.file_name || ev.filename || ev.file_url.split('/').pop()?.split('?')[0]);
                const docName = ev.name ? this.cleanFileName(ev.name) : fileName;

                const doc: ComplianceDocument = {
                  id: 9000000 + Number(ev.id || Math.floor(Math.random() * 1000000)),
                  document_name: docName,
                  document_number: asg.task_set_name ? `TASK: ${asg.task_set_name}` : (ev.assignment_task_id ? `TASK-#${ev.assignment_task_id}` : 'TASK-EVIDENCE'),
                  issue_date: ev.created_at || ev.uploaded_at || asg.created_at || null,
                  created_at: ev.created_at || ev.uploaded_at || asg.created_at || new Date().toISOString(),
                  start_date: asg.start_date || null,
                  end_date: null,
                  department_id: targetDeptId ? Number(targetDeptId) : null,
                  department_name: targetDeptName || null,
                  user_id: ev.uploaded_by ? Number(ev.uploaded_by) : null,
                  user_name: ev.uploader_name || ev.uploaded_by_name || 'Branch Member',
                  file_url: ev.file_url,
                  file_name: fileName,
                  description: ev.remark || `Evidence for "${matchedTask?.task_title || matchedTask?.description || asg.task_set_name || 'Task Assignment'}"`,
                  status: 'ACTIVE',
                  access_level: 'PUBLIC',
                  is_evidence: true,
                  source_type: 'TASK_EVIDENCE',
                  task_set_id: asg.task_set_id ? Number(asg.task_set_id) : null,
                  task_set_name: asg.task_set_name || null,
                  frequency: asg.frequency ? String(asg.frequency) : null,
                  cycle_label: getCompliancePeriodInfo({
                    frequency: asg.frequency,
                    startDate: asg.start_date,
                    endDate: asg.end_date,
                    proposedTimeline: asg.proposed_timeline,
                    createdAt: ev.created_at || asg.created_at
                  })?.cycleLabel || null
                };

                // Dynamic filter: Elevated users see all; Department users see only their department family
                if (this.isElevatedUser || this.isEvidenceVisibleToCurrentUser(doc)) {
                  newEvDocs.push(doc);
                }
              });
            });

            if (newEvDocs.length > 0) {
              this.api.saveEvidenceDocuments(newEvDocs);
              this.evidenceList.set(newEvDocs);
            }
            this.loading.set(false);
            if (isRefresh) {
              this.notification.info('Evidence Management list refreshed');
            }
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  cleanFileName(rawName: string): string {
    if (!rawName) return 'evidence_document';
    let name = decodeURIComponent(rawName.trim().split('?')[0]);
    name = name.replace(/\\/g, '/').split('/').pop() || name;
    name = name.replace(/^\d{10,14}[-_]/, '');
    return name || 'evidence_document';
  }

  getFileIcon(filename: string | null | undefined): string {
    const f = (filename || '').toLowerCase();
    if (f.endsWith('.pdf')) return 'pi pi-file-pdf text-red-500';
    if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.webp')) return 'pi pi-image text-blue-500';
    if (f.endsWith('.xls') || f.endsWith('.xlsx') || f.endsWith('.csv')) return 'pi pi-file-excel text-green-500';
    if (f.endsWith('.doc') || f.endsWith('.docx')) return 'pi pi-file-word text-blue-600';
    return 'pi pi-file text-slate-500';
  }

  previewFile(url: string | null, name: string | null): void {
    if (!url) return;
    this.previewFileUrl.set(url);
    this.previewFileName.set(name || 'Evidence Preview');
    this.previewDialog.set(true);
  }

  async downloadFile(url: string | null, name?: string | null): Promise<void> {
    if (!url) return;
    await this.api.downloadFile(url, name);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedDeptFilter = null;
    this.selectedTaskSetFilter.set(null);
    this.selectedFrequencyFilter.set(null);
    this.selectedStatusFilter = null;
  }
}
