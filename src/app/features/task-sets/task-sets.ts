import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { TableComponent, TableColumn, TableAction } from '../../shared/components/table/table.component';
import { PageComponent } from '../../shared/components/page/page.component';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { PickListModule } from 'primeng/picklist';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FieldsetModule } from 'primeng/fieldset';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { TextFieldComponent } from '../../shared/components/form/text-field/text-field.component';
import { TextareaFieldComponent } from '../../shared/components/form/textarea-field/textarea-field.component';
import { SelectFieldComponent } from '../../shared/components/form/select-field/select-field.component';
import { DateFieldComponent } from '../../shared/components/form/date-field/date-field.component';

@Component({
  selector: 'app-task-sets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableComponent,
    DialogModule,
    DrawerModule,
    ButtonModule,
    MultiSelectModule,
    PickListModule,
    DateFieldComponent,
    TextFieldComponent,
    TextareaFieldComponent,
    SelectFieldComponent,
    ToastModule,
    ConfirmDialogModule,
    FieldsetModule,
    SelectModule,
    TagModule,
    TableModule,
    SelectButtonModule,
    InputTextModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './task-sets.html',
  styles: [`
    ::ng-deep .circular-dropdown-panel {
      max-width: 560px !important;
      min-width: 400px !important;
    }
    ::ng-deep .circular-dropdown-panel .p-select-option,
    ::ng-deep .circular-dropdown-panel .p-dropdown-item {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 540px !important;
      line-height: 1.4 !important;
      font-size: 0.875rem !important;
      display: block !important;
    }

    /* ── Drawer Layout (mirrors Circular Master) ── */
    .drawer-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .drawer-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .drawer-title-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.65rem;
      height: 2.65rem;
      border-radius: 8px;
      color: var(--primary-color);
      background: var(--primary-50, var(--surface-100));
      border: 1px solid var(--primary-100, var(--surface-border));
      flex: 0 0 auto;
    }
    .drawer-content-shell {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1rem 1.35rem 1.25rem;
    }
    .drawer-section {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 1rem 1rem 0.35rem;
    }
    .section-heading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.1rem;
    }
    .section-kicker {
      color: var(--text-color);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .section-line {
      flex: 1;
      height: 1px;
      background: var(--surface-border);
    }
    .drawer-form-grid {
      row-gap: 0.65rem;
    }
    .drawer-form-grid .field {
      margin-bottom: 0.85rem;
    }
    .drawer-footer-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      width: 100%;
      padding: 1rem 1.35rem;
    }
    .drawer-footer-row button {
      min-width: 9.5rem;
    }

    /* ── Bulk Upload Dialog ── */
    ::ng-deep .bulk-upload-dialog .p-dialog-content { padding: 1.25rem 1.5rem; }
    .bulk-upload-content { display: flex; flex-direction: column; gap: 1rem; }
    .bulk-dialog-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.8rem; height: 2.8rem; border-radius: 10px;
      background: var(--green-50, #f0fdf4); border: 1.5px solid var(--green-200, #bbf7d0);
      color: var(--green-600, #16a34a); font-size: 1.25rem;
    }
    .bulk-drop-zone {
      border: 2px dashed var(--surface-border);
      border-radius: 12px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: var(--surface-ground);
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    }
    .bulk-drop-zone:hover, .bulk-drop-zone.dragging {
      border-color: var(--primary-color);
      background: var(--primary-50, #f0f9ff);
    }
    .bulk-drop-zone.dragging { border-style: solid; }
    .drop-icon { font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.25rem; }
    .drop-title { font-size: 1rem; font-weight: 600; color: var(--text-color); }
    .drop-subtitle { font-size: 0.875rem; color: var(--text-color-secondary); }
    .drop-formats { font-size: 0.75rem; color: var(--text-color-secondary); margin-top: 0.25rem; }
    .bulk-actions-row { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; }
    .bulk-preview { display: flex; flex-direction: column; gap: 0.75rem; }
    .preview-header {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
      gap: 0.5rem; padding: 0.75rem 1rem;
      background: var(--green-50, #f0fdf4); border: 1px solid var(--green-200, #bbf7d0);
      border-radius: 8px;
    }
    .preview-table-wrap { border: 1px solid var(--surface-border); border-radius: 8px; overflow: hidden; }
    tr.preview-set-start td { border-top: 2px solid var(--primary-200, #bfdbfe) !important; }
    .badge-branch { background: #dbeafe; color: #1d4ed8; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; }
    .badge-dept { background: #fae8ff; color: #7e22ce; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; }
  `]
})
export class TaskSetsComponent implements OnInit {
  currentCircular = signal<any | null>(null);

  // ── Bulk Upload Modal ──────────────────────────────────────────────────────
  showBulkUploadDialog = false;
  bulkPreviewRows = signal<any[]>([]);
  bulkSelectedFile = signal<File | null>(null);
  bulkSelectedFileName = signal<string>('');
  isDraggingOver = signal<boolean>(false);

  bulkPreviewSetCount = computed(() => {
    const seen = new Set<string>();
    for (const r of this.bulkPreviewRows()) {
      if (r.set_name) seen.add(String(r.set_name));
    }
    return seen.size;
  });

  openBulkUploadModal() {
    this.clearBulkFile();
    this.showBulkUploadDialog = true;
  }

  closeBulkUploadModal() {
    this.showBulkUploadDialog = false;
    this.clearBulkFile();
  }

  clearBulkFile() {
    this.bulkPreviewRows.set([]);
    this.bulkSelectedFile.set(null);
    this.bulkSelectedFileName.set('');
    this.isDraggingOver.set(false);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.parseBulkFile(file);
  }

  onBulkFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.parseBulkFile(file);
    input.value = '';
  }

  parseBulkFile(file: File) {
    this.bulkSelectedFile.set(file);
    this.bulkSelectedFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[];
      this.bulkPreviewRows.set(rows);
    };
    reader.readAsArrayBuffer(file);
  }

  downloadTemplate() {
    const templateRows = [
      {
        set_name: 'Example Set 1',
        task_name: 'Task A',
        task_header: 'Cash Management',
        department_branch_name: 'Main Branch',
        for_branch_or_department: 'branch',
        authority: 'RBI',
        priority: 'HIGH',
        frequency: 'DAILY',
        start_date: '01-09-2026',
        end_date: '31-12-2026',
        due: '17:00',
        reporting: '18:00',
      },
      {
        set_name: 'Example Set 1',
        task_name: 'Task B',
        task_header: 'Reporting',
        department_branch_name: 'HO Finance',
        for_branch_or_department: 'department',
        authority: 'RBI',
        priority: 'MEDIUM',
        frequency: 'DAILY',
        start_date: '01-09-2026',
        end_date: '31-12-2026',
        due: '17:00',
        reporting: '18:00',
      },
      {
        set_name: 'Example Set 2',
        task_name: 'KYC Review',
        task_header: 'KYC Ops',
        department_branch_name: 'Compliance Dept',
        for_branch_or_department: 'department',
        authority: 'NABARD',
        priority: 'CRITICAL',
        frequency: 'WEEKLY',
        start_date: '01-09-2026',
        end_date: '31-12-2026',
        due: 'fri',
        reporting: 'sat',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TaskSets');
    XLSX.writeFile(wb, 'bulk_upload_template.xlsx');
  }

  submitBulkUpload() {
    const file = this.bulkSelectedFile();
    if (!file) return;
    
    this.saving.set(true);
    const user = this.auth.currentUser();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? storedUser?.id ?? storedUser?.user_id ?? storedUser?.userId;
    const userName = user?.name || user?.full_name || user?.fullName || user?.username || storedUser?.name || storedUser?.full_name || storedUser?.username;
    const userRole = user?.role || user?.designation || storedUser?.role || storedUser?.designation;

    const formData = new FormData();
    formData.append('file', file);
    if (userId) {
      formData.append('created_by', String(userId));
      formData.append('created_by_id', String(userId));
      formData.append('created_by_user_id', String(userId));
      formData.append('user_id', String(userId));
    }
    if (userRole) {
      formData.append('created_by_role', userRole);
      formData.append('creator_role', userRole);
    }
    if (userName) {
      formData.append('created_by_name', userName);
      formData.append('creator_name', userName);
      formData.append('created_by_username', userName);
    }
    
    this.api.bulkUploadTaskSets(formData).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Bulk Upload Successful',
          detail: `${res.created} internal task set(s) created.`,
          life: 4000
        });
        this.loadData(true);
        this.showBulkUploadDialog = false;
        this.clearBulkFile();
      },
      error: (err: any) => {
        this.saving.set(false);
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Upload Error', detail: 'Failed to process bulk upload.' });
      }
    });
  }


  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }

  prioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  }

  taskSets = signal<any[]>([]);
  loadingRowIds = signal<Set<string>>(new Set());
  generatedTaskSetIds = new Set<number>();
  saving = signal<boolean>(false);

  tableColumns: TableColumn[] = [
    { field: 'type', header: 'Type', type: 'badge', width: '100px' },
    { field: 'circular_title', header: 'Circular / Authority', type: 'text', width: '20%' },
    { field: 'name', header: 'Task Set Name', type: 'text', width: '18%' },
    { field: 'branch_names', header: 'Dept/Branch', type: 'text', width: '16%' },
    { field: 'created_by_username', header: 'Created By', type: 'text', width: '120px' },
    { field: 'default_due_date', header: 'Due Date', type: 'date', width: '110px' },
    { field: 'start_date', header: 'Start Date', type: 'date', width: '110px' },
    { field: 'frequency', header: 'Frequency', type: 'text', width: '110px' },
    { field: 'created_at', header: 'Created', type: 'date', width: '110px' }
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: (row) => this.openFormDrawer(row)
    },
    // {
    //   name: 'generate',
    //   label: 'Auto-Generate Assignments',
    //   icon: 'pi pi-cog',
    //   command: (row) => this.triggerAssignmentGeneration(row),
    //   styleClass: 'p-button-success'
    // },
    // {
    //   label: 'Reopen For Recompliance',
    //   icon: 'pi pi-refresh',
    //   command: (row) => this.reopenTaskSet(row),
    //   styleClass: 'p-button-warning'
    // },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: (row) => this.deleteTaskSet(row),
      styleClass: 'p-button-danger'
    }
  ];


  // Modals state
  showFormDrawer = signal(false);
  isEditMode = false;
  selectedTaskSet: any = null;
  showBranchAssignment = signal(false);

  taskSetTypeOptions = [
    { label: 'Regular (Circular Based)', value: 'REGULAR' },
    { label: 'Internal (Daily / Operational Checklist)', value: 'INTERNAL' }
  ];

  // Form states as WritableSignals
  newTaskSetType = signal<string>('REGULAR');
  newTaskSetName = signal<string>('');
  newTaskSetCircularId = signal<number | null>(null);
  newTaskSetAuthorityId = signal<number | null>(null);
  newTaskSetStartDate = signal<Date | null>(null);
  newTaskSetEndDate = signal<Date | null>(null);
  newTaskSetFrequency = signal<string>('');

  // INTERNAL & REGULAR schedule fields
  newTaskSetReferenceNo              = signal<string>('');
  newTaskSetReportingTime            = signal<string>('');
  newTaskSetDueTime                  = signal<string>('');
  newTaskSetAssignmentTime           = signal<string>('');
  newTaskSetReportingDayOfWeek       = signal<number | null>(null);
  newTaskSetDueDayOfWeek             = signal<number | null>(null);
  newTaskSetAssignmentDayOfWeek      = signal<number | null>(null);
  newTaskSetReportingDaysOfMonth     = signal<string>('');
  newTaskSetDueDaysOfMonth           = signal<string>('');
  newTaskSetAssignmentDaysOfMonth    = signal<string>('');
  newTaskSetReportingSchedule        = signal<string>('');
  newTaskSetDueSchedule              = signal<string>('');
  newTaskSetAssignmentSchedule       = signal<string>('');

  frequencies = [
    { label: 'DAILY - Every Day', value: '0' },
    { label: 'WEEKLY - Every Week', value: '7' },
    { label: 'FORTNIGHT - Every 15 Days', value: '1' },
    { label: 'MONTHLY - Every Month', value: '2' },
    { label: 'QUARTERLY - Every Three Months', value: '3' },
    { label: 'SEMIANNUALLY - Every Six Months', value: '4' },
    { label: 'YEARLY - Every Year', value: '5' },
    { label: '1 Time Use', value: '6' }
  ];

  readonly frequencyMap: Record<string, string> = {
    '0': 'Daily',
    '1': 'Fortnight (Every 15 Days)',
    '2': 'Monthly',
    '3': 'Quarterly',
    '4': 'Semi-Annually',
    '5': 'Yearly',
    '6': '1 Time Use',
    '7': 'Weekly'
  };

  dayOfWeekOptions = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 7 }
  ];

  daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  toggleDayOfMonth(signalObj: any, day: number) {
    const current = signalObj() || '';
    let days = current.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
    if (days.includes(day)) {
      days = days.filter((n: number) => n !== day);
    } else {
      days.push(day);
    }
    days.sort((a: number, b: number) => a - b);
    signalObj.set(days.join(', '));
  }
  
  isDayOfMonthSelected(signalObj: any, day: number): boolean {
    const current = signalObj() || '';
    const days = current.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
    return days.includes(day);
  }

  monthOptions = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 },
    { label: 'March', value: 3 }, { label: 'April', value: 4 },
    { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 },
    { label: 'September', value: 9 }, { label: 'October', value: 10 },
    { label: 'November', value: 11 }, { label: 'December', value: 12 }
  ];

  scheduleDayOptions = Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }));

  // Form & details loading states
  loadingFormDetails = signal<boolean>(false);

  // Inline Task Creation Signals
  showInlineTaskDrawer = signal<boolean>(false);
  showInlineTaskDialog = this.showInlineTaskDrawer; // alias for template compatibility
  inlineTaskDescription = signal<string>('');
  inlineTaskPriority = signal<string>('');
  inlineTaskAuthorityId = signal<number | null>(null);
  savingInlineTask = signal<boolean>(false);

  priorityOptions = [
    { label: 'Critical', value: 'Critical' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' }
  ];

  // Inline task form validation signal
  isInlineTaskValid = computed(() => {
    const desc = this.inlineTaskDescription()?.trim();
    const priority = this.inlineTaskPriority();
    const authorityId = this.inlineTaskAuthorityId();

    return !!(desc && priority && authorityId);
  });

  // Form validation signal
  isFormValid = computed(() => {
    const type = this.newTaskSetType();
    const name = this.newTaskSetName()?.trim();
    const frequency = this.newTaskSetFrequency();
    const startDate = this.newTaskSetStartDate();
    const endDate = this.newTaskSetEndDate();

    if (!type || !name || !frequency || !startDate || !endDate) return false;

    if (startDate > endDate) return false;

    if (type === 'REGULAR') {
      const circularId = this.newTaskSetCircularId();
      if (!circularId) return false;
    }

    // Schedule logic for both types if recurring
    if (frequency !== '6') {
      if (frequency === '0') {
        if (!this.newTaskSetAssignmentTime()?.trim()) return false;
        if (!this.newTaskSetReportingTime()?.trim() || !this.newTaskSetDueTime()?.trim()) return false;
      }
      if (frequency === '7') {
        if (!this.newTaskSetAssignmentDayOfWeek()) return false;
        if (!this.newTaskSetReportingDayOfWeek() || !this.newTaskSetDueDayOfWeek()) return false;
      }
      if (frequency === '1' || frequency === '2') {
        if (!this.newTaskSetAssignmentDaysOfMonth()?.trim()) return false;
        if (!this.newTaskSetReportingDaysOfMonth()?.trim() || !this.newTaskSetDueDaysOfMonth()?.trim()) return false;
      }
      if (['3', '4', '5'].includes(frequency)) {
        if (!this.newTaskSetAssignmentSchedule()?.trim()) return false;
        if (!this.newTaskSetReportingSchedule()?.trim() || !this.newTaskSetDueSchedule()?.trim()) return false;
      }
    }

    if (this.scheduleValidationError()) return false;

    return true;
  });

  scheduleValidationError = computed(() => {
    const freq = this.newTaskSetFrequency();
    if (!freq || freq === '6') return null;

    const extractFirstNum = (str: string | null) => {
      if (!str) return 0;
      const match = str.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    if (freq === '0') {
      const aTime = this.newTaskSetAssignmentTime()?.trim();
      const dTime = this.newTaskSetDueTime()?.trim();
      const rTime = this.newTaskSetReportingTime()?.trim();
      if (aTime && dTime && rTime) {
        if (aTime >= dTime) return 'Assignment Time must be before Due Time.';
        if (dTime >= rTime) return 'Due Time must be before Reporting Time.';
      }
    } else if (freq === '7') {
      const aDay = this.newTaskSetAssignmentDayOfWeek();
      const dDay = this.newTaskSetDueDayOfWeek();
      const rDay = this.newTaskSetReportingDayOfWeek();
      if (aDay !== null && dDay !== null && rDay !== null) {
        if (Number(aDay) >= Number(dDay)) return 'Assignment Day must be before Due Day.';
        if (Number(dDay) >= Number(rDay)) return 'Due Day must be before Reporting Day.';
      }
    } else if (freq === '1' || freq === '2') {
      const aDays = this.newTaskSetAssignmentDaysOfMonth();
      const dDays = this.newTaskSetDueDaysOfMonth();
      const rDays = this.newTaskSetReportingDaysOfMonth();
      if (aDays && dDays && rDays) {
        if (extractFirstNum(aDays) >= extractFirstNum(dDays)) return 'Assignment Day must be before Due Day.';
        if (extractFirstNum(dDays) >= extractFirstNum(rDays)) return 'Due Day must be before Reporting Day.';
      }
    } else if (['3','4','5'].includes(freq)) {
      const aSched = this.newTaskSetAssignmentSchedule();
      const dSched = this.newTaskSetDueSchedule();
      const rSched = this.newTaskSetReportingSchedule();
      if (aSched && dSched && rSched) {
        if (extractFirstNum(aSched) >= extractFirstNum(dSched)) return 'Assignment Schedule must be before Due Schedule.';
        if (extractFirstNum(dSched) >= extractFirstNum(rSched)) return 'Due Schedule must be before Reporting Schedule.';
      }
    }
    return null;
  });

  // Mapping
  rawTasks = signal<any[]>([]);
  authorities = signal<any[]>([]);
  selectedCircularFilter = signal<number | null>(null);
  formCircularFilter = signal<number | null>(null);
  circulars = signal<any[]>([]);

  openInlineTaskDialog() {
    this.ensureAuthoritiesLoaded();
    this.inlineTaskDescription.set('');
    this.inlineTaskPriority.set('');
    this.inlineTaskAuthorityId.set(this.newTaskSetAuthorityId() || null);
    this.showInlineTaskDrawer.set(true);
  }

  saveInlineTask() {
    const desc = this.inlineTaskDescription()?.trim();
    const priority = this.inlineTaskPriority();
    const authorityId = this.inlineTaskAuthorityId();

    if (!desc || !priority || !authorityId) {
      const missing: string[] = [];
      if (!desc) missing.push('Task Description');
      if (!priority) missing.push('Priority');
      if (!authorityId) missing.push('Authority');

      this.messageService.add({
        severity: 'error',
        summary: 'Required Fields Missing',
        detail: `Please fill in all required fields for Add Task: ${missing.join(', ')}.`,
        life: 4000
      });
      return;
    }

    this.savingInlineTask.set(true);
    const circularId = this.newTaskSetType() === 'REGULAR' ? (this.newTaskSetCircularId() || undefined) : undefined;
    const user = this.auth.currentUser();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? storedUser?.id ?? storedUser?.user_id ?? storedUser?.userId;
    const userName = user?.name || user?.full_name || user?.fullName || user?.username || storedUser?.name || storedUser?.full_name || storedUser?.username;
    const userRole = user?.role || user?.designation || storedUser?.role || storedUser?.designation;

    const payload: any = {
      description: desc,
      circular_id: circularId,
      priority: priority,
      authority_id: authorityId,
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

    this.api.createManualTask(payload).subscribe({
      next: (createdTask: any) => {
        this.savingInlineTask.set(false);
        this.showInlineTaskDrawer.set(false);

        createdTask.due_date = null;

        const currentRaw = this.rawTasks();
        this.rawTasks.set([createdTask, ...currentRaw]);
        this.targetTasks = [createdTask, ...this.targetTasks];

        this.messageService.add({
          severity: 'success',
          summary: 'Task Created',
          detail: 'New task created and automatically added to this task set.',
          life: 3000
        });
      },
      error: () => {
        this.savingInlineTask.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create task' });
      }
    });
  }

  allTasks = computed(() => {
    const tasks = this.rawTasks();
    const type = this.newTaskSetType();
    const circularId = this.formCircularFilter() || this.newTaskSetCircularId();
    const authorities = this.authorities();
    const authMap = new Map<number, string>(authorities.map(a => [a.id, a.name]));

    if (type === 'REGULAR') {
      if (!circularId) return [];
      return tasks.filter(t => t.circular_id === circularId);
    }

    if (type === 'INTERNAL') {
      const internalTasks = tasks.filter(t => !t.circular_id);
      return internalTasks.map(t => ({
        ...t,
        header_name: t.header_name || '-',
        authority_name: t.authority_name || (t.authority_id ? (authMap.get(t.authority_id) || `Authority #${t.authority_id}`) : 'Bank Internal')
      }));
    }

    return tasks;
  });

  selectedFrequencyFilter = signal<string | null>(null);
  selectedBranchFilter = signal<string | null>(null);

  frequencyFilterOptions = computed(() => {
    const list = this.taskSets();
    const freqs = new Set(list.map((s: any) => s.frequency).filter((f: any) => !!f));
    return Array.from(freqs).sort().map(f => ({ label: f, value: f }));
  });

  branchFilterOptions = computed(() => {
    const list = this.taskSets();
    const branches = new Set<string>();
    list.forEach(s => {
      if (s.branch_names && s.branch_names !== '—') {
        s.branch_names.split(',').forEach((b: string) => branches.add(b.trim()));
      }
    });
    return Array.from(branches).sort().map(b => ({ label: b, value: b }));
  });

  filteredTaskSets = computed(() => {
    let sets = this.taskSets();
    
    const filterId = this.selectedCircularFilter();
    if (filterId) {
      sets = sets.filter(s => s.circular_id === filterId);
    }
    
    const freq = this.selectedFrequencyFilter();
    if (freq) {
      sets = sets.filter(s => s.frequency === freq);
    }
    
    const branch = this.selectedBranchFilter();
    if (branch) {
      sets = sets.filter(s => s.branch_names && s.branch_names.includes(branch));
    }
    
    return sets;
  });

  selectedCircularLabel = computed(() => {
    const filterId = this.selectedCircularFilter();
    if (!filterId) return null;
    const found = this.circulars().find(c => c.id === filterId);
    return found ? (found.reference_no ? `${found.reference_no} — ${found.title}` : found.title) : null;
  });

  circularFilterOptions = signal<{ label: string; value: any }[]>([]);

  targetTasks: any[] = [];
  selectionTick = signal<number>(0);
  availableSearchText = signal<string>('');
  selectedSearchText = signal<string>('');
  availableHeaderFilter = signal<string | null>(null);

  availableTasks = computed(() => {
    this.selectionTick();
    const all = this.allTasks();
    const selectedIds = new Set(this.targetTasks.map(t => t.id));
    return all.filter(t => !selectedIds.has(t.id));
  });

  taskHeaderOptions = computed(() => {
    const tasks = this.allTasks();
    const headers = new Set<string>();
    tasks.forEach(t => {
      if (t.header_name && t.header_name.trim()) headers.add(t.header_name.trim());
    });
    return Array.from(headers).sort().map(h => ({ label: h, value: h }));
  });

  filteredAvailableTasks = computed(() => {
    const list = this.availableTasks();
    const search = (this.availableSearchText() || '').toLowerCase().trim();
    const header = this.availableHeaderFilter();

    return list.filter(t => {
      if (header && t.header_name !== header) return false;
      if (!search) return true;
      const desc = (t.description || '').toLowerCase();
      const hName = (t.header_name || '').toLowerCase();
      const auth = (t.authority_name || '').toLowerCase();
      const prio = (t.priority || '').toLowerCase();
      return desc.includes(search) || hName.includes(search) || auth.includes(search) || prio.includes(search);
    });
  });

  filteredSelectedTasks = computed(() => {
    this.selectionTick();
    const list = this.targetTasks;
    const search = (this.selectedSearchText() || '').toLowerCase().trim();
    if (!search) return list;

    return list.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const hName = (t.header_name || '').toLowerCase();
      const auth = (t.authority_name || '').toLowerCase();
      const prio = (t.priority || '').toLowerCase();
      return desc.includes(search) || hName.includes(search) || auth.includes(search) || prio.includes(search);
    });
  });

  addAllAvailableTasks(): void {
    const toAdd = this.filteredAvailableTasks();
    if (toAdd.length === 0) return;
    this.targetTasks = [...toAdd, ...this.targetTasks];
    this.selectionTick.set(this.selectionTick() + 1);
  }

  removeAllSelectedTasks(): void {
    this.targetTasks = [];
    this.selectionTick.set(this.selectionTick() + 1);
  }

  addSingleTask(task: any): void {
    if (!task) return;
    this.targetTasks = [task, ...this.targetTasks];
    this.selectionTick.set(this.selectionTick() + 1);
  }

  removeSingleTask(task: any): void {
    if (!task) return;
    this.targetTasks = this.targetTasks.filter(t => t.id !== task.id);
    this.selectionTick.set(this.selectionTick() + 1);
  }

  getPrioritySeverity(priority: string | undefined): 'danger' | 'warn' | 'info' | 'secondary' {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'CRITICAL') return 'danger';
    if (p === 'MEDIUM' || p === 'MODERATE') return 'warn';
    if (p === 'LOW') return 'info';
    return 'secondary';
  }

  availableTaskColumns = computed<TableColumn[]>(() => {
    const isInternal = this.newTaskSetType() === 'INTERNAL';
    const cols: TableColumn[] = [
      { field: 'description', header: 'Description', type: 'text' },
      { field: 'priority', header: 'Priority', type: 'badge', width: '100px' }
    ];
    if (isInternal) {
      cols.splice(1, 0, { field: 'header_name', header: 'Task Header', type: 'text', width: '130px' });
      cols.push({ field: 'authority_name', header: 'Authority', type: 'text', width: '130px' });
    }
    cols.push({ field: 'add', actionName: 'add', header: 'Add', type: 'action', actionIcon: 'pi pi-arrow-right', width: '70px', align: 'center', cssClass: 'text-primary' });
    return cols;
  });

  selectedTaskColumns = computed<TableColumn[]>(() => {
    const isInternal = this.newTaskSetType() === 'INTERNAL';
    const cols: TableColumn[] = [
      { field: 'remove', actionName: 'remove', header: 'Remove', type: 'action', actionIcon: 'pi pi-times', width: '70px', align: 'center', cssClass: 'text-red-500' },
      { field: 'description', header: 'Description', type: 'text' },
      { field: 'priority', header: 'Priority', type: 'badge', width: '100px' }
    ];
    if (isInternal) {
      cols.splice(2, 0, { field: 'header_name', header: 'Task Header', type: 'text', width: '130px' });
      cols.push({ field: 'authority_name', header: 'Authority', type: 'text', width: '130px' });
      cols.push({ field: 'due_date', header: 'Due Date', type: 'date_input', width: '160px' });
    } else {
      cols.push({ field: 'due_date', header: 'Due Date', type: 'date_input', width: '160px' });
    }
    return cols;
  });

  activeDueDaysPreset = signal<number | null>(null);

  applyDaysToAllSelectedTasks(days: number) {
    this.activeDueDaysPreset.set(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    this.targetTasks = this.targetTasks.map(t => ({
      ...t,
      due_date: dateStr
    }));
    this.selectionTick.set(this.selectionTick() + 1);
    this.messageService.add({
      severity: 'success',
      summary: 'Due Date Applied',
      detail: `Applied +${days} days (${dateStr}) to all ${this.targetTasks.length} selected tasks.`,
      life: 2500
    });
  }

  onAvailableTaskAction(event: { name: string, row: any }) {
    if (event.name === 'add') {
      this.addSingleTask(event.row);
    }
  }

  onSelectedTaskAction(event: { name: string, row: any }) {
    if (event.name === 'remove') {
      this.removeSingleTask(event.row);
    }
  }

  // Assigning
  branches = signal<any[]>([]);
  selectedBranches: any[] = [];
  proposedDate = signal<Date | null>(null);
  parentPage: number | null = null;
  parentLimit: number | null = null;
  cameFromCirculars = signal<boolean>(false);
  cameFromTasks = signal<boolean>(false);

  private auth = inject(AuthService);

  canAccessTaskSets = computed(() => {
    const role = String(this.auth.currentUser()?.role || '').toLowerCase();
    return role !== 'cco' || this.api.canCcoAccessTaskSets();
  });

  constructor(private api: ComplianceApiService, private messageService: MessageService, private confirmationService: ConfirmationService, private route: ActivatedRoute, private router: Router) {}

  private parseToDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'string') {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  onTaskTableAction(event: any) {
    // Other task table actions if any
  }

  goBackToCirculars() {
    const queryParams: any = {};
    const circularId = this.selectedCircularFilter();
    if (circularId) {
      queryParams.highlight_id = circularId;
    }
    if (this.parentPage) {
      queryParams.page = this.parentPage;
    }
    if (this.parentLimit) {
      queryParams.limit = this.parentLimit;
    }
    this.router.navigate(['/circulars'], { queryParams });
  }

  goBackToTasks() {
    const queryParams: any = {};
    const circularId = this.selectedCircularFilter();
    if (circularId) {
      queryParams.circular_id = circularId;
    }
    if (this.parentPage) {
      queryParams.parent_page = this.parentPage;
    }
    if (this.parentLimit) {
      queryParams.parent_limit = this.parentLimit;
    }
    this.router.navigate(['/tasks'], { queryParams });
  }

  ngOnInit() {
    if (!this.canAccessTaskSets()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Access Restricted',
        detail: 'Task Set management is not enabled for CCO role in this institution configuration.',
        life: 5000
      });
      this.router.navigate(['/home']);
      return;
    }

    this.loadData();
    this.api.getApprovedTasks({ limit: 1000 }).subscribe(res => {
      this.rawTasks.set(res.data);
    });
    this.loadBranches();
    this.loadAuthorities();

    // Auto-apply circular filter if navigated from Circular Master / Tasks
    this.route.queryParamMap.subscribe(params => {
      const circularId = params.get('circular_id');
      const cameFromTasks = params.get('came_from_tasks');
      const parentPage = params.get('parent_page');
      const parentLimit = params.get('parent_limit');

      this.parentPage = parentPage ? +parentPage : null;
      this.parentLimit = parentLimit ? +parentLimit : null;

      if (circularId) {
        this.selectedCircularFilter.set(+circularId);
        this.cameFromCirculars.set(true);
        this.cameFromTasks.set(cameFromTasks === 'true' || cameFromTasks === '1');
        this.loadCirculars();
        this.api.getCircularById(+circularId).subscribe({
          next: (data) => this.currentCircular.set(data),
          error: (err) => console.error('Failed to load circular details in task sets:', err)
        });
      } else {
        this.selectedCircularFilter.set(null);
        this.cameFromCirculars.set(false);
        this.cameFromTasks.set(false);
        this.currentCircular.set(null);
      }
    });
  }

  loadBranches() {
    this.api.getBranches().subscribe(data => {
      const allBranches = data || [];
      const user = this.auth.currentUser();
      const userRole = String(user?.role || '').toUpperCase();
      const userBranchId = user?.branch_id ?? user?.branchId;

      let managed: any[] = [];

      if (['BRANCH_USER', 'BRANCH', 'DEPARTMENT', 'SUB_DEPARTMENT'].includes(userRole)) {
        // For branch users, show ONLY sub-departments belonging to their department/branch
        const mySubDepts = allBranches.filter((b: any) => userBranchId && String(b.parent_id) === String(userBranchId));
        if (mySubDepts.length > 0) {
          managed = mySubDepts;
        } else {
          // Fallback if not directly matched by parent_id
          const anySubDepts = allBranches.filter((b: any) => b.parent_id !== null && b.parent_id !== undefined);
          managed = anySubDepts.length > 0 ? anySubDepts : allBranches.filter((b: any) => userBranchId && String(b.id) === String(userBranchId));
        }
      } else {
        // Filter out sub-departments: show only top-level departments and branches for Admin/CO/CCO
        const topLevelBranches = allBranches.filter((b: any) => !b.parent_id);
        managed = topLevelBranches;

        if (user && userRole === 'CO') {
          const userMapped = topLevelBranches.filter((b: any) => String(b.co_user_id) === String(user.id));
          if (userMapped.length > 0) {
            managed = userMapped;
          } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
            const ids = new Set(user.managed_branch_ids);
            const filtered = topLevelBranches.filter((b: any) => ids.has(b.id));
            if (filtered.length > 0) managed = filtered;
          }
        } else if (user && userRole === 'CCO') {
          const userMapped = topLevelBranches.filter((b: any) => String(b.cco_user_id) === String(user.id));
          if (userMapped.length > 0) {
            managed = userMapped;
          } else if (user.managed_branch_ids && user.managed_branch_ids.length > 0) {
            const ids = new Set(user.managed_branch_ids);
            const filtered = topLevelBranches.filter((b: any) => ids.has(b.id));
            if (filtered.length > 0) managed = filtered;
          }
        }
      }

      const enriched = managed.map((b: any) => ({
        ...b,
        name: b.name,
        raw_name: b.name
      })).sort((a: any, b: any) => a.name.localeCompare(b.name));

      this.branches.set(enriched);
    });
  }

  loadData(isRefresh = false) {
    if (isRefresh) {
      this.api.getApprovedTasks({ limit: 1000 }).subscribe(res => this.rawTasks.set(res.data));
      this.loadBranches();
      this.loadAuthorities();
    }

    this.api.getTaskSets().subscribe({
      next: (data) => {
        const mapped = data.map((row: any) => ({
          ...row,
          type: row.type || 'REGULAR',
          circular_title: (row.type || 'REGULAR') === 'INTERNAL'
            ? (row.authority_name ? `Authority: ${row.authority_name}` : 'Internal / Operational')
            : (row.circular_title || '-'),
          branch_names: row.branch_names || '—',
          created_by_username: row.created_by_username || row.created_by_name || row.creator_name || (row.created_by ? `User #${row.created_by}` : '—'),
          frequency: this.frequencyMap[row.frequency] ?? row.frequency
        }));
        this.taskSets.set(mapped);
        if (isRefresh) {
          this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Task sets list refreshed', life: 2500 });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load task sets' });
      }
    });
  }

  ensureCircularsLoaded() {
    if (!this.circulars() || this.circulars().length === 0) {
      this.loadCirculars();
    }
  }

  loadCirculars() {
    this.api.getCirculars({ limit: 1000 }).subscribe(res => {
      this.circulars.set(res.data);
      this.circularFilterOptions.set(
        res.data.map((c: any) => ({
          label: c.reference_no ? `${c.reference_no} - ${c.title}` : c.title,
          value: c.id
        }))
      );
    });
  }

  ensureAuthoritiesLoaded() {
    if (!this.authorities() || this.authorities().length === 0) {
      this.loadAuthorities();
    }
  }

  loadAuthorities() {
    this.api.getAuthorities().subscribe({
      next: (data) => {
        this.authorities.set(data || []);
      },
      error: (err) => {
        console.error('Failed to load authorities in task sets:', err);
      }
    });
  }

  onTypeChange(type: any) {
    this.targetTasks = [];
    this.newTaskSetFrequency.set('');  // reset frequency so schedule fields re-evaluate
    if (type === 'INTERNAL') {
      this.ensureAuthoritiesLoaded();
      this.newTaskSetCircularId.set(null);
      this.formCircularFilter.set(null);
      // clear REGULAR-only date fields
      this.newTaskSetEndDate.set(null);
    } else if (type === 'REGULAR') {
      this.ensureCircularsLoaded();
      this.newTaskSetAuthorityId.set(null);
      // clear INTERNAL-only fields
      this.resetInternalFields();
    }
  }

  private resetInternalFields() {
    this.newTaskSetReferenceNo.set('');
    this.newTaskSetReportingTime.set('');
    this.newTaskSetDueTime.set('');
    this.newTaskSetReportingDayOfWeek.set(null);
    this.newTaskSetDueDayOfWeek.set(null);
    this.newTaskSetReportingDaysOfMonth.set('');
    this.newTaskSetDueDaysOfMonth.set('');
    this.newTaskSetReportingSchedule.set('');
    this.newTaskSetDueSchedule.set('');
  }

  openCreateModal() { // Kept method name since html uses it, but it opens the form drawer
    this.isEditMode = false;
    this.selectedTaskSet = null;
    this.activeDueDaysPreset.set(null);
    this.newTaskSetType.set('REGULAR');
    this.newTaskSetName.set('');
    this.newTaskSetAuthorityId.set(null);
    this.newTaskSetCircularId.set(null);
    this.formCircularFilter.set(null);
    this.newTaskSetStartDate.set(null);
    this.newTaskSetEndDate.set(null);
    this.newTaskSetFrequency.set('');
    this.resetInternalFields();
    this.targetTasks = [];
    if (this.branches().length === 1) {
      this.selectedBranches = [this.branches()[0]];
    } else {
      this.selectedBranches = [];
    }
    this.proposedDate.set(null);
    this.showBranchAssignment.set(true);

    // Clean any previous task due dates
    const cleanTasks = (this.rawTasks() || []).map((t: any) => ({
      ...t,
      due_date: null
    }));
    this.rawTasks.set(cleanTasks);

    // Open drawer immediately for instant response
    this.showFormDrawer.set(true);

    if (!this.rawTasks() || this.rawTasks().length === 0) {
      this.api.getApprovedTasks({ limit: 1000 }).subscribe(res => {
        this.rawTasks.set(res.data);
      });
    }
  }

  getFrequencyKeyByLabel(label: string): string {
    const entry = Object.entries(this.frequencyMap).find(([_, val]) => val === label);
    return entry ? entry[0] : label;
  }

  openFormDrawer(row: any) {
    this.isEditMode = true;
    this.selectedTaskSet = row;
    this.newTaskSetType.set(row.type || 'REGULAR');
    if ((row.type || 'REGULAR') === 'INTERNAL') {
      this.ensureAuthoritiesLoaded();
    }
    this.newTaskSetName.set(row.name || '');
    this.newTaskSetCircularId.set(row.circular_id || null);
    this.newTaskSetAuthorityId.set(row.authority_id || null);
    this.formCircularFilter.set(row.circular_id || null);
    this.newTaskSetStartDate.set(row.start_date ? new Date(row.start_date) : null);
    this.newTaskSetEndDate.set(row.end_date ? new Date(row.end_date) : null);
    this.newTaskSetFrequency.set(this.getFrequencyKeyByLabel(row.frequency || ''));
    // INTERNAL & REGULAR schedule fields
    this.newTaskSetReferenceNo.set(row.reference_no || '');
    this.newTaskSetReportingTime.set(row.reporting_time || '');
    this.newTaskSetDueTime.set(row.due_time || '');
    this.newTaskSetAssignmentTime.set(row.assignment_time || '');
    this.newTaskSetReportingDayOfWeek.set(row.reporting_day_of_week || null);
    this.newTaskSetDueDayOfWeek.set(row.due_day_of_week || null);
    this.newTaskSetAssignmentDayOfWeek.set(row.assignment_day_of_week || null);
    this.newTaskSetReportingDaysOfMonth.set(row.reporting_days_of_month || '');
    this.newTaskSetDueDaysOfMonth.set(row.due_days_of_month || '');
    this.newTaskSetAssignmentDaysOfMonth.set(row.assignment_days_of_month || '');
    this.newTaskSetReportingSchedule.set(row.reporting_schedule || '');
    this.newTaskSetDueSchedule.set(row.due_schedule || '');
    this.newTaskSetAssignmentSchedule.set(row.assignment_schedule || '');
    this.selectedBranches = [];
    this.targetTasks = [];
    this.selectionTick.set(this.selectionTick() + 1);
    this.showBranchAssignment.set(true);
    this.proposedDate.set(null);

    // Open drawer immediately for instant response
    this.loadingFormDetails.set(true);
    this.showFormDrawer.set(true);

    this.api.getTaskSet(row.id).subscribe({
      next: (details) => {
        const dateMap = new Map<number, string | null>();
        (details.tasks || []).forEach((t: any) => {
          const d = t.due_date ? t.due_date.split('T')[0] : null;
          dateMap.set(t.id, d);
        });

        const mappedIds = new Set((details.tasks || []).map((t: any) => t.id));
        const mappedBranchIds = new Set((details.branches || []).map((b: any) => b.id));

        const applyMappedTasks = (tasksToMap: any[]) => {
          const mappedRawTasks = tasksToMap.map((t: any) => {
            const rawVal = dateMap.get(t.id);
            return {
              ...t,
              due_date: this.parseToDate(rawVal) || null
            };
          });
          this.rawTasks.set(mappedRawTasks);
          this.targetTasks = mappedRawTasks.filter((t: any) => mappedIds.has(t.id));
          this.selectedBranches = this.branches().filter((b: any) => mappedBranchIds.has(b.id));
          this.loadingFormDetails.set(false);
        };

        const currentTasks = this.rawTasks();
        if (currentTasks && currentTasks.length > 0) {
          applyMappedTasks(currentTasks);
        } else {
          this.api.getApprovedTasks({ limit: 1000 }).subscribe({
            next: (res) => {
              applyMappedTasks(res.data);
            },
            error: () => this.loadingFormDetails.set(false)
          });
        }
      },
      error: () => {
        this.loadingFormDetails.set(false);
      }
    });
  }

  private formatDate(date: any): string | undefined {
    if (!date) return undefined;
    if (typeof date === 'string') {
      if (date.includes('T')) return date.split('T')[0];
      return date;
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return undefined;
  }

  saveTaskSet() {
    if (this.saving()) return;

    const missingFields: string[] = [];
    const isRegular = this.newTaskSetType() === 'REGULAR';
    const isInternal = this.newTaskSetType() === 'INTERNAL';
    const freq = this.newTaskSetFrequency();

    if (!this.newTaskSetType()) missingFields.push('Task Set Type');
    if (isRegular && !this.newTaskSetCircularId()) missingFields.push('Circular');
    if (!this.newTaskSetName() || !this.newTaskSetName().trim()) missingFields.push('Task Set Name');
    if (!this.newTaskSetFrequency()) missingFields.push('Task Set Frequency');
    if (!this.newTaskSetStartDate()) missingFields.push('Start Date');
    if (!this.newTaskSetEndDate()) missingFields.push('End Date');

    // Recurring schedule validations
    if (freq !== '6') {
      if (freq === '0') {
        if (!this.newTaskSetAssignmentTime()?.trim()) missingFields.push('Assignment Time');
        if (!this.newTaskSetDueTime()?.trim()) missingFields.push('Due Time');
        if (!this.newTaskSetReportingTime()?.trim()) missingFields.push('Reporting Time');
      }
      if (freq === '7') {
        if (!this.newTaskSetAssignmentDayOfWeek()) missingFields.push('Assignment Day of Week');
        if (!this.newTaskSetDueDayOfWeek()) missingFields.push('Due Day of Week');
        if (!this.newTaskSetReportingDayOfWeek()) missingFields.push('Reporting Day of Week');
      }
      if (freq === '1' || freq === '2') {
        if (!this.newTaskSetAssignmentDaysOfMonth()?.trim()) missingFields.push('Assignment Days of Month');
        if (!this.newTaskSetDueDaysOfMonth()?.trim()) missingFields.push('Due Days of Month');
        if (!this.newTaskSetReportingDaysOfMonth()?.trim()) missingFields.push('Reporting Days of Month');
      }
      if (['3','4','5'].includes(freq)) {
        if (!this.newTaskSetAssignmentSchedule()?.trim()) missingFields.push('Assignment Schedule');
        if (!this.newTaskSetDueSchedule()?.trim()) missingFields.push('Due Schedule');
        if (!this.newTaskSetReportingSchedule()?.trim()) missingFields.push('Reporting Schedule');
      }

      const valError = this.scheduleValidationError();
      if (valError) {
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: valError });
        return;
      }
    }

    if (missingFields.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Required Fields Missing',
        detail: `Please fill in all required fields: ${missingFields.join(', ')}.`,
        life: 5000
      });
      return;
    }

    const startDate = this.newTaskSetStartDate();
    const endDate = this.newTaskSetEndDate();
    if (isRegular && startDate && endDate && startDate > endDate) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Date Range',
        detail: 'Start Date cannot be greater than End Date.',
        life: 4000
      });
      return;
    }

    this.saving.set(true);

    const user = this.auth.currentUser();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userIdRaw = user?.id ?? storedUser?.id ?? storedUser?.user_id ?? storedUser?.userId;
    const userId = (!isNaN(Number(userIdRaw)) && userIdRaw !== null && userIdRaw !== '') ? Number(userIdRaw) : userIdRaw;
    const userName = user?.name || user?.full_name || user?.fullName || user?.username || storedUser?.name || storedUser?.full_name || storedUser?.username;
    const userRole = user?.role || user?.designation || storedUser?.role || storedUser?.designation;

    const payload: any = {
      name: this.newTaskSetName().trim(),
      type: this.newTaskSetType(),
      frequency: freq || undefined,
      start_date: this.formatDate(this.newTaskSetStartDate()),
      created_by: userId || undefined,
      created_by_id: userId || undefined,
      created_by_user_id: userId || undefined,
      user_id: userId || undefined,
      created_by_role: userRole || undefined,
      creator_role: userRole || undefined,
      created_by_name: userName || undefined,
      creator_name: userName || undefined,
      created_by_username: userName || undefined,
      // REGULAR-only fields
      circular_id: isRegular ? (this.newTaskSetCircularId() || undefined) : undefined,
      authority_id: undefined,
      end_date: isRegular ? this.formatDate(this.newTaskSetEndDate()) : undefined,
      // INTERNAL-only fields
      reference_no: isInternal ? (this.newTaskSetReferenceNo()?.trim() || undefined) : undefined,
      // Frequency schedule fields (apply to both REGULAR and INTERNAL if freq != '6')
      assignment_time: (freq === '0') ? (this.newTaskSetAssignmentTime()?.trim() || undefined) : undefined,
      reporting_time: (freq === '0') ? (this.newTaskSetReportingTime()?.trim() || undefined) : undefined,
      due_time: (freq === '0') ? (this.newTaskSetDueTime()?.trim() || undefined) : undefined,
      
      assignment_day_of_week: (freq === '7') ? (this.newTaskSetAssignmentDayOfWeek() || undefined) : undefined,
      reporting_day_of_week: (freq === '7') ? (this.newTaskSetReportingDayOfWeek() || undefined) : undefined,
      due_day_of_week: (freq === '7') ? (this.newTaskSetDueDayOfWeek() || undefined) : undefined,
      
      assignment_days_of_month: (freq === '1' || freq === '2') ? (this.newTaskSetAssignmentDaysOfMonth()?.trim() || undefined) : undefined,
      reporting_days_of_month: (freq === '1' || freq === '2') ? (this.newTaskSetReportingDaysOfMonth()?.trim() || undefined) : undefined,
      due_days_of_month: (freq === '1' || freq === '2') ? (this.newTaskSetDueDaysOfMonth()?.trim() || undefined) : undefined,
      
      assignment_schedule: (['3','4','5'].includes(freq)) ? (this.newTaskSetAssignmentSchedule()?.trim() || undefined) : undefined,
      reporting_schedule: (['3','4','5'].includes(freq)) ? (this.newTaskSetReportingSchedule()?.trim() || undefined) : undefined,
      due_schedule: (['3','4','5'].includes(freq)) ? (this.newTaskSetDueSchedule()?.trim() || undefined) : undefined,
    };

    const finalizeAssignments = (setId: number) => {
      // Map tasks
      const taskIds = this.targetTasks.map(t => t.id);
      const branchIds = this.selectedBranches.map(b => b.id);
      const d20 = new Date();
      d20.setDate(d20.getDate() + 20);
      const default20DaysStr = d20.toISOString().split('T')[0];
      const fallbackDate = this.formatDate(this.newTaskSetEndDate()) || default20DaysStr;

      const taskTimelines = this.targetTasks.map(t => ({
        task_id: t.id,
        due_date: (t.due_date ? this.formatDate(t.due_date) : fallbackDate) || default20DaysStr
      }));

      this.api.updateTaskSetMapping(setId, taskIds, taskTimelines).subscribe({
        next: () => {
          this.api.updateTaskSetBranches(setId, branchIds).subscribe({
            next: () => {
              if (branchIds && branchIds.length > 0) {
                this.api.generateAssignments(setId).subscribe({
                  next: () => {
                    this.saving.set(false);
                    this.showFormDrawer.set(false);
                    this.loadData();
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Successful',
                      detail: this.isEditMode ? 'Task set updated and assignments generated.' : 'Task set created and assignments generated for selected units.',
                      life: 3000
                    });
                  },
                  error: () => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate assignments' });
                  }
                });
              } else {
                this.saving.set(false);
                this.showFormDrawer.set(false);
                this.loadData();
                this.messageService.add({
                  severity: 'success',
                  summary: 'Successful',
                  detail: this.isEditMode ? 'Task set updated successfully.' : 'Task set created successfully.',
                  life: 3000
                });
              }
            },
            error: () => {
              this.saving.set(false);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update branch mappings' });
            }
          });
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update task set mappings' });
        }
      });
    };

    if (this.isEditMode && this.selectedTaskSet) {
      this.api.updateTaskSet(this.selectedTaskSet.id, payload).subscribe({
        next: () => {
          finalizeAssignments(this.selectedTaskSet.id);
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update task set' });
        }
      });
    } else {
      this.api.createTaskSet(payload).subscribe({
        next: (newSet) => {
          finalizeAssignments(newSet.id);
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create task set' });
        }
      });
    }
  }


  reopenTaskSet(row: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to reopen "${row.name}" for recompliance? All associated branch assignments will be set back to Pending.`,
      header: 'Confirm Reopen',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'warning', label: 'Reopen' },
      rejectButtonProps: { severity: 'secondary', label: 'Cancel' },
      accept: () => {
        this.api.reopenTaskSet(row.id).subscribe(() => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Reopened ${row.name} for recompliance` });
        });
      }
    });
  }

  deleteTaskSet(row: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${row.name}" Task Set?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonProps: { severity: 'danger', label: 'Delete' },
      rejectButtonProps: { severity: 'secondary', label: 'Cancel' },
      accept: () => {
        this.api.deleteTaskSet(row.id).subscribe(() => {
          this.loadData();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task set deleted' });
        });
      }
    });
  }

  triggerAssignmentGeneration(row: any) {
    if (this.generatedTaskSetIds.has(row.id)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Already Generated',
        detail: `Assignments for "${row.name}" have already been generated.`,
        life: 4000
      });
      return;
    }

    const loadingKey = `${row.id}:generate`;
    this.loadingRowIds.update(set => {
      const newSet = new Set(set);
      newSet.add(loadingKey);
      return newSet;
    });

    this.api.generateAssignments(row.id).subscribe({
      next: (res) => {
        this.loadingRowIds.update(set => {
          const newSet = new Set(set);
          newSet.delete(loadingKey);
          return newSet;
        });

        this.messageService.clear();
        if (res.generated === 0) {
          if (res.skipped === 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Branches Assigned',
              detail: `You haven't assigned any departments/branches to "${row.name}". Please edit the task set and assign them before generating assignments.`,
              life: 6000
            });
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Already Created',
              detail: `Assignments for "${row.name}" have already been created for this period. No new assignments generated.`,
              life: 5000
            });
          }
        } else {
          this.generatedTaskSetIds.add(row.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Generated ${res.generated} new assignments, skipped ${res.skipped} existing.`
          });
        }
      },
      error: (err) => {
        this.loadingRowIds.update(set => {
          const newSet = new Set(set);
          newSet.delete(loadingKey);
          return newSet;
        });
        this.messageService.clear();
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to auto-generate assignments: ' + (err.error?.message || err.message || err.statusText)
        });
      }
    });
  }
}

