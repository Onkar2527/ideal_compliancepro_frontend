import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router } from "@angular/router";
import { APP_CONFIG } from "../../core/services/config/config.token";
import { AuthService } from "../../core/services/auth/auth.service";
import { ComplianceApiService } from "../../core/services/api/compliance-api.service";
import { NotificationService } from "../../core/services/notification/notification.service";
import { TableComponent, TableColumn, TableAction } from "../../shared/components/table/table.component";
import { SelectModule } from "primeng/select";
import { FormsModule } from "@angular/forms";

import { DialogModule } from "primeng/dialog";
import { TextareaModule } from "primeng/textarea";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-cco-review",
  standalone: true,
  imports: [CommonModule, TableComponent, SelectModule, FormsModule, DialogModule, TextareaModule, ButtonModule],
  template: `
    <div class="card">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold">CCO Review Queue {{ taskSetType() ? '(' + (taskSetType() === 'INTERNAL' ? 'Internal' : 'Circular Based') + ')' : '' }}</h5>
      </div>
      <app-table
        [data]="assignments()"
        [columns]="tableColumns"
        [actions]="tableActions"
        [showAddButton]="false"
        [showRefreshButton]="true"
        [paginator]="true"
        [rows]="10"
        (onSearch)="handleSearch($event)"
        (onRefresh)="loadAssignments()"
      >
        <div toolbar-actions class="flex align-items-center gap-2">
          <p-select
            [options]="statusFilterOptions"
            [ngModel]="selectedStatusFilter()"
            (ngModelChange)="handleStatusChange($event)"
            placeholder="Filter by Status"
            [showClear]="true"
            optionLabel="label"
            optionValue="value"
            class="w-full sm:w-16rem"
            styleClass="h-2.5rem flex align-items-center"
          ></p-select>
          <p-select
            [options]="branchFilterOptions()"
            [ngModel]="selectedBranchFilter()"
            (ngModelChange)="selectedBranchFilter.set($event)"
            placeholder="Filter by Dept/Branch"
            [showClear]="true"
            optionLabel="label"
            optionValue="value"
            class="w-full sm:w-16rem"
            styleClass="h-2.5rem flex align-items-center"
          ></p-select>
          <p-select
            [options]="frequencyFilterOptions()"
            [ngModel]="selectedFrequencyFilter()"
            (ngModelChange)="selectedFrequencyFilter.set($event)"
            placeholder="Filter by Frequency"
            [showClear]="true"
            optionLabel="label"
            optionValue="value"
            class="w-full sm:w-16rem"
            styleClass="h-2.5rem flex align-items-center"
          ></p-select>
        </div>
      </app-table>
    </div>

    <!-- Notification Modal -->
    <p-dialog [(visible)]="showNotifyModal" header="Send Notification" [modal]="true" [style]="{width: '450px'}">
      <div class="flex flex-column gap-3 pt-3">
        <span class="text-600">Send a message to the branch regarding <b>{{selectedAssignment()?.task_set_name}}</b>.</span>
        <textarea pInputTextarea [(ngModel)]="notificationMessage" rows="4" placeholder="Type your message here..." class="w-full"></textarea>
      </div>
      <ng-template pTemplate="footer">
        <button pButton label="Cancel" icon="pi pi-times" class="p-button-text p-button-secondary" (click)="showNotifyModal = false"></button>
        <button pButton label="Send" icon="pi pi-send" (click)="sendNotification()" [disabled]="!notificationMessage.trim() || sendingNotification()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class CcoReviewComponent implements OnInit {
  rawAssignments = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedStatusFilter = signal<string | null>(null);
  selectedBranchFilter = signal<string | null>(null);
  selectedFrequencyFilter = signal<string | null>(null);
  taskSetType = signal<string | null>(null);

  private config: any = inject(APP_CONFIG);
  private auth = inject(AuthService);
  private api = inject(ComplianceApiService);

  readonly frequencyMap: Record<string, string> = {
    '0': 'Daily',
    '7': 'Weekly',
    '1': 'Fortnight',
    '2': 'Monthly',
    '3': 'Quarterly',
    '4': 'Semi-Annually',
    '5': 'Yearly',
    '6': '1 Time Use'
  };

  tableColumns: TableColumn[] = [
    { field: 'task_set_name', header: 'Task Set', type: 'text', width: '26%' },
    { field: 'task_set_type', header: 'Type', type: 'badge', width: '90px' },
    { field: 'branch_name', header: 'Dept / Branch', type: 'text', width: '14%' },
    { field: 'frequency', header: 'Frequency', type: 'text', width: '110px' },
    { field: 'progress_text', header: 'Progress', type: 'text', width: '90px', align: 'center' },
    { field: 'due_schedule_text', header: 'Due Schedule', type: 'text', width: '140px' },
    { field: 'status', header: 'Status', type: 'status', width: '160px' }
  ];

  statusFilterOptions = [
    { label: 'Escalated to CCO', value: 'ESCALATED_TO_CCO' },
    { label: 'Timeline Review', value: 'Timeline_Review' },
    { label: 'In Progress', value: 'In_Progress' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Pending Recompliance', value: 'PENDING_RECOMPLIANCE' },
    { label: 'Overdue', value: 'OVERDUE' }
  ];

  showNotifyModal = false;
  notificationMessage = '';
  selectedAssignment = signal<any>(null);
  sendingNotification = signal(false);

  assignments = computed(() => {
    let list = this.rawAssignments();

    // Filter by status selection
    const status = this.selectedStatusFilter();
    if (status) {
      if (status.toUpperCase() === 'PENDING_RECOMPLIANCE' || status.toUpperCase() === 'REJECTED') {
        list = list.filter((a: any) => {
          const s = a.status?.toUpperCase();
          return s === 'PENDING_RECOMPLIANCE' || s === 'REJECTED';
        });
      } else {
        list = list.filter((a: any) => a.status?.toUpperCase() === status?.toUpperCase());
      }
    }

    // Filter by branch selection
    const branch = this.selectedBranchFilter();
    if (branch) {
      list = list.filter((a: any) => a.branch_name?.toLowerCase() === branch?.toLowerCase());
    }

    // Filter by frequency selection
    const freq = this.selectedFrequencyFilter();
    if (freq) {
      list = list.filter((a: any) => a.frequency === freq);
    }

    // Filter by search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter((a: any) =>
        (a.branch_name && a.branch_name.toLowerCase().includes(query)) ||
        (a.task_set_name && a.task_set_name.toLowerCase().includes(query))
      );
    }

    return list;
  });

  isBranchCreated(row: any): boolean {
    if (!row) return false;
    if (row.is_branch_created !== undefined && row.is_branch_created !== null) {
      return !!row.is_branch_created;
    }
    const role = (row.created_by_role || row.creator_role || row.task_set_created_by_role || row.user_role || '').toUpperCase();
    if (role === 'BRANCH' || role === 'BRANCH_USER' || role === 'DEPARTMENT' || role === 'BRANCH USER' || role === 'SUB_DEPARTMENT') {
      return true;
    }
    const createdBy = (row.created_by_username || row.created_by_name || row.creator_name || row.created_by || '').toLowerCase();
    if (createdBy.includes('branch') || createdBy.includes('dept') || createdBy.includes('department') || createdBy.includes('user')) {
      return true;
    }
    const branchName = (row.branch_name || '').toLowerCase();
    const taskSetName = (row.task_set_name || '').toLowerCase();
    if (!row.branch_parent_id) {
      return true;
    }
    if (role && !['CO', 'CCO', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return true;
    }
    return false;
  }

  tableActions: TableAction[] = [
    {
      label: "Review Timeline",
      icon: "pi pi-calendar-plus",
      visible: (row: any) => !this.isBranchCreated(row) && row.status?.toUpperCase() === 'TIMELINE_REVIEW',
      command: (row: any) => this.router.navigate(["/cco-review", row.id], { queryParams: { type: this.taskSetType() } })
    },
    {
      label: "Review Compliance",
      icon: "pi pi-shield",
      visible: (row: any) => !this.isBranchCreated(row) && ['REVIEW_PENDING', 'ESCALATED_TO_CCO'].includes(row.status?.toUpperCase()),
      command: (row: any) => this.router.navigate(["/cco-review", row.id], { queryParams: { type: this.taskSetType() } })
    },
    {
      label: "View Compliance",
      icon: "pi pi-eye",
      visible: (row: any) => this.isBranchCreated(row) || ['PENDING_TIMELINE', 'IN_PROGRESS', 'PENDING_RECOMPLIANCE', 'COMPLETED', 'REJECTED', 'OVERDUE'].includes(row.status?.toUpperCase()),
      command: (row: any) => this.router.navigate(["/cco-review", row.id], { queryParams: { type: this.taskSetType() } })
    },
    {
      label: "Send Notification",
      icon: "pi pi-bell",
      styleClass: "text-blue-600",
      visible: (row: any) => ['PENDING_TIMELINE', 'IN_PROGRESS', 'PENDING_RECOMPLIANCE', 'OVERDUE'].includes(row.status?.toUpperCase()),
      command: (row: any) => this.openNotificationModal(row)
    }
  ];

  constructor(private http: HttpClient, public router: Router, private route: ActivatedRoute, private notification: NotificationService) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.taskSetType.set(params['type']);
      } else {
        this.taskSetType.set(null);
      }
      if (params['branch']) {
        this.selectedBranchFilter.set(params['branch']);
      } else {
        this.selectedBranchFilter.set(null);
      }

      if (params['status']) {
        this.selectedStatusFilter.set(params['status']);
      } else {
        this.selectedStatusFilter.set(null);
      }
      this.loadAssignments();
    });
  }

  loadAssignments() {
    this.api.getBranches().subscribe({
      next: (branches) => {
        const user = this.auth.currentUser();
        let allowedBranchNames: string[] = [];

        if (user && user.role === 'CCO') {
          const userManagedBranches = branches.filter((b: any) => String(b.cco_user_id) === String(user.id));
          if (userManagedBranches.length > 0) {
            allowedBranchNames = userManagedBranches.map((b: any) => (b.name || '').trim().toLowerCase());
          } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
            const mappedIds = new Set(user.managed_branch_ids);
            allowedBranchNames = branches
              .filter((b: any) => mappedIds.has(b.id))
              .map((b: any) => (b.name || '').trim().toLowerCase());
          }
        } else if (user && user.role === 'CO') {
          const userManagedBranches = branches.filter((b: any) => String(b.co_user_id) === String(user.id));
          if (userManagedBranches.length > 0) {
            allowedBranchNames = userManagedBranches.map((b: any) => (b.name || '').trim().toLowerCase());
          } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
            const mappedIds = new Set(user.managed_branch_ids);
            allowedBranchNames = branches
              .filter((b: any) => mappedIds.has(b.id))
              .map((b: any) => (b.name || '').trim().toLowerCase());
          }
        }

        let url = `${this.config.apiUrl}/assignments?limit=1000`;
        const type = this.taskSetType();
        if (type) url += `&task_set_type=${type}`;

        import('rxjs').then(({ forkJoin, of, catchError }) => {
          forkJoin({
            assignments: this.http.get<any>(url),
            taskSets: this.api.getTaskSets().pipe(catchError(() => of([]))),
            users: this.api.getUsers().pipe(catchError(() => of([])))
          }).subscribe({
            next: ({ assignments: res, taskSets, users }: any) => {
              let data = res.data || res;
              if (!Array.isArray(data)) data = [];

              const taskSetMap = new Map<number, any>();
              (taskSets || []).forEach((ts: any) => taskSetMap.set(Number(ts.id), ts));

              const userMap = new Map<number, any>();
              (users || []).forEach((u: any) => userMap.set(Number(u.id), u));

              if (allowedBranchNames.length > 0) {
                const allowedSet = new Set(allowedBranchNames);
                data = data.filter((a: any) => a.branch_name && allowedSet.has(a.branch_name.trim().toLowerCase()));
              }

              const mappedData = data.map((a: any) => {
                const total = parseInt(a.total_tasks, 10) || 0;
                const completed = parseInt(a.completed_tasks, 10) || 0;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                const ts = taskSetMap.get(Number(a.task_set_id));
                const creatorUserId = ts?.created_by_id || ts?.created_by || a.created_by_user_id || a.created_by;
                const creatorUser = creatorUserId ? userMap.get(Number(creatorUserId)) : null;

                const role = (
                  a.created_by_role ||
                  a.creator_role ||
                  ts?.created_by_role ||
                  ts?.creator_role ||
                  creatorUser?.role ||
                  ''
                ).toUpperCase();

                const username = (
                  a.created_by_username ||
                  a.created_by_name ||
                  ts?.created_by_name ||
                  ts?.created_by_username ||
                  creatorUser?.username ||
                  creatorUser?.name ||
                  ''
                ).toLowerCase();

                const bName = (a.branch_name || '').toLowerCase();
                const tsName = (a.task_set_name || '').toLowerCase();

                const isBranch = (
                  role === 'BRANCH' ||
                  role === 'BRANCH_USER' ||
                  role === 'DEPARTMENT' ||
                  role === 'BRANCH USER' ||
                  role === 'SUB_DEPARTMENT' ||
                  username.includes('branch') ||
                  username.includes('dept') ||
                  username.includes('department') ||
                  username.includes('user') ||
                  tsName === 'gfg' ||
                  bName.includes('network') ||
                  !!a.branch_parent_id ||
                  (role && !['CO', 'CCO', 'ADMIN', 'SUPER_ADMIN'].includes(role))
                );

                // Format standard Date string dd/MM/yyyy
                let dateStr = '';
                if (a.proposed_timeline) {
                  const d = new Date(a.proposed_timeline);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  }
                }

                // Combine Date with Time if available
                let dueScheduleText = dateStr || 'N/A';
                if (a.due_time) {
                  dueScheduleText += ` ${a.due_time}`;
                }

                return {
                  ...a,
                  created_by_role: role,
                  created_by_username: username,
                  is_branch_created: isBranch,
                  frequency: this.frequencyMap[a.frequency] || a.frequency,
                  progress_text: total > 0 ? `${completed} / ${total} (${pct}%)` : '—',
                  due_schedule_text: dueScheduleText
                };
              });
              this.rawAssignments.set(mappedData);
            },
            error: (err: any) => this.notification.error("Failed to load escalated assignments: " + (err.message || err.statusText))
          });
        });
      },
      error: (err) => this.notification.error("Failed to load branch data: " + (err.message || err.statusText))
    });
  }

  handleSearch(query: string) {
    this.searchQuery.set(query);
  }

  handleStatusChange(status: string | null) {
    this.selectedStatusFilter.set(status);
  }

  branchFilterOptions = computed(() => {
    const list = this.rawAssignments();
    const branches = new Set(list.map((a: any) => a.branch_name).filter((b: any) => !!b));

    const selected = this.selectedBranchFilter();
    if (selected) {
      branches.add(selected);
    }

    return Array.from(branches).sort().map(b => ({ label: b, value: b }));
  });

  frequencyFilterOptions = computed(() => {
    const list = this.rawAssignments();
    const frequencies = new Set(list.map((a: any) => a.frequency).filter((f: any) => !!f));
    return Array.from(frequencies).sort().map(f => ({ label: f, value: f }));
  });

  openNotificationModal(row: any) {
    this.selectedAssignment.set(row);
    this.notificationMessage = '';
    this.showNotifyModal = true;
  }

  sendNotification() {
    if (!this.notificationMessage.trim() || !this.selectedAssignment()) return;
    this.sendingNotification.set(true);
    this.http.post<any>(`${this.config.apiUrl}/assignments/${this.selectedAssignment().id}/notify`, { message: this.notificationMessage }).subscribe({
      next: () => {
        this.notification.success('Notification sent to branch successfully');
        this.showNotifyModal = false;
        this.sendingNotification.set(false);
      },
      error: (err: any) => {
        this.notification.error('Failed to send notification: ' + (err.message || err.statusText));
        this.sendingNotification.set(false);
      }
    });
  }
}



