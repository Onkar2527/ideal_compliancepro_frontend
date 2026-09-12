import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
        <h5 class="m-0 text-xl font-semibold">Compliances & Task Sets</h5>
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
          
          <app-date-field
            label="Proposed Timeline (Due Date)"
            [field]="proposedTimeline"
            [required]="true"
            dateFormat="yy-mm-dd">
          </app-date-field>
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
    { label: 'Daily',        value: '0' },
    { label: 'Weekly',       value: '7' },
    { label: 'Fortnightly',  value: '1' },
    { label: 'Monthly',      value: '2' },
    { label: 'Quarterly',    value: '3' },
    { label: 'Semi-Annual',  value: '4' },
    { label: 'Yearly',       value: '5' },
    { label: '1-Time',       value: '6' }
  ];

  selectedTaskSetTypeFilter = signal<string | null>(null);
  taskSetTypeFilterOptions = [
    { label: 'Internal', value: 'INTERNAL' },
    { label: 'Circular Based', value: 'CIRCULAR_BASED' }
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
    { field: 'task_set_name',     header: 'Task Set',       type: 'text',   width: '26%' },
    { field: 'task_set_type',     header: 'Type',           type: 'badge',  width: '90px' },
    { field: 'frequency_label',   header: 'Frequency',      type: 'text',   width: '110px' },
    { field: 'branch_name',       header: 'Dept / Branch',  type: 'text',   width: '14%' },
    { field: 'progress_text',     header: 'Progress',       type: 'text',   width: '90px', align: 'center' },
    { field: 'due_schedule_text', header: 'Due Schedule',   type: 'text',   width: '140px' },
    { field: 'status',            header: 'Status',         type: 'status', width: '160px' }
  ];

  taskSetColumns: TableColumn[] = [
    { field: 'name', header: 'Name', width: '40%' },
    { field: 'default_due_date', header: 'Default Due Date', type: 'date', pipeFormat: 'mediumDate', width: '20%' }
  ];

  assignmentActions: TableAction[] = [
    {
      label: 'Propose Timeline',
      icon: 'pi pi-calendar',
      visible: (row) => this.isPendingTimeline(row.status) && this.isBranchUser && !this.isRowInternal(row),
      command: (row) => {
        if (this.isPendingTimeline(row.status)) {
          this.openProposeModal(row);
        }
      }
    },
    {
      label: 'Setup Timeline',
      icon: 'pi pi-calendar-plus',
      visible: (row) => this.isPendingTimeline(row.status) && this.isBranchUser && !this.isRowInternal(row),
      command: (row) => {
        this.goToTasks(row.id);
      }
    },
    {
      label: 'Review Timeline',
      icon: 'pi pi-calendar-minus',
      visible: (row) => this.isTimelineReview(row.status) && this.isReviewerUser && !this.isRowInternal(row),
      command: (row) => {
        this.goToTasks(row.id);
      }
    },
    {
      label: 'Accept Timeline',
      icon: 'pi pi-check',
      styleClass: 'text-green-600',
      visible: (row) => !this.isRowInternal(row) && ((this.isPendingTimeline(row.status) && this.isBranchUser) || (this.isTimelineReview(row.status) && this.isReviewerUser)),
      command: (row) => {
        if (this.isPendingTimeline(row.status) || this.isTimelineReview(row.status)) {
          this.acceptTimeline(row);
        }
      }
    },
    {
      label: 'Do Compliance',
      icon: 'pi pi-list',
      visible: (row) => {
        const s = row.status?.toUpperCase();
        if (this.isRowInternal(row) && this.isBranchUser) {
          return s === 'PENDING_TIMELINE' || s === 'IN_PROGRESS' || s === 'REJECTED' || s === 'PENDING_RECOMPLIANCE' || s === 'OVERDUE';
        }
        return (s === 'IN_PROGRESS' || s === 'REJECTED' || s === 'PENDING_RECOMPLIANCE' || s === 'OVERDUE') && this.isBranchUser;
      },
      command: (row) => {
        this.goToTasks(row.id);
      }
    },
    {
      label: 'View Compliance',
      icon: 'pi pi-eye',
      visible: (row) => {
        const s = row.status?.toUpperCase();
        return (s === 'REVIEW_PENDING' || s === 'COMPLETED' || s === 'ESCALATED_TO_CCO') ||
          (this.isReviewerUser && (s === 'IN_PROGRESS' || s === 'PENDING_RECOMPLIANCE' || s === 'REJECTED' || s === 'OVERDUE'));
      },
      command: (row) => {
        this.goToTasks(row.id);
      }
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

  constructor(private api: ComplianceApiService, private router: Router) { }

  ngOnInit() {
    this.loadTaskSets();
    this.api.getBranches().subscribe(data => {
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
      page: this.page,
      limit: this.limit,
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
      this.assignments.set(this.transformAssignments(data));
      this.totalRecords.set(res.total);
    });
  }

  private transformAssignments(rows: any[]): any[] {
    return rows.map(row => {
      const total     = parseInt(row.total_tasks, 10) || 0;
      const completed = parseInt(row.completed_tasks, 10) || 0;
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

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
        frequency_label: this.frequencyLabelMap[String(row.frequency)?.trim()] ?? row.frequency ?? '—',
        progress_text:   total > 0 ? `${completed} / ${total} (${pct}%)` : '—',
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
    this.page = 1;
    this.loadAssignments();
  }

  loadTaskSets() {
    this.api.getTaskSets().subscribe(data => this.taskSets.set(data));
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

  goToTasks(assignmentId: number) {
    this.router.navigate(['/assignments', assignmentId]);
  }

  openAssignModal(ts: any) {
    this.selectedTaskSet.set(ts);
    this.selectedBranchIds = [];
    if (ts.default_due_date) {
      this.proposedTimeline.set(new Date(ts.default_due_date));
    } else {
      this.proposedTimeline.set(null);
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

    const payload = {
      task_set_id: ts.id,
      branch_ids: this.selectedBranchIds,
      proposed_timeline: formattedTimeline
    };

    this.api.createAssignment(payload).subscribe(() => {
      this.showAssignModal.set(false);
      this.loadAssignments();
      this.activeTab.set('ASSIGNMENTS');
      alert('Assignments created successfully!');
    });
  }
}
