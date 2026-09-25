import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { DateFieldComponent } from '../../shared/components/form/date-field/date-field.component';
import { TableComponent, TableColumn, TableAction } from '../../shared/components/table/table.component';

import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableComponent,
    DialogModule,
    MultiSelectModule,
    ButtonModule,
    DateFieldComponent,
    SelectModule
  ],
  template: `
    <div class="card">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold">{{ pageTitle() }}</h5>
      </div>
        <!-- ASSIGNMENTS TAB -->
        <div *ngIf="activeTab() === 'ASSIGNMENTS'">
          <app-table
              [data]="assignments()"
              [columns]="assignmentColumns"
              [actions]="assignmentActions"
              [loading]="loading()"
              [showAddButton]="false"
              [showRefreshButton]="true"
              [paginator]="true"
              [rows]="limit"
              [totalRecords]="totalRecords()"
              [lazy]="true"
              (onLazyLoad)="handleLazyLoad($event)"
              (onRefresh)="loadAssignments()"
              (onSearch)="handleSearch($event)"
          >
            <!-- Project the Status filter inside the toolbar-actions slot -->
            <div toolbar-actions class="flex align-items-center gap-2">
              <p-select
                [options]="taskSetTypeFilterOptions"
                [ngModel]="selectedTaskSetTypeFilter()"
                (ngModelChange)="onTaskSetTypeFilterChange($event)"
                placeholder="Filter by Type"
                [showClear]="true"
                optionLabel="label"
                optionValue="value"
                class="w-full sm:w-12rem"
                styleClass="h-2.5rem flex align-items-center"
              ></p-select>
              <p-select
                [options]="frequencyFilterOptions"
                [ngModel]="selectedFrequencyFilter()"
                (ngModelChange)="onFrequencyFilterChange($event)"
                placeholder="Filter by Frequency"
                [showClear]="true"
                optionLabel="label"
                optionValue="value"
                class="w-full sm:w-12rem"
                styleClass="h-2.5rem flex align-items-center"
              ></p-select>
              <p-select
                [options]="statusFilterOptions"
                [ngModel]="selectedStatusFilter()"
                (ngModelChange)="onStatusFilterChange($event)"
                placeholder="Filter by Status"
                [showClear]="true"
                optionLabel="label"
                optionValue="value"
                class="w-full sm:w-12rem"
                styleClass="h-2.5rem flex align-items-center"
              ></p-select>
            </div>
          </app-table>
        </div>

        <!-- TASK SETS TAB REMOVED (Moved to Task Sets Master) -->
      </div>

    <!-- Propose Timeline Modal -->
    <p-dialog [visible]="showProposeModal()" (visibleChange)="showProposeModal.set($event)" [style]="{ width: '100%', 'max-width': '450px', 'margin': '1rem' }" header="Propose Timeline" [modal]="true" class="p-fluid">
      <ng-template pTemplate="content">
        <div class="flex flex-column gap-4 mt-3" *ngIf="selectedAssignment()">
          <p class="text-gray-700">Set a proposed completion date for <strong>{{ selectedAssignment()?.task_set_name }}</strong>.</p>
          
          <app-date-field
            label="Proposed Date"
            [field]="proposedDate"
            [required]="true"
            dateFormat="yy-mm-dd">
          </app-date-field>
        </div>
      </ng-template>
      <ng-template pTemplate="footer">
        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="showProposeModal.set(false)"></button>
        <button pButton pRipple label="Propose" icon="pi pi-check" class="p-button-text" [disabled]="!proposedDate()" (click)="proposeTimeline()"></button>
      </ng-template>
    </p-dialog>

    <!-- Assign to Branches Modal -->
    <p-dialog [visible]="showAssignModal()" (visibleChange)="showAssignModal.set($event)" [style]="{ width: '100%', 'max-width': '500px', 'margin': '1rem' }" header="Assign Task Set" [modal]="true" class="p-fluid">
      <ng-template pTemplate="content">
        <div class="flex flex-column gap-4 mt-3" *ngIf="selectedTaskSet()">
          <div class="bg-indigo-50 text-indigo-700 p-3 rounded text-sm">
            Assigning Task Set: <strong>{{ selectedTaskSet()?.name }}</strong>
          </div>
          
          <div class="flex flex-column gap-2">
            <label class="font-medium text-sm text-gray-700">Select Branches <span class="text-red-500">*</span></label>
            <p-multiSelect 
              [options]="branches()" 
              [(ngModel)]="selectedBranchIds" 
              optionLabel="name" 
              optionValue="id" 
              placeholder="Select Branches" 
              styleClass="w-full">
            </p-multiSelect>
          </div>
          
          <div class="flex flex-column gap-1">
            <app-date-field
              label="Proposed Timeline (Due Date)"
              [field]="proposedTimeline"
              [required]="true"
              dateFormat="yy-mm-dd">
            </app-date-field>
            <div class="flex align-items-center gap-1 mt-1">
              <span class="text-xs text-gray-500 mr-1">Quick Presets:</span>
              <button pButton type="button" label="+10 Days" class="p-button-xs p-button-outlined p-button-secondary text-xs py-1 px-2" (click)="setTimelineDays(10)"></button>
              <button pButton type="button" label="+20 Days" class="p-button-xs p-button-outlined p-button-secondary text-xs py-1 px-2" (click)="setTimelineDays(20)"></button>
              <button pButton type="button" label="+30 Days" class="p-button-xs p-button-outlined p-button-secondary text-xs py-1 px-2" (click)="setTimelineDays(30)"></button>
            </div>
          </div>
        </div>
      </ng-template>
      <ng-template pTemplate="footer">
        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="showAssignModal.set(false)"></button>
        <button pButton pRipple label="Assign" icon="pi pi-check" class="p-button-text" [disabled]="selectedBranchIds.length === 0 || !proposedTimeline()" (click)="createAssignments()"></button>
      </ng-template>
    </p-dialog>

  `
})
export class AssignmentsComponent implements OnInit {
  activeTab = signal<'ASSIGNMENTS' | 'TASK_SETS'>('ASSIGNMENTS');

  assignments = signal<any[]>([]);
  totalRecords = signal<number>(0);
  page = 1;
  limit = 10;
  searchQuery = '';

  // Status filter
  selectedStatusFilter = signal<string | null>(null);
  statusFilterOptions = [
    { label: 'Pending Timeline', value: 'Pending_Timeline' },
    { label: 'Timeline Review', value: 'Timeline_Review' },
    { label: 'In Progress', value: 'In_Progress' },
    { label: 'Review Pending', value: 'REVIEW_PENDING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Escalated to CCO', value: 'ESCALATED_TO_CCO' },
    { label: 'Pending Recompliance', value: 'PENDING_RECOMPLIANCE' },
    { label: 'Overdue', value: 'OVERDUE' }
  ];

  selectedFrequencyFilter = signal<string | null>(null);
  frequencyFilterOptions = [
    { label: 'Daily', value: '0' },
    { label: 'Weekly', value: '7' },
    { label: 'Fortnightly', value: '1' },
    { label: 'Monthly', value: '2' },
    { label: 'Quarterly', value: '3' },
    { label: 'Semi-Annual', value: '4' },
    { label: 'Yearly', value: '5' },
    { label: '1-Time', value: '6' }
  ];

  pageTitle = signal<string>('Compliances & Task Sets');
  activeView = signal<'my_assignments' | 'dept_tasks' | null>(null);
  allBranches = signal<any[]>([]);

  selectedTaskSetTypeFilter = signal<string | null>(null);
  taskSetTypeFilterOptions = [
    { label: 'Internal', value: 'INTERNAL' },
    { label: 'Circular Based', value: 'REGULAR' }
  ];

  readonly frequencyLabelMap: Record<string, string> = {
    '0': 'Daily',
    '1': 'Fortnightly',
    '2': 'Monthly',
    '3': 'Quarterly',
    '4': 'Semi-Annual',
    '5': 'Yearly',
    '6': '1-Time',
    '7': 'Weekly'
  };

  taskSets = signal<any[]>([]);
  branches = signal<any[]>([]);
  loading = signal<boolean>(true);

  // Propose Timeline Modal
  showProposeModal = signal<boolean>(false);
  selectedAssignment = signal<any>(null);
  proposedDate = signal<Date | null>(null);

  // Assign Modal
  showAssignModal = signal<boolean>(false);
  selectedTaskSet = signal<any>(null);
  selectedBranchIds: number[] = [];
  proposedTimeline = signal<Date | null>(null);

  setTimelineDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    this.proposedTimeline.set(d);
  }

  private auth = inject(AuthService);

  get userRole(): string {
    return this.auth.currentUser()?.role || '';
  }

  get isBranchUser(): boolean {
    return this.userRole === 'BRANCH' || this.userRole === 'BRANCH_USER' || this.userRole === 'DEPARTMENT';
  }

  get isReviewerUser(): boolean {
    return this.userRole === 'CCO' || this.userRole === 'CO' || this.userRole === 'ADMIN';
  }

  get isSubDepartmentUser(): boolean {
    const user: any = this.auth.currentUser();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    if (user.is_sub_department || user.branch_parent_id || user.parent_id) return true;
    const userName = String(user.username || user.name || '').toLowerCase();
    if (role === 'sub_department' || role.includes('sub_dept') || role.includes('subdepartment')) return true;
    if (userName.includes('sub_') || userName.includes('subdept') || userName.includes('sub_dep')) return true;
    const userBId = user.branch_id || user.branchId;
    if (!userBId) return false;
    const branches = this.allBranches().length > 0 ? this.allBranches() : this.api.getCachedBranches();
    if (!branches.length) return false;
    const userBranch = branches.find((b: any) => String(b.id) === String(userBId));
    return !!(userBranch && userBranch.parent_id);
  }

  assignmentColumns: TableColumn[] = [
    { field: 'task_set_display', header: 'Task Set', type: 'html', width: '22%', sortField: 'task_set_name' },
    { field: 'task_set_type', header: 'Type', type: 'badge', width: '90px' },
    { field: 'created_by_display', header: 'Created By', type: 'text', width: '140px' },
    { field: 'frequency_label', header: 'Frequency', type: 'text', width: '100px' },
    { field: 'branch_name', header: 'Dept / Branch', type: 'text', width: '15%' },
    { field: 'progress_text', header: 'Progress', type: 'text', width: '95px' },
    { field: 'due_schedule_text', header: 'Due Schedule', type: 'text', width: '130px' },
    { field: 'status', header: 'Status', type: 'badge', width: '110px' }
  ];

  taskSetColumns: TableColumn[] = [
    { field: 'name', header: 'Name', width: '40%' },
    { field: 'default_due_date', header: 'Default Due Date', type: 'date', pipeFormat: 'mediumDate', width: '20%' }
  ];

  assignmentActions: TableAction[] = [
    {
      label: 'View',
      icon: 'pi pi-eye',
      command: (row) => this.goToDetails(row)
    },
    {
      label: 'Propose Timeline',
      icon: 'pi pi-clock',
      visible: (row) => this.isPendingTimeline(row.status) && this.isBranchUser && !this.isRowInternal(row),
      command: (row) => this.openProposeModal(row)
    },
    {
      label: 'Timeline Review',
      icon: 'pi pi-pencil',
      visible: (row) => this.isPendingTimeline(row.status) && this.isBranchUser && !this.isRowInternal(row),
      command: (row) => this.goToDetails(row)
    },
    {
      label: 'Timeline Review',
      icon: 'pi pi-pencil',
      visible: (row) => this.isTimelineReview(row.status) && this.isReviewerUser && !this.isRowInternal(row),
      command: (row) => this.goToDetails(row)
    },
    {
      label: 'Review Submission',
      icon: 'pi pi-check',
      visible: (row) => !this.isRowInternal(row) && ((this.isPendingTimeline(row.status) && this.isBranchUser) || (this.isTimelineReview(row.status) && this.isReviewerUser)),
      command: (row) => this.goToDetails(row)
    },
    {
      label: 'Review Compliance',
      icon: 'pi pi-shield',
      visible: (row) => {
        if (this.isSubDepartmentUser) return false;
        const s = (row.status || '').toUpperCase();
        if (s !== 'REVIEW_PENDING' && s !== 'REVIEW PENDING') return false;

        // If created by CO (Regular Circular task set): ONLY Reviewers (CO/CCO) review compliance!
        // Branch user only views the submitted task set.
        if (!this.isBranchCreated(row)) {
          return this.isReviewerUser;
        }

        // If created by Branch / Internal: Branch user reviews sub-department compliance
        return this.isBranchUser;
      },
      command: (row) => this.goToDetails(row)
    },
    {
      label: 'Timeline Details',
      icon: 'pi pi-list',
      visible: (row) => {
        const s = (row.status || '').toUpperCase();
        if (s === 'REVIEW_PENDING' || s === 'REVIEW PENDING' || s === 'COMPLETED') return false;

        return row.status !== 'Pending_Timeline' && row.status !== 'Timeline_Review';
      },
      command: (row) => this.goToDetails(row)
    }
  ];

  isBranchCreated(row: any): boolean {
    if (!row) return false;
    const rawRole = (row.created_by_role || row.creator_role || '').toUpperCase();
    const rawName = (row.created_by_username || row.created_by_name || row.creator_name || '').toLowerCase();
    const createdByDisplay = row.created_by_display || '';

    // If explicitly created by CO, CCO or Admin:
    if (rawRole === 'CO' || rawRole === 'CCO' || rawRole === 'ADMIN') return false;
    if (rawName === 'co' || rawName === 'cco' || rawName === 'admin') return false;
    if (createdByDisplay.includes('(CO)') || createdByDisplay.includes('(CCO)')) return false;

    // If created by Branch / Department:
    if (['BRANCH_USER', 'BRANCH', 'DEPARTMENT', 'SUB_DEPARTMENT', 'BRANCH USER'].includes(rawRole)) return true;
    if (rawName.includes('branch') || rawName.includes('department') || rawName.includes('it_dept')) return true;
    if (createdByDisplay.includes('(Branch)')) return true;

    return false;
  }

  isPendingTimeline(status: string | undefined | null): boolean {
    const s = (status || '').toUpperCase();
    return s === 'PENDING_TIMELINE' || s === 'PENDING TIMELINE';
  }

  isTimelineReview(status: string | undefined | null): boolean {
    const s = (status || '').toUpperCase();
    return s === 'TIMELINE_REVIEW' || s === 'TIMELINE REVIEW';
  }

  isRowInternal(row: any): boolean {
    if (!row) return false;
    const taskSetType = (row.task_set_type || row.type || '').toUpperCase();
    if (taskSetType === 'INTERNAL') return true;
    if (taskSetType === 'REGULAR') return false;
    if (row.circular_id) return false;
    return false;
  }

  taskSetActions: TableAction[] = [
    {
      label: 'Assign to Branches',
      icon: 'pi pi-users',
      command: (row) => this.openAssignModal(row)
    }
  ];

  constructor(private api: ComplianceApiService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    const cached = this.api.getCachedBranches();
    if (cached && cached.length > 0) {
      this.allBranches.set(cached);
    }

    this.loadTaskSets();

    this.route.queryParams.subscribe(params => {
      const view = params['view'];
      const type = params['type'];

      if (view === 'dept_tasks') {
        this.activeView.set('dept_tasks');
        this.pageTitle.set('Department Tasks');
        this.selectedTaskSetTypeFilter.set(null);
      } else if (view === 'my_assignments') {
        this.activeView.set('my_assignments');
        this.pageTitle.set('My Assignments');
        this.selectedTaskSetTypeFilter.set(null);
      } else if (type === 'INTERNAL') {
        this.activeView.set(null);
        this.selectedTaskSetTypeFilter.set('INTERNAL');
        this.pageTitle.set('Internal Compliances');
      } else if (type === 'REGULAR' || type === 'CIRCULAR_BASED') {
        this.activeView.set(null);
        this.selectedTaskSetTypeFilter.set('REGULAR');
        this.pageTitle.set('Circular Compliances');
      } else {
        this.activeView.set(null);
        this.selectedTaskSetTypeFilter.set(null);
        this.pageTitle.set('Compliances & Task Sets');
      }

      this.page = 1;
      this.loadAssignments();
    });

    this.api.getBranches().subscribe(data => {
      this.allBranches.set(data || []);
      const topLevelBranches = (data || []).filter((b: any) => !b.parent_id);
      const user = this.auth.currentUser();
      let managedBranches = topLevelBranches;
      if (user && user.role === 'CO') {
        const userMapped = topLevelBranches.filter((b: any) => String(b.co_user_id) === String(user.id));
        if (userMapped.length > 0) {
          managedBranches = userMapped;
        } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
          const ids = new Set(user.managed_branch_ids);
          const filtered = topLevelBranches.filter((b: any) => ids.has(b.id));
          if (filtered.length > 0) managedBranches = filtered;
        }
      } else if (user && user.role === 'CCO') {
        const userMapped = topLevelBranches.filter((b: any) => String(b.cco_user_id) === String(user.id));
        if (userMapped.length > 0) {
          managedBranches = userMapped;
        } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
          const ids = new Set(user.managed_branch_ids);
          const filtered = topLevelBranches.filter((b: any) => ids.has(b.id));
          if (filtered.length > 0) managedBranches = filtered;
        }
      }
      this.branches.set(managedBranches);
      this.loadAssignments();
    });
  }

  loadAssignments() {
    const params: any = {
      limit: 1000,
    };
    if (this.searchQuery) params.search = this.searchQuery;
    const status = this.selectedStatusFilter();
    if (status) params.status = status;
    const frequency = this.selectedFrequencyFilter();
    if (frequency) params.frequency = frequency;
    const type = this.selectedTaskSetTypeFilter();
    if (type) params.task_set_type = type;

    const user = this.auth.currentUser();
    const currentBranches = this.branches();
    let allowedBranchNames: string[] = [];
    if (user && user.role === 'CO' && currentBranches.length > 0) {
      const userMapped = currentBranches.filter((b: any) => String(b.co_user_id) === String(user.id));
      if (userMapped.length > 0) {
        allowedBranchNames = userMapped.map((b: any) => (b.name || '').trim().toLowerCase());
      } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
        const ids = new Set(user.managed_branch_ids);
        allowedBranchNames = currentBranches.filter((b: any) => ids.has(b.id)).map((b: any) => (b.name || '').trim().toLowerCase());
      }
    } else if (user && user.role === 'CCO' && currentBranches.length > 0) {
      const userMapped = currentBranches.filter((b: any) => String(b.cco_user_id) === String(user.id));
      if (userMapped.length > 0) {
        allowedBranchNames = userMapped.map((b: any) => (b.name || '').trim().toLowerCase());
      } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
        const ids = new Set(user.managed_branch_ids);
        allowedBranchNames = currentBranches.filter((b: any) => ids.has(b.id)).map((b: any) => (b.name || '').trim().toLowerCase());
      }
    }

    this.loading.set(true);
    this.api.getAssignments(params).subscribe({
      next: (res) => {
        let data = res.data || [];
        if (allowedBranchNames.length > 0) {
          const allowedSet = new Set(allowedBranchNames);
          data = data.filter((r: any) => r.branch_name && allowedSet.has(r.branch_name.trim().toLowerCase()));
        }

        const user = this.auth.currentUser();
        const userBranchId = user?.branch_id ?? user?.branchId;
        const userBranchName = (user?.branch_name || user?.branchName || '').trim().toLowerCase();
        const allBranchesList = this.allBranches().length > 0 ? this.allBranches() : this.api.getCachedBranches();

        // Sub-departments belonging to this user's branch/department
        const mySubDepts = allBranchesList.filter((b: any) => userBranchId && String(b.parent_id) === String(userBranchId));
        const subDeptIds = new Set(mySubDepts.map((b: any) => b.id));
        const subDeptNames = new Set(mySubDepts.map((b: any) => (b.name || '').trim().toLowerCase()));

        const view = this.activeView();
        const isSubDeptUser = this.isSubDepartmentUser;

        if (isSubDeptUser) {
          // Check for any task sets where this sub-department has delegated tasks but no assignment row was returned by API
          (this.taskSets() || []).forEach((ts: any) => {
            const matchingSubTasks = (ts.tasks || []).filter((t: any) =>
              (t.sub_dept_id && userBranchId && String(t.sub_dept_id) === String(userBranchId)) ||
              (t.sub_dept_name && userBranchName && t.sub_dept_name.trim().toLowerCase() === userBranchName)
            );
            if (matchingSubTasks.length > 0) {
              const alreadyPresent = data.some((a: any) => Number(a.task_set_id) === Number(ts.id));
              if (!alreadyPresent) {
                const totalT = matchingSubTasks.length;
                const completedT = matchingSubTasks.filter((t: any) => t.compliance_status === 'COMPLIED' || t.compliance_status === 'NOT_COMPLIED' || t.status === 'COMPLETED' || !!t.remarks?.trim() || t.has_evidence).length;
                data.push({
                  id: -(ts.id * 1000 + Number(userBranchId || 1)),
                  task_set_id: ts.id,
                  task_set_name: ts.name,
                  task_set_type: ts.type || 'INTERNAL',
                  circular_id: ts.circular_id,
                  frequency: ts.frequency,
                  due_time: ts.due_time,
                  due_schedule: ts.due_schedule,
                  branch_id: userBranchId,
                  branch_name: user?.branch_name || user?.branchName,
                  is_overdue: false,
                  total_tasks: totalT,
                  completed_tasks: completedT,
                  proposed_timeline: ts.start_date || ts.default_due_date,
                  status: (totalT > 0 && completedT === totalT) ? 'COMPLETED' : 'In_Progress',
                  tasks: matchingSubTasks,
                  is_synthetic: true
                });
              }
            }
          });
        } else if (view === 'dept_tasks') {
          const filteredAssignments = data.filter((r: any) => {
            const rBranchName = (r.branch_name || '').trim().toLowerCase();
            const isForMySubDept = (r.branch_id && subDeptIds.has(r.branch_id)) ||
              (rBranchName && subDeptNames.has(rBranchName));
            return isForMySubDept;
          });

          const subDeptTaskSets: any[] = [];
          const syntheticAssignments: any[] = [];

          (this.taskSets() || []).forEach((ts: any) => {
            const bNamesList = (ts.branch_names || '')
              .split(',')
              .map((b: string) => b.trim().toLowerCase())
              .filter(Boolean);

            const matchingBranches = mySubDepts.filter((sub: any) => {
              const sName = (sub.name || '').trim().toLowerCase();
              const hasSubTasks = (ts.tasks || []).some((t: any) => String(t.sub_dept_id) === String(sub.id) || String(t.branch_id) === String(sub.id) || (t.sub_dept_name && t.sub_dept_name.trim().toLowerCase() === sName));
              return bNamesList.includes(sName) || (ts.branch_id && sub.id === ts.branch_id) || hasSubTasks;
            });

            if (matchingBranches.length > 0) {
              subDeptTaskSets.push(ts);
              matchingBranches.forEach((sub: any) => {
                const alreadyAssigned = filteredAssignments.some((a: any) =>
                  a.task_set_id === ts.id && (a.branch_id === sub.id || (a.branch_name || '').trim().toLowerCase() === (sub.name || '').trim().toLowerCase())
                );
                if (!alreadyAssigned) {
                  const sName = (sub.name || '').trim().toLowerCase();
                  const subTasks = (ts.tasks || []).filter((t: any) => String(t.sub_dept_id) === String(sub.id) || String(t.branch_id) === String(sub.id) || (t.sub_dept_name && t.sub_dept_name.trim().toLowerCase() === sName));
                  const targetTasksList = subTasks.length > 0 ? subTasks : (ts.tasks || []);
                  const totalT = targetTasksList.length;
                  const completedT = targetTasksList.filter((t: any) => t.compliance_status === 'COMPLIED' || t.compliance_status === 'NOT_COMPLIED' || t.status === 'COMPLETED' || !!t.remarks?.trim() || t.has_evidence).length;
                  syntheticAssignments.push({
                    id: -(ts.id * 1000 + sub.id),
                    task_set_id: ts.id,
                    task_set_name: ts.name,
                    task_set_type: ts.type || 'INTERNAL',
                    circular_id: ts.circular_id,
                    frequency: ts.frequency,
                    due_time: ts.due_time,
                    due_schedule: ts.due_schedule,
                    branch_id: sub.id,
                    branch_name: sub.name,
                    is_overdue: false,
                    total_tasks: totalT,
                    completed_tasks: completedT,
                    proposed_timeline: ts.start_date || ts.default_due_date,
                    status: (totalT > 0 && completedT === totalT) ? 'COMPLETED' : 'In_Progress',
                    tasks: targetTasksList,
                    is_synthetic: true
                  });
                }
              });
            }
          });

          data = [...filteredAssignments, ...syntheticAssignments];
        } else if (view === 'my_assignments') {
          // Show assignments assigned directly to this department (excludes sub-department assignments)
          data = data.filter((r: any) => {
            const rBranchName = (r.branch_name || '').trim().toLowerCase();
            const isSubDept = (r.branch_id && subDeptIds.has(r.branch_id)) ||
              (rBranchName && subDeptNames.has(rBranchName));
            return !isSubDept;
          });
        }

        // Filter by type if selected in dropdown
        const activeType = this.selectedTaskSetTypeFilter();
        if (activeType === 'INTERNAL') {
          data = data.filter((r: any) => (r.task_set_type || r.type || '').toUpperCase() === 'INTERNAL');
        } else if (activeType === 'REGULAR' || activeType === 'CIRCULAR_BASED') {
          data = data.filter((r: any) => (r.task_set_type || r.type || '').toUpperCase() !== 'INTERNAL');
        }

        const totalCount = data.length;
        this.totalRecords.set(totalCount);

        // Client-side paginate
        const startIndex = (this.page - 1) * this.limit;
        const paginatedData = data.slice(startIndex, startIndex + this.limit);

        // Fetch assignment tasks for visible rows so sub-department delegations and actual task counts are 100% accurate
        const realAssignmentRows = paginatedData.filter((r: any) => r.id && Number(r.id) > 0 && !r.is_synthetic);
        if (realAssignmentRows.length > 0) {
          const taskRequests = realAssignmentRows.map((r: any) =>
            this.api.getAssignmentTasks(Number(r.id)).pipe(
              map(tasks => ({ id: r.id, tasks })),
              catchError(() => of({ id: r.id, tasks: [] }))
            )
          );

          forkJoin(taskRequests).subscribe({
            next: (results) => {
              const tasksByAsgId = new Map<number, any[]>();
              results.forEach((res: any) => {
                if (res && res.id) {
                  tasksByAsgId.set(Number(res.id), res.tasks || []);
                }
              });

              paginatedData.forEach((r: any) => {
                if (r.id && tasksByAsgId.has(Number(r.id))) {
                  r.tasks = tasksByAsgId.get(Number(r.id));
                }
              });

              this.assignments.set(this.transformAssignments(paginatedData));
              this.loading.set(false);
            },
            error: () => {
              this.assignments.set(this.transformAssignments(paginatedData));
              this.loading.set(false);
            }
          });
        } else {
          this.assignments.set(this.transformAssignments(paginatedData));
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load assignments:', err);
        this.loading.set(false);
      }
    });
  }

  private transformAssignments(rows: any[]): any[] {
    const user: any = this.auth.currentUser();
    const userBranchId = user?.branch_id ?? user?.branchId;
    const userBranchName = (user?.branch_name || user?.branchName || '').trim().toLowerCase();
    const isSubDeptUser = this.isSubDepartmentUser;
    const view = this.activeView();
    const allBranchesList = this.allBranches().length > 0 ? this.allBranches() : this.api.getCachedBranches();
    const userBranchObj = (allBranchesList || []).find((b: any) => userBranchId && String(b.id) === String(userBranchId));
    const userBranchActualName = (userBranchObj?.name || '').trim().toLowerCase();

    return rows.map(row => {
      const ts = (this.taskSets() || []).find((s: any) => Number(s.id) === Number(row.task_set_id));
      const tsTasks = (row.tasks && row.tasks.length > 0) ? row.tasks : (ts?.tasks || []);

      let total = parseInt(row.total_tasks, 10) || (tsTasks.length || 0);
      let completed = parseInt(row.completed_tasks, 10) || 0;

      // Calculate task count based on sub-department delegation
      if (isSubDeptUser && tsTasks.length > 0) {
        const mySubTasks = tsTasks.filter((t: any) => {
          // 1. Match on sub_dept_id
          if (t.sub_dept_id && userBranchId && String(t.sub_dept_id) === String(userBranchId)) {
            return true;
          }
          // 2. Match on sub_dept_name
          if (t.sub_dept_name) {
            const sdn = String(t.sub_dept_name).trim().toLowerCase();
            if (userBranchName && sdn === userBranchName) return true;
            if (userBranchActualName && sdn === userBranchActualName) return true;
            const cleanSdn = sdn.replace(/[^a-z0-9]/g, '');
            const cleanUbn = userBranchName.replace(/[^a-z0-9]/g, '');
            const cleanUban = userBranchActualName.replace(/[^a-z0-9]/g, '');
            if (cleanUbn && (cleanSdn.includes(cleanUbn) || cleanUbn.includes(cleanSdn))) return true;
            if (cleanUban && (cleanSdn.includes(cleanUban) || cleanUban.includes(cleanSdn))) return true;
          }
          // 3. If direct assignment created for this sub-department and not delegated to another sub-dept
          const taskBranchId = t.branch_id || (tsTasks.length > 0 ? tsTasks[0].branch_id : row.branch_id);
          if (taskBranchId && userBranchId && String(taskBranchId) === String(userBranchId)) {
            return !t.sub_dept_id || String(t.sub_dept_id) === String(userBranchId);
          }
          return false;
        });

        if (mySubTasks.length > 0) {
          total = mySubTasks.length;
          completed = mySubTasks.filter((t: any) =>
            t.compliance_status === 'COMPLIED' ||
            t.compliance_status === 'NOT_COMPLIED' ||
            t.status === 'COMPLETED' ||
            !!t.remarks?.trim() ||
            !!t.temp_remarks?.trim() ||
            t.has_evidence ||
            !!t.evidence_file_name
          ).length;
        }
      } else if (view === 'dept_tasks' && tsTasks.length > 0) {
        const targetSubId = row.branch_id;
        const targetSubName = (row.branch_name || '').trim().toLowerCase();
        const subTasks = tsTasks.filter((t: any) =>
          (t.sub_dept_id && targetSubId && String(t.sub_dept_id) === String(targetSubId)) ||
          (t.branch_id && targetSubId && String(t.branch_id) === String(targetSubId)) ||
          (t.sub_dept_name && targetSubName && t.sub_dept_name.trim().toLowerCase() === targetSubName)
        );
        if (subTasks.length > 0) {
          total = subTasks.length;
          completed = subTasks.filter((t: any) =>
            t.compliance_status === 'COMPLIED' ||
            t.compliance_status === 'NOT_COMPLIED' ||
            t.status === 'COMPLETED' ||
            !!t.remarks?.trim() ||
            !!t.temp_remarks?.trim() ||
            t.has_evidence ||
            !!t.evidence_file_name
          ).length;
        }
      } else if (tsTasks.length > 0) {
        total = tsTasks.length;
        completed = tsTasks.filter((t: any) =>
          t.compliance_status === 'COMPLIED' ||
          t.compliance_status === 'NOT_COMPLIED' ||
          t.status === 'COMPLETED' ||
          !!t.remarks?.trim() ||
          !!t.temp_remarks?.trim() ||
          t.has_evidence ||
          !!t.evidence_file_name
        ).length;
      }

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const typeStr = (row.task_set_type || row.type || row.task_set?.type || '').toUpperCase();
      const isInternal = typeStr === 'INTERNAL' || (!row.circular_id && !row.circular_name && !row.circular_no);

      const isHeadUser = !isSubDeptUser && this.isBranchUser;
      const subDeptTasks = tsTasks.filter((t: any) => !!t.sub_dept_id);
      const submittedSubDeptTasks = subDeptTasks.filter((t: any) =>
        (t.compliance_status === 'COMPLIED' || t.compliance_status === 'NOT_COMPLIED' || !!t.remarks?.trim() || !!t.temp_remarks?.trim() || t.has_evidence || !!t.evidence_file_name || t.status === 'COMPLETED') &&
        t.review_status !== 'APPROVED'
      );

      let rowStatus = row.status || (isInternal ? 'In_Progress' : 'Pending_Timeline');

      // Internal tasks do not require timeline proposals or CO review (completed directly within department):
      if (isInternal) {
        const uStatus = String(rowStatus).toUpperCase();
        if (uStatus === 'PENDING_TIMELINE' || uStatus === 'PENDING TIMELINE' || uStatus === 'PENDING' || uStatus === 'REVIEW_PENDING' || uStatus === 'REVIEW PENDING') {
          rowStatus = (row.status?.toUpperCase() === 'COMPLETED') ? 'COMPLETED' : 'REVIEW_PENDING';
        }
      } else if (tsTasks.length > 0 && isHeadUser) {
        // For circular task sets: if sub-department tasks are still pending Head review/acceptance, keep status In_Progress
        const hasUnapprovedSubTasks = tsTasks.some((t: any) => !!t.sub_dept_id && t.review_status !== 'APPROVED');
        if (hasUnapprovedSubTasks && (String(rowStatus).toUpperCase() === 'REVIEW_PENDING' || String(rowStatus).toUpperCase() === 'REVIEW PENDING')) {
          rowStatus = 'In_Progress';
        }
      }

      // Check delegated tasks status (re-compliance flags):
      if (tsTasks.length > 0) {
        const hasNeedsRedo = tsTasks.some((t: any) => t.review_status === 'NEEDS_REDO');
        if (hasNeedsRedo) {
          rowStatus = 'PENDING_RECOMPLIANCE';
        }
      }

      // Format standard Date string dd/MM/yyyy
      let dateStr = '';
      if (row.proposed_timeline) {
        const d = new Date(row.proposed_timeline);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }

      // Combine Date with Time if available
      let dueScheduleText = dateStr || 'N/A';
      if (row.due_time) {
        dueScheduleText += ` ${row.due_time}`;
      }

      // Format created_by with origin tag
      const rawRole = (row.created_by_role || row.creator_role || ts?.created_by_role || ts?.creator_role || '').toUpperCase();
      const rawName = row.created_by_username || row.created_by_name || row.creator_name || ts?.created_by_username || ts?.created_by_name || ts?.creator_name || (row.created_by ? `User #${row.created_by}` : '');

      const isExplicitBranch = ['BRANCH_USER', 'BRANCH', 'DEPARTMENT', 'SUB_DEPARTMENT', 'BRANCH USER'].includes(rawRole) ||
        rawName.toLowerCase().includes('branch') ||
        rawName.toLowerCase().includes('department') ||
        rawName.toLowerCase().includes('it_dept');
      const isCCO = rawRole === 'CCO' || rawName.toLowerCase().includes('cco');

      let originTag = 'CO';
      if (isCCO) {
        originTag = 'CCO';
      } else if (rawRole === 'CO' || rawName.toLowerCase() === 'co') {
        originTag = 'CO';
      } else if (isExplicitBranch) {
        originTag = 'Branch';
      } else if (isInternal) {
        originTag = 'Branch';
      } else {
        // Regular circular compliance tasks default to CO
        originTag = 'CO';
      }

      const createdByDisplay = rawName ? `${rawName} (${originTag})` : originTag;
      const hasSubDeptSubmission = isHeadUser && submittedSubDeptTasks.length > 0 && rowStatus !== 'COMPLETED';

      const baseName = row.task_set_name || ts?.name || 'Task Set';
      let taskSetDisplay = `<span style="font-weight: 500; color: #1e293b;">${baseName}</span>`;

      if (hasSubDeptSubmission) {
        const count = submittedSubDeptTasks.length;
        const badgeLabel = count === 1 ? 'Sub-Dept Submitted' : `${count} Sub-Depts Submitted`;
        taskSetDisplay = `
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
            <span style="font-weight: 600; color: #0f172a; line-height: 1.3;">${baseName}</span>
            <span class="subdept-pulse-badge" title="Sub-department compliance has been submitted and is awaiting your review">
              <span class="pulse-dot"></span>
              <span>${badgeLabel}</span>
            </span>
          </div>
        `;
      }

      return {
        ...row,
        task_set_display: taskSetDisplay,
        status: rowStatus,
        task_set_type: isInternal ? 'INTERNAL' : (row.task_set_type || row.type || 'REGULAR'),
        created_by_display: createdByDisplay,
        frequency_label: this.frequencyLabelMap[String(row.frequency)?.trim()] ?? row.frequency ?? '—',
        progress_text: total > 0 ? `${completed} / ${total} (${pct}%)` : '—',
        due_schedule_text: dueScheduleText
      };
    });
  }

  handleLazyLoad(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    if (event.globalFilter !== undefined) {
      this.searchQuery = event.globalFilter;
    }
    this.loadAssignments();
  }

  handlePageChange(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadAssignments();
  }

  handleSearch(query: string) {
    this.searchQuery = query;
    this.page = 1;
    this.loadAssignments();
  }

  onStatusFilterChange(value: string | null) {
    this.selectedStatusFilter.set(value);
    this.page = 1;
    this.loadAssignments();
  }

  onFrequencyFilterChange(value: string | null) {
    this.selectedFrequencyFilter.set(value);
    this.page = 1;
    this.loadAssignments();
  }

  onTaskSetTypeFilterChange(value: string | null) {
    this.selectedTaskSetTypeFilter.set(value);
    if (value === 'INTERNAL') {
      this.pageTitle.set('Department Tasks (Internal Compliances)');
    } else if (value === 'REGULAR' || value === 'CIRCULAR_BASED') {
      this.pageTitle.set('My Assignments (Circular Compliances)');
    } else {
      this.pageTitle.set('Compliances & Task Sets');
    }
    this.page = 1;
    this.loadAssignments();
  }

  loadTaskSets() {
    this.api.getTaskSets().subscribe(data => {
      this.taskSets.set(data || []);
      this.loadAssignments();
    });
  }

  openProposeModal(assignment: any) {
    this.selectedAssignment.set(assignment);
    if (assignment.proposed_timeline) {
      this.proposedDate.set(new Date(assignment.proposed_timeline));
    } else {
      this.proposedDate.set(null);
    }
    this.showProposeModal.set(true);
  }

  proposeTimeline() {
    const asg = this.selectedAssignment();
    const dt = this.proposedDate();
    if (!asg || !dt) return;

    // Format date properly using local timezone to avoid day shift
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.api.proposeTimeline(asg.id, dateStr).subscribe(() => {
      this.showProposeModal.set(false);
      this.loadAssignments();
      alert('Timeline proposed successfully!');
    });
  }

  acceptTimeline(assignment: any) {
    this.api.acceptTimeline(assignment.id).subscribe(() => {
      this.loadAssignments();
    });
  }

  goToDetails(row: any) {
    const id = (row?.is_synthetic || (typeof row?.id === 'number' && row.id < 0)) ? (row.task_set_id || row.id) : (row?.id ?? row);
    if (id) {
      const queryParams: any = {};
      if (row?.branch_id) queryParams.branch_id = row.branch_id;
      if (row?.branch_name) queryParams.branch_name = row.branch_name;
      this.router.navigate(['/assignments', id], { queryParams: Object.keys(queryParams).length ? queryParams : undefined });
    }
  }

  goToTasks(assignmentId: number) {
    this.router.navigate(['/assignments', assignmentId]);
  }

  openAssignModal(ts: any) {
    this.selectedTaskSet.set(ts);
    this.selectedBranchIds = [];
    if (ts.default_due_date) {
      this.proposedTimeline.set(new Date(ts.default_due_date));
    } else {
      const d20 = new Date();
      d20.setDate(d20.getDate() + 20);
      this.proposedTimeline.set(d20);
    }
    this.showAssignModal.set(true);
  }

  createAssignments() {
    const ts = this.selectedTaskSet();
    const dt = this.proposedTimeline();

    if (this.selectedBranchIds.length === 0 || !dt || !ts) {
      return;
    }

    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const formattedTimeline = `${year}-${month}-${day}`;

    const user = this.auth.currentUser();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? storedUser?.id ?? storedUser?.user_id ?? storedUser?.userId;
    const userName = user?.name || user?.full_name || user?.fullName || user?.username || storedUser?.name || storedUser?.full_name || storedUser?.username;
    const userRole = user?.role || user?.designation || storedUser?.role || storedUser?.designation;

    const payload: any = {
      task_set_id: ts.id,
      branch_ids: this.selectedBranchIds,
      proposed_timeline: formattedTimeline,
      created_by: userId || undefined,
      created_by_id: userId || undefined,
      created_by_user_id: userId || undefined,
      user_id: userId || undefined,
      created_by_role: userRole || undefined,
      creator_role: userRole || undefined,
      created_by_name: userName || undefined,
      creator_name: userName || undefined,
      created_by_username: userName || undefined
    };

    this.api.createAssignment(payload).subscribe(() => {
      this.showAssignModal.set(false);
      this.loadAssignments();
      this.activeTab.set('ASSIGNMENTS');
      alert('Assignments created successfully!');
    });
  }
}
