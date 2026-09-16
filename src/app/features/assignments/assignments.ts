import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

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

  assignmentColumns: TableColumn[] = [
    { field: 'task_set_name', header: 'Task Set', type: 'text', width: '26%' },
    { field: 'task_set_type', header: 'Type', type: 'badge', width: '90px' },
    { field: 'frequency_label', header: 'Frequency', type: 'text', width: '110px' },
    { field: 'branch_name', header: 'Dept / Branch', type: 'text', width: '18%' },
    { field: 'progress_text', header: 'Progress', type: 'text', width: '100px' },
    { field: 'due_schedule_text', header: 'Due Schedule', type: 'text', width: '140px' },
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
      label: 'Timeline Details',
      icon: 'pi pi-list',
      visible: (row) => {
        if (this.isRowInternal(row) && this.isBranchUser) {
          return true;
        }
        return row.status !== 'Pending_Timeline' && row.status !== 'Timeline_Review';
      },
      command: (row) => this.goToDetails(row)
    }
  ];

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

    this.api.getAssignments(params).subscribe(res => {
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
      if (view === 'dept_tasks') {
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
            return bNamesList.includes(sName) || (ts.branch_id && sub.id === ts.branch_id);
          });

          if (matchingBranches.length === 0) return;

          subDeptTaskSets.push(ts);

          const totalT = parseInt(ts.task_count || (ts.tasks ? ts.tasks.length : 1), 10) || 1;
          let dateStr = '—';
          if (ts.start_date) {
            const d = new Date(ts.start_date);
            if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          } else if (ts.default_due_date) {
            const d = new Date(ts.default_due_date);
            if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }

          matchingBranches.forEach((branch: any) => {
            const alreadyExists = filteredAssignments.some((r: any) =>
              String(r.task_set_id) === String(ts.id) &&
              (String(r.branch_id) === String(branch.id) || (r.branch_name || '').trim().toLowerCase() === branch.name.trim().toLowerCase())
            );

            if (!alreadyExists) {
              syntheticAssignments.push({
                id: ts.id,
                task_set_id: ts.id,
                task_set_name: ts.name,
                task_set_type: ts.type || 'INTERNAL',
                type: ts.type || 'INTERNAL',
                frequency: ts.frequency || 'Weekly',
                frequency_label: this.frequencyLabelMap[String(ts.frequency)] || ts.frequency || 'Weekly',
                branch_id: branch.id,
                branch_name: branch.name,
                progress_text: `0 / ${totalT} (0%)`,
                total_tasks: totalT,
                completed_tasks: 0,
                due_schedule_text: dateStr,
                status: 'In_Progress',
                is_task_set_item: true
              });
            }
          });
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

      this.assignments.set(this.transformAssignments(paginatedData));
    });
  }

  private transformAssignments(rows: any[]): any[] {
    return rows.map(row => {
      const total = parseInt(row.total_tasks, 10) || 0;
      const completed = parseInt(row.completed_tasks, 10) || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const typeStr = (row.task_set_type || row.type || row.task_set?.type || '').toUpperCase();
      const isInternal = typeStr === 'INTERNAL' || (!row.circular_id && !row.circular_name && !row.circular_no);

      let rowStatus = row.status || (isInternal ? 'In_Progress' : 'Pending_Timeline');

      // Internal tasks do not require timeline proposals:
      if (isInternal) {
        const uStatus = String(rowStatus).toUpperCase();
        if (uStatus === 'PENDING_TIMELINE' || uStatus === 'PENDING TIMELINE' || uStatus === 'PENDING') {
          rowStatus = (total > 0 && completed === total) ? 'REVIEW_PENDING' : 'In_Progress';
        }
      }

      // If sub-department has completed all tasks and awaiting review
      if (total > 0 && completed === total && String(rowStatus).toUpperCase() !== 'COMPLETED') {
        rowStatus = 'REVIEW_PENDING';
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

      return {
        ...row,
        status: rowStatus,
        task_set_type: isInternal ? 'INTERNAL' : (row.task_set_type || row.type || 'REGULAR'),
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
      if (this.activeView()) {
        this.loadAssignments();
      }
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
    const id = row?.id ?? row;
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
