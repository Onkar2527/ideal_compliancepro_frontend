import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ComplianceApiService, Authority } from '../../../core/services/api/compliance-api.service';
import { TableComponent, TableColumn, TableAction } from '../../../shared/components/table/table.component';
import { TextFieldComponent } from '../../../shared/components/form/text-field/text-field.component';
import { PageComponent } from '../../../shared/components/page/page.component';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-authorities',
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
    TextFieldComponent
  ],
  templateUrl: './authorities.html',
  styleUrls: ['./authorities.scss']
})
export class Authorities implements OnInit {
  private apiService = inject(ComplianceApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  authorities = signal<Authority[]>([]);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);

  authorityDialog = signal<boolean>(false);

  // Form signals
  authId = signal<number | null>(null);
  authName = signal<string>('');
  authSourceUrl = signal<string>('');
  submitted = signal<boolean>(false);

  tableColumns: TableColumn[] = [
    { field: 'name', header: 'Name', width: '40%' },
    { field: 'source_url', header: 'Source URL', width: '35%' }
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: (row) => this.editAuthority(row)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'text-red-500',
      command: (row) => this.deleteAuthority(row)
    }
  ];

  ngOnInit() {
    this.loadAuthorities();
  }

  loadAuthorities(isRefresh = false) {
    this.loading.set(true);
    this.apiService.getAuthorities().subscribe({
      next: (data) => {
        this.authorities.set(data);
        this.loading.set(false);
        if (isRefresh) {
          this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Authorities list refreshed', life: 2500 });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load authorities' });
        this.loading.set(false);
      }
    });
  }

  openNew() {
    this.authId.set(null);
    this.authName.set('');
    this.authSourceUrl.set('');
    this.submitted.set(false);
    this.authorityDialog.set(true);
  }

  editAuthority(auth: Authority) {
    this.authId.set(auth.id);
    this.authName.set(auth.name);
    this.authSourceUrl.set(auth.source_url || '');
    this.authorityDialog.set(true);
  }

  deleteAuthority(auth: Authority) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete ' + auth.name + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiService.deleteAuthority(auth.id).subscribe({
          next: () => {
            this.authorities.update(auths => auths.filter((val) => val.id !== auth.id));
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Authority Deleted', life: 3000 });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete authority' });
          }
        });
      }
    });
  }

  hideDialog() {
    this.authorityDialog.set(false);
    this.submitted.set(false);
  }

  saveAuthority() {
    this.submitted.set(true);

    if (this.authName().trim()) {
      this.saving.set(true);
      const trimmedUrl = this.authSourceUrl()?.trim() || null;
      const payload: any = {
        name: this.authName(),
        source_url: trimmedUrl
      };

      const id = this.authId();
      if (id) {
        this.apiService.updateAuthority(id, payload).subscribe({
          next: (res) => {
            this.saving.set(false);
            this.authorities.update(auths => {
              const index = auths.findIndex((a) => a.id === id);
              if (index !== -1) auths[index] = res;
              return [...auths];
            });
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Authority Updated', life: 3000 });
            this.authorityDialog.set(false);
          },
          error: () => {
            this.saving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update authority' });
          }
        });
      } else {
        this.apiService.createAuthority(payload).subscribe({
          next: (res) => {
            this.saving.set(false);
            this.authorities.update(auths => [res, ...auths]);
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Authority Created', life: 3000 });
            this.authorityDialog.set(false);
          },
          error: () => {
            this.saving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create authority' });
          }
        });
      }
    }
  }
}
