import { Component, OnInit, inject, signal } from '@angular/core';
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
import { CheckboxFieldComponent } from '../../../shared/components/form/checkbox-field/checkbox-field.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { PageComponent } from '../../../shared/components/page/page.component';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-users',
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
    CheckboxFieldComponent,
    MultiSelectModule
  ],
  templateUrl: './users.html',
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
export class Users implements OnInit {
  private apiService = inject(ComplianceApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  users = signal<any[]>([]);
  rawBranches = signal<any[]>([]);
  branches = signal<any[]>([]);
  loading = signal<boolean>(true);
  saving = signal(false);

  userDialog = signal<boolean>(false);

  // Form signals
  userId = signal<string | null>(null);
  username = signal<string>('');
  fullName = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');
  role = signal<string | null>('BRANCH_USER');
  branchId = signal<number | null>(null);
  managedBranchIds = signal<number[]>([]);
  isActive = signal<boolean>(true);
  
  onRoleChange(newRole: string | null) {
    if (newRole === 'CO' || newRole === 'CCO') {
      this.branchId.set(null);
    } else {
      this.managedBranchIds.set([]);
    }
    this.updateBranchOptions();
  }

  submitted = signal<boolean>(false);

  roles = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Chief Compliance Officer (CCO)', value: 'CCO' },
    { label: 'Compliance Officer (CO)', value: 'CO' },
    { label: 'Branch User', value: 'BRANCH_USER' }
  ];

  tableColumns: TableColumn[] = [
    { field: 'username', header: 'Username', width: '15%' },
    { field: 'full_name', header: 'Full Name', width: '20%' },
    { field: 'role', header: 'Role', width: '15%' },
    { field: 'branch_name', header: 'Branch', width: '20%' },
    { field: 'is_active', header: 'Status', width: '10%', type: 'boolean' }
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: (row) => this.editUser(row)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'text-red-500',
      command: (row) => this.deleteUser(row)
    }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData(isRefresh = false) {
    this.loading.set(true);
    this.apiService.getBranches().subscribe(br => {
      this.rawBranches.set(br);
      this.updateBranchOptions();
      this.apiService.getUsers().subscribe({
        next: (data) => {
          const deptMap = new Map(br.map((b: any) => [b.id, b.name]));
          const branchMap = new Map(br.map((b: any) => {
            const pName = b.parent_id ? deptMap.get(b.parent_id) : null;
            return [b.id, pName ? `${pName} → ${b.name}` : b.name];
          }));
          const transformed = data.map((u: any) => {
            if ((u.role === 'CO' || u.role === 'CCO') && (!u.branch_name || u.branch_name === '—')) {
              if (u.managed_branch_ids && u.managed_branch_ids.length > 0) {
                const names = u.managed_branch_ids.map((id: number) => branchMap.get(id)).filter(Boolean);
                return { ...u, branch_name: names.length > 0 ? names.join(', ') : 'All Branches' };
              } else {
                return { ...u, branch_name: 'All Branches' };
              }
            }
            if (u.branch_id && branchMap.has(u.branch_id)) {
              return { ...u, branch_name: branchMap.get(u.branch_id) };
            }
            return u;
          });
          this.users.set(transformed);
          this.loading.set(false);
          if (isRefresh) {
            this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Users list refreshed', life: 2500 });
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users' });
          this.loading.set(false);
        }
      });
    });
  }

  updateBranchOptions() {
    const raw = this.rawBranches();
    const deptMap = new Map(raw.map((b: any) => [b.id, b.name]));
    const options = raw.map(b => {
      const parentName = b.parent_id ? deptMap.get(b.parent_id) : null;
      return {
        label: parentName ? `${parentName} → ${b.name}` : b.name,
        value: b.id
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    this.branches.set(options);
  }

  openNew() {
    this.userId.set(null);
    this.username.set('');
    this.fullName.set('');
    this.email.set('');
    this.password.set('');
    this.role.set('BRANCH_USER');
    this.branchId.set(null);
    this.managedBranchIds.set([]);
    this.isActive.set(true);
    this.submitted.set(false);
    this.updateBranchOptions();
    this.userDialog.set(true);
  }

  editUser(u: any) {
    this.userId.set(u.id);
    this.username.set(u.username);
    this.fullName.set(u.full_name);
    this.email.set(u.email || '');
    this.password.set(''); // Empty by default on edit
    this.role.set(u.role);
    this.branchId.set(u.branch_id);
    this.managedBranchIds.set(u.managed_branch_ids || []);
    this.isActive.set(u.is_active);

    this.submitted.set(false);
    this.updateBranchOptions();
    this.userDialog.set(true);
  }

  deleteUser(u: any) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete user ' + u.username + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiService.deleteUser(u.id).subscribe({
          next: () => {
            this.users.update(list => list.filter((val) => val.id !== u.id));
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'User Deleted', life: 3000 });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete user' });
          }
        });
      }
    });
  }

  hideDialog() {
    this.userDialog.set(false);
    this.submitted.set(false);
  }

  saveUser() {
    this.submitted.set(true);

    const isNew = !this.userId();
    // For new users, password is required
    const isPasswordValid = !isNew || !!this.password().trim();
    const isEmailValid = !!this.email().trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim());

    if (this.username().trim() && this.fullName().trim() && this.role() && isPasswordValid && isEmailValid) {
      this.saving.set(true);
      const payload: any = {
        username: this.username(),
        full_name: this.fullName(),
        email: this.email(),
        role: this.role(),
        branch_id: (this.role() !== 'CO' && this.role() !== 'CCO') ? this.branchId() : null,
        managed_branch_ids: (this.role() === 'CO' || this.role() === 'CCO') ? this.managedBranchIds() : [],
        is_active: this.isActive()
      };

      if (this.password()) {
        payload.password = this.password();
      }

      const id = this.userId();
      if (id) {
        this.apiService.updateUser(id, payload).subscribe({
          next: (res) => {
            this.saving.set(false); // Turn off loader on update success
            this.users.update(list => {
              const index = list.findIndex((u) => u.id === id);
              if (index !== -1) {
                list[index] = { ...list[index], ...res };
                const branch = this.branches().find(b => b.value === res.branch_id);
                if (branch) list[index].branch_name = branch.label;
              }
              return [...list];
            });
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'User Updated', life: 3000 });
            this.userDialog.set(false);
            this.loadData();
          },
          error: () => {
            this.saving.set(false); // Turn off loader on update error
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update user' });
          }
        });
      } else {
        this.apiService.createUser(payload).subscribe({
          next: (res) => {
            this.saving.set(false); // Turn off loader on create success
            const branch = this.branches().find(b => b.value === res.branch_id);
            if (branch) res.branch_name = branch.label;

            this.users.update(list => [res, ...list]);
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'User Created', life: 3000 });
            this.userDialog.set(false);
            this.loadData();
          },
          error: () => {
            this.saving.set(false); // Turn off loader on create error
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create user' });
          }
        });
      }
    }
  }
}
