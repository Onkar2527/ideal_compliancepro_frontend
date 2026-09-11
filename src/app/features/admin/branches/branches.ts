import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ComplianceApiService } from '../../../core/services/api/compliance-api.service';
import { TableComponent, TableColumn, TableAction } from '../../../shared/components/table/table.component';
import { TextFieldComponent } from '../../../shared/components/form/text-field/text-field.component';
import { SelectFieldComponent } from '../../../shared/components/form/select-field/select-field.component';
import { PageComponent } from '../../../shared/components/page/page.component';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    DrawerModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    TableComponent,
    TextFieldComponent,
    SelectFieldComponent,
    SelectModule
  ],
  templateUrl: './branches.html',
  styleUrls: ['./branches.scss']
})
export class Branches implements OnInit {
  private apiService = inject(ComplianceApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  branches = signal<any[]>([]);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);

  // Type filter signals
  selectedTypeFilter = signal<string | null>(null);
  filterOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Branches', value: 'BRANCH' },
    { label: 'Main Departments', value: 'MAIN_DEPT' },
    { label: 'Sub-Departments', value: 'SUB_DEPT' }
  ];

  filteredBranches = computed(() => {
    const list = this.branches();
    const filter = this.selectedTypeFilter();
    if (!filter || filter === 'ALL') {
      return list;
    }
    if (filter === 'MAIN_DEPT') {
      return list.filter(b => b.type === 'DEPARTMENT' && !b.parent_id);
    }
    if (filter === 'SUB_DEPT') {
      return list.filter(b => b.type === 'DEPARTMENT' && !!b.parent_id);
    }
    return list.filter(b => b.type === filter);
  });

  branchDialog = signal<boolean>(false);
  
  // Form signals
  branchId = signal<number | null>(null);
  branchName = signal<string>('');
  branchType = signal<string | null>('BRANCH');
  parentId = signal<number | null>(null);
  submitted = signal<boolean>(false);

  branchTypes = [
    { label: 'Branch', value: 'BRANCH' },
    { label: 'Department', value: 'DEPARTMENT' }
  ];

  parentDepartmentOptions = computed(() => {
    const currentId = this.branchId();
    // Only top-level departments can be parents, excluding itself to avoid cycles
    const topDepts = this.branches().filter(b => 
      b.type === 'DEPARTMENT' && 
      !b.parent_id && 
      (!currentId || b.id !== currentId)
    );
    return topDepts.map(d => ({ label: d.name, value: d.id }));
  });

  tableColumns: TableColumn[] = [
    { field: 'name', header: 'Name', width: '35%' },
    { field: 'type', header: 'Type', width: '25%' },
    { field: 'parent_name', header: 'Parent Department', width: '40%' }
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: (row) => this.editBranch(row)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'text-red-500',
      command: (row) => this.deleteBranch(row)
    }
  ];

  ngOnInit() {
    this.loadBranches();
  }

  loadBranches(isRefresh = false) {
    this.loading.set(true);
    this.apiService.getBranches().subscribe({
      next: (data) => {
        // Compute parent_name on client side if not already populated from API
        const deptMap = new Map(data.map((b: any) => [b.id, b.name]));
        const enriched = data.map((b: any) => ({
          ...b,
          parent_name: b.parent_name || (b.parent_id ? deptMap.get(b.parent_id) : '—')
        }));
        this.branches.set(enriched);
        this.loading.set(false);
        if (isRefresh) {
          this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Branches & Departments list refreshed', life: 2500 });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load branches' });
        this.loading.set(false);
      }
    });
  }

  openNew() {
    this.branchId.set(null);
    this.branchName.set('');
    this.branchType.set('DEPARTMENT');
    this.parentId.set(null);
    this.submitted.set(false);
    this.branchDialog.set(true);
  }

  editBranch(br: any) {
    this.branchId.set(br.id);
    this.branchName.set(br.name);
    this.branchType.set(br.type);
    this.parentId.set(br.parent_id || null);
    this.branchDialog.set(true);
  }

  deleteBranch(br: any) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete ' + br.name + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiService.deleteBranch(br.id).subscribe({
          next: () => {
            this.branches.update(list => list.filter((val) => val.id !== br.id));
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Branch Deleted', life: 3000 });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete branch' });
          }
        });
      }
    });
  }

  hideDialog() {
    this.branchDialog.set(false);
    this.submitted.set(false);
  }

  saveBranch() {
    this.submitted.set(true);

    if (this.branchName().trim() && this.branchType()) {
      this.saving.set(true);
      const payload: any = {
        name: this.branchName().trim(),
        type: this.branchType(),
        parent_id: this.branchType() === 'DEPARTMENT' ? this.parentId() : null
      };

      const id = this.branchId();
      if (id) {
        this.apiService.updateBranch(id, payload).subscribe({
          next: (res) => {
            this.saving.set(false);
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Branch / Department Updated', life: 3000 });
            this.branchDialog.set(false);
            this.loadBranches();
          },
          error: () => {
            this.saving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update branch' });
          }
        });
      } else {
        this.apiService.createBranch(payload).subscribe({
          next: (res) => {
            this.saving.set(false);
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Branch / Department Created', life: 3000 });
            this.branchDialog.set(false);
            this.loadBranches();
          },
          error: () => {
            this.saving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create branch' });
          }
        });
      }
    }
  }
}
