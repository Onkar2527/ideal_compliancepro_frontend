import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { TableComponent, TableColumn, TableAction } from '../../shared/components/table/table.component';
import { TextFieldComponent } from '../../shared/components/form/text-field/text-field.component';
import { PageComponent } from '../../shared/components/page/page.component';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-task-headers',
  standalone: true,
  imports: [CommonModule, FormsModule, TableComponent, TextFieldComponent, DialogModule, DrawerModule, ButtonModule, ToastModule, ConfirmDialogModule, SelectModule, TagModule],
  template: `
    <div class="card">
      <div class="flex align-items-center justify-content-between mb-4">
        <div>
          <h5 class="m-0 text-xl font-semibold">Task Headers Master</h5>
          <p class="text-sm text-500 m-0 mt-1">Manage Main Domains and Sub-Headers hierarchy</p>
        </div>
      </div>
        <app-table
          [data]="headers()"
          [columns]="columns"
          [actions]="actions"
          (onAdd)="openModal()"
          (onRefresh)="loadHeaders(true)"
        ></app-table>
      </div>

    <p-drawer
        [visible]="showModal()"
        (visibleChange)="showModal.set($event)"
        position="right"
        [style]="{ width: '480px', maxWidth: '96vw' }"
        [modal]="true"
        [dismissible]="true"
        [showCloseIcon]="false"
        styleClass="drawer-layout"
        appendTo="body"
      >
        <ng-template pTemplate="header">
          <div class="drawer-header-row">
            <div class="drawer-title-wrap">
              <span class="drawer-title-icon">
                <i class="pi pi-tags"></i>
              </span>
              <div>
                <div class="text-900 font-semibold text-xl">{{ editingId ? 'Edit Task Header' : 'New Task Header' }}</div>
                <div class="text-600 text-sm mt-1">Configure Main Domain or Sub-Header</div>
              </div>
            </div>
            <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="showModal.set(false)"></button>
          </div>
        </ng-template>

        <ng-template pTemplate="content">
          <div class="drawer-content-shell">
            <section class="drawer-section">
              <div class="section-heading">
                <span class="section-kicker">Header Info</span>
                <span class="section-line"></span>
              </div>
              <div class="grid formgrid p-fluid drawer-form-grid">
                <div class="field col-12">
                  <app-text-field
                    label="Header Name"
                    [field]="headerName"
                    [required]="true"
                    placeholder="e.g. IT Asset Management"
                    [error]="submitted() && !headerName() ? 'Name is required' : ''">
                  </app-text-field>
                </div>
                <div class="field col-12">
                  <label class="font-medium text-sm text-700 mb-1 block">Parent Header (Main Domain)</label>
                  <p-select
                    [options]="mainHeaderOptions()"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Parent Header (or None for Main Header)"
                    [ngModel]="parentId()"
                    (ngModelChange)="parentId.set($event)"
                    [filter]="true"
                    filterBy="label"
                    [showClear]="true"
                    styleClass="w-full">
                  </p-select>
                  <small class="text-500 text-xs mt-1 block">Leave empty if this is a top-level Main Header (Domain).</small>
                </div>
                <div class="field col-12">
                  <label class="font-medium text-sm text-700 mb-1 block">Assigned Department / Branch</label>
                  <p-select
                    [options]="departmentOptions()"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Assigned Department / Branch"
                    [ngModel]="defaultBranchId()"
                    (ngModelChange)="defaultBranchId.set($event)"
                    [filter]="true"
                    filterBy="label"
                    [showClear]="true"
                    styleClass="w-full">
                  </p-select>
                  <small class="text-500 text-xs mt-1 block">Auto-selects this department when creating task sets for this header.</small>
                </div>
              </div>
            </section>
          </div>
        </ng-template>

        <ng-template pTemplate="footer">
          <div class="drawer-footer-row">
            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="showModal.set(false)"></button>
            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-primary" [loading]="saving()" [disabled]="saving()" (click)="save()"></button>
          </div>
        </ng-template>
      </p-drawer>
  `,
  styles: [`
    :host ::ng-deep .drawer-layout .p-drawer-content {
      display: flex;
      flex-direction: column;
      padding: 0;
      background: var(--surface-ground);
    }

    :host ::ng-deep .drawer-layout .p-drawer-header {
      padding: 1.15rem 1.35rem;
      border-bottom: 1px solid var(--surface-200);
      background: var(--surface-card);
    }

    :host ::ng-deep .drawer-layout .p-drawer-footer {
      padding: 0;
      border-top: 1px solid var(--surface-200);
      background: var(--surface-card);
      box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.06);
    }

    .drawer-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
    }

    .drawer-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
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
  `]
})
export class TaskHeadersComponent implements OnInit {
  private api = inject(ComplianceApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  headers = signal<any[]>([]);
  departments = signal<any[]>([]);
  showModal = signal(false);
  saving = signal(false);
  
  headerName = signal('');
  parentId = signal<number | null>(null);
  defaultBranchId = signal<number | null>(null);
  submitted = signal(false);
  editingId: number | null = null;

  mainHeaderOptions = computed(() => {
    const list = this.headers() || [];
    const mainOnly = list.filter((h: any) => !h.parent_id);
    return [
      { label: 'None (Top-Level Main Domain)', value: null },
      ...mainOnly.map((h: any) => ({ label: h.name, value: h.id }))
    ];
  });

  departmentOptions = computed(() => {
    const list = this.departments() || [];
    return [
      { label: 'None (No Default Assigned)', value: null },
      ...list.map((d: any) => ({ label: `${d.name} (${d.type || 'DEPT'})`, value: d.id }))
    ];
  });

  columns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '70px' },
    { field: 'name', header: 'Header Name', width: '30%' },
    { field: 'header_type', header: 'Type', type: 'badge', width: '120px' },
    { field: 'parent_name', header: 'Parent Domain', width: '22%' },
    { field: 'default_department', header: 'Assigned Dept / Branch', width: '22%' },
    { field: 'created_at', header: 'Created', type: 'date', pipeFormat: 'mediumDate', width: '110px' }
  ];

  actions: TableAction[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: (row: any) => this.editHeader(row)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'text-red-500',
      command: (row: any) => this.deleteHeader(row)
    }
  ];

  ngOnInit() {
    this.loadHeaders();
    this.loadDepartments();
  }

  loadDepartments() {
    this.api.getBranches().subscribe({
      next: (data: any[]) => this.departments.set(data || []),
      error: (err) => console.error('Failed to load branches in task headers:', err)
    });
  }

  loadHeaders(isRefresh = false) {
    this.api.getBranches().subscribe((branches: any[]) => {
      const branchList = branches || [];
      this.departments.set(branchList);
      const branchMap = new Map<number, string>(branchList.map((b: any) => [b.id, b.name]));

      this.api.getTaskHeaders().subscribe({
        next: (data: any[]) => {
          const raw = data || [];
          const nameMap = new Map<number, string>(raw.map((h: any) => [h.id, h.name]));

          const enriched = raw.map((h: any) => ({
            ...h,
            header_type: h.parent_id ? 'Sub-Header' : 'Main Domain',
            parent_name: h.parent_id ? (nameMap.get(h.parent_id) || 'Parent #' + h.parent_id) : '—',
            default_department: h.default_branch_id ? (branchMap.get(h.default_branch_id) || 'Dept #' + h.default_branch_id) : '—'
          }));

          this.headers.set(enriched);
          if (isRefresh) {
            this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Task headers list refreshed', life: 2500 });
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load task headers' });
        }
      });
    });
  }

  openModal() {
    this.editingId = null;
    this.headerName.set('');
    this.parentId.set(null);
    this.defaultBranchId.set(null);
    this.submitted.set(false);
    this.showModal.set(true);
  }

  editHeader(row: any) {
    this.editingId = row.id;
    this.headerName.set(row.name);
    this.parentId.set(row.parent_id || null);
    this.defaultBranchId.set(row.default_branch_id || null);
    this.submitted.set(false);
    this.showModal.set(true);
  }

  deleteHeader(row: any) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete ' + (row.name || 'this task header') + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.deleteTaskHeader(row.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Task Header Deleted', life: 3000 });
            this.loadHeaders();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete task header' });
          }
        });
      }
    });
  }

  save() {
    this.submitted.set(true);
    if (!this.headerName().trim()) {
      return;
    }

    this.saving.set(true);
    const parentIdVal = this.parentId();
    const branchIdVal = this.defaultBranchId();

    if (this.editingId) {
      this.api.updateTaskHeader(this.editingId, this.headerName().trim(), parentIdVal, branchIdVal).subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Task Header Updated', life: 3000 });
          this.showModal.set(false);
          this.loadHeaders();
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update task header' });
        }
      });
    } else {
      this.api.createTaskHeader(this.headerName().trim(), parentIdVal, branchIdVal).subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Task Header Created', life: 3000 });
          this.showModal.set(false);
          this.loadHeaders();
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create task header' });
        }
      });
    }
  }
}
