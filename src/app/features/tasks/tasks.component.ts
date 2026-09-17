import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComplianceApiService, ComplianceTask } from '../../core/services/api/compliance-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { PageComponent } from '../../shared/components/page/page.component';
import { TableComponent, TableColumn, TableAction } from '../../shared/components/table/table.component';
import { TextareaFieldComponent } from '../../shared/components/form/textarea-field/textarea-field.component';
import { SelectFieldComponent } from '../../shared/components/form/select-field/select-field.component';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { BulkUploadComponent } from './bulk-upload/bulk-upload.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DialogModule, DrawerModule, ButtonModule, TabsModule, TableComponent, TextareaFieldComponent, SelectFieldComponent, SelectModule, TableModule, ToastModule, TagModule, FileUploadModule, BulkUploadComponent, ConfirmDialogModule],
  template: `
    @if (cameFromCirculars() && currentCircular()) {
      <div class="card mb-4 surface-card border-round border-1 surface-border p-3 flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
        <div class="flex-1">
          <div class="flex align-items-center gap-2 mb-2 flex-wrap">
            <span class="text-xs font-semibold px-2 py-0.5 bg-primary-100 text-primary-900 border-round">
              {{ currentCircular()?.authority_name || 'Circular' }}
            </span>
            <span class="text-xs font-medium text-500">Ref: {{ currentCircular()?.reference_no || 'N/A' }}</span>
            <span class="text-xs font-medium text-500">Date: {{ currentCircular()?.published_date | date:'dd MMM yyyy' }}</span>
            <p-tag [value]="currentCircular()?.priority || 'Medium'" [severity]="prioritySeverity(currentCircular()?.priority || '')"></p-tag>
          </div>
          <h6 class="m-0 text-lg font-bold text-900 line-height-3" style="font-size: 1.1rem;">{{ currentCircular()?.title }}</h6>
          <p class="m-0 text-xs text-600 mt-1" style="max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            {{ currentCircular()?.description || 'No description provided.' }}
          </p>
        </div>
        <div class="flex align-items-center gap-2 flex-shrink-0">
          @if (currentCircular()?.file_url) {
            <a [href]="getFileUrl(currentCircular()?.file_url)" target="_blank" class="p-button p-button-outlined p-button-secondary p-button-sm flex align-items-center gap-2" style="text-decoration: none;">
              <i class="pi pi-file-pdf"></i><span>Download PDF</span>
            </a>
          }
          @if (cameFromChat()) {
            <button pButton pRipple type="button" icon="pi pi-comments" label="Back to AI Chat" class="p-button-outlined p-button-primary p-button-sm" (click)="goToAIChat()"></button>
          }
          <button *ngIf="pendingCount() > 0"
                  pButton pRipple type="button" 
                  icon="pi pi-check-circle" 
                  [label]="'Approve All (' + pendingCount() + ')'" 
                  class="p-button-success p-button-sm" 
                  [loading]="approvingAll()"
                  (click)="approveAllPendingTasks()"></button>
          @if (canAccessTaskSets()) {
            <button pButton pRipple type="button" icon="pi pi-list-check" label="Go to Task Set Master" class="p-button-outlined p-button-success p-button-sm" (click)="goToTaskSets()"></button>
          }
          <button pButton pRipple type="button" icon="pi pi-arrow-left" label="Back to Circulars" class="p-button-outlined p-button-secondary p-button-sm" (click)="goBackToCirculars()"></button>
        </div>
      </div>
    }

    <div class="card">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold">Task Master</h5>
        <div class="flex align-items-center gap-2">
          @if (cameFromCirculars() && !currentCircular()) {
            <button
              pButton
              type="button"
              icon="pi pi-arrow-left"
              label="Back to Circulars"
              class="p-button-outlined p-button-secondary h-2.5rem flex align-items-center"
              (click)="goBackToCirculars()">
            </button>
            @if (cameFromChat()) {
              <button
                pButton
                type="button"
                icon="pi pi-comments"
                label="Back to AI Chat"
                class="p-button-outlined p-button-primary h-2.5rem flex align-items-center"
                (click)="goToAIChat()">
              </button>
            }
            @if (canAccessTaskSets()) {
              <button
                pButton
                type="button"
                icon="pi pi-list-check"
                label="Go to Task Set Master"
                class="p-button-outlined p-button-success h-2.5rem flex align-items-center"
                (click)="goToTaskSets()">
              </button>
            }
          }
        </div>
      </div>
      <div class="flex flex-column gap-3 p-3">
        <!-- Summary Stats -->
        <div class="flex gap-3">
          <div 
            class="surface-card shadow-1 p-3 border-round border-left-3 cursor-pointer flex-1 flex justify-content-between align-items-center transition-colors transition-duration-200"
            [ngClass]="{'border-primary bg-primary-50': activeFilter() === 'All', 'border-400 hover:surface-hover': activeFilter() !== 'All'}"
            (click)="setActiveFilter('All')">
            <div>
              <span class="block text-500 font-medium mb-1">Total Tasks</span>
              <div class="text-900 font-bold text-2xl">{{ totalCount() }}</div>
            </div>
            <div class="flex align-items-center justify-content-center bg-primary-100 border-round" style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-list text-primary text-xl"></i>
            </div>
          </div>
          
          <div 
            class="surface-card shadow-1 p-3 border-round border-left-3 cursor-pointer flex-1 flex justify-content-between align-items-center transition-colors transition-duration-200"
            [ngClass]="{'border-orange-500 bg-orange-50': activeFilter() === 'Pending', 'border-400 hover:surface-hover': activeFilter() !== 'Pending'}"
            (click)="setActiveFilter('Pending')">
            <div>
              <span class="block text-500 font-medium mb-1">Pending Approval</span>
              <div class="text-900 font-bold text-2xl">{{ pendingCount() }}</div>
            </div>
            <div class="flex align-items-center justify-content-center bg-orange-100 border-round" style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-clock text-orange-500 text-xl"></i>
            </div>
          </div>

          <div 
            class="surface-card shadow-1 p-3 border-round border-left-3 cursor-pointer flex-1 flex justify-content-between align-items-center transition-colors transition-duration-200"
            [ngClass]="{'border-green-500 bg-green-50': activeFilter() === 'Approved', 'border-400 hover:surface-hover': activeFilter() !== 'Approved'}"
            (click)="setActiveFilter('Approved')">
            <div>
              <span class="block text-500 font-medium mb-1">Approved Tasks</span>
              <div class="text-900 font-bold text-2xl">{{ approvedCount() }}</div>
            </div>
            <div class="flex align-items-center justify-content-center bg-green-100 border-round" style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-check text-green-500 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Unified Table -->
        <div class="flex-1 overflow-hidden flex flex-column">
          <app-table
            class="h-full flex flex-column overflow-hidden"
            [data]="allTasks()"
            [loading]="loading()"
            [columns]="tableColumns"
            [actions]="tableActions"
            [showAddButton]="canCreateTask"
            (onAdd)="openCreateManualTaskModal()"
            [showRefreshButton]="true"
            [paginator]="true"
            [rows]="limit"
            [lazy]="true"
            [totalRecords]="totalRecords()"
            (onLazyLoad)="handleLazyLoad($event)"
            (onSearch)="handleSearch($event)"
            (onRefresh)="loadTasks(true)"
          >
            <ng-container toolbar-actions>
              <div class="flex gap-2 align-items-center">
                <p-select 
                  [options]="circulars()" 
                  optionLabel="title" 
                  optionValue="id" 
                  [(ngModel)]="selectedCircularFilter" 
                  (ngModelChange)="onFilterChange()"
                  placeholder="Filter by Circular" 
                  [showClear]="true"
                  [filter]="true"
                  filterPlaceholder="Search circular..."
                  [virtualScroll]="true"
                  [virtualScrollItemSize]="38"
                  styleClass="w-20rem h-2.5rem flex align-items-center"
                ></p-select>
                <button
                  *ngIf="pendingCount() > 0"
                  pButton
                  type="button"
                  icon="pi pi-check-circle"
                  [label]="'Approve All (' + pendingCount() + ')'"
                  class="p-button-success h-2.5rem flex align-items-center"
                  style="white-space: nowrap;"
                  [loading]="approvingAll()"
                  (click)="approveAllPendingTasks()"
                ></button>
                <button
                  *ngIf="canCreateTask"
                  pButton
                  type="button"
                  icon="pi pi-upload"
                  label="Bulk Upload"
                  class="p-button-outlined p-button-secondary h-2.5rem flex align-items-center"
                  style="white-space: nowrap;"
                  (click)="openBulkUploadModal()"
                ></button>
              </div>
            </ng-container>
          </app-table>
        </div>
      </div>

      <!-- Edit Task Drawer -->
      <p-drawer
        [visible]="showEditModal()"
        (visibleChange)="showEditModal.set($event)"
        position="right"
        [style]="{ width: '760px', maxWidth: '96vw' }"
        [modal]="true"
        [dismissible]="true"
        [showCloseIcon]="false"
        styleClass="task-drawer"
        appendTo="body"
      >
        <ng-template pTemplate="header">
          <div class="drawer-header-row">
            <div class="drawer-title-wrap">
              <span class="drawer-title-icon">
                <i class="pi pi-pencil"></i>
              </span>
              <div>
                <div class="text-900 font-semibold text-xl">Edit Task Description</div>
                <div class="text-600 text-sm mt-1">Modify task fields</div>
              </div>
            </div>
            <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="showEditModal.set(false)"></button>
          </div>
        </ng-template>

        <ng-template pTemplate="content">
          @if (showEditModal()) {
            <div class="drawer-content-shell">
            <section class="drawer-section">
              <div class="section-heading">
                <span class="section-kicker">Task Details</span>
                <span class="section-line"></span>
              </div>

              <div class="grid formgrid p-fluid drawer-form-grid">
                <div class="field col-12">
                  <app-select-field
                    label="Task Header"
                    [virtualScroll]="false"
                    [field]="editTaskHeaderId"
                    [options]="taskHeaders()"
                    optionLabel="name"
                    optionValue="id"
                    [showAddButton]="true"
                    addTooltip="Add New Header"
                    (add)="activeHeaderTarget = 'EDIT'; showAddHeaderModal = true;"
                    placeholder="Select a Header (Optional)">
                  </app-select-field>
                </div>
                
                <div class="field col-12">
                  <app-select-field
                    label="Priority"
                    [virtualScroll]="false"
                    [field]="editTaskPriority"
                    [options]="priorityOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Priority">
                  </app-select-field>
                </div>

                <div class="field col-12">
                  <app-textarea-field
                    label="Description"
                    [field]="editTaskDescription"
                    [rows]="5"
                    [autoResize]="true"
                    [required]="true">
                  </app-textarea-field>
                </div>

                <div class="field col-12">
                  <label class="font-semibold text-sm text-gray-700 block mb-2">
                    Attachment (Optional) <span class="text-gray-400 text-xs font-normal">(CSV, Excel, PDF)</span>
                  </label>

                  <div *ngIf="editTaskFileUrl() && editTaskFileUrl() !== '__REMOVE__'; else editFileUpload" class="flex align-items-center justify-content-between p-3 border-round border-1 border-300 mb-2 bg-surface-card w-full gap-2">
                    <div class="flex align-items-center gap-3 min-width-0 flex-1">
                      <span class="inline-flex align-items-center justify-content-center bg-indigo-100 text-indigo-600 border-round" style="width: 2.5rem; height: 2.5rem; flex: 0 0 auto;">
                        <i class="pi pi-file text-xl"></i>
                      </span>
                      <div class="min-width-0 flex-1">
                        <div class="font-semibold text-900 text-sm" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 280px;" [title]="editTaskFileName() || 'Attached Task Document'">
                          {{ editTaskFileName() || 'Attached Task Document' }}
                        </div>
                        <a [href]="getFileUrl(editTaskFileUrl())" target="_blank" class="text-xs text-indigo-600 hover:underline">View Document</a>
                      </div>
                    </div>
                    <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded p-button-danger p-button-sm" (click)="removeTaskFile('EDIT')"></button>
                  </div>

                  <ng-template #editFileUpload>
                    <p-fileupload
                      name="editTaskFile"
                      accept=".pdf,.csv,.xlsx,.xls"
                      [multiple]="false"
                      [customUpload]="true"
                      [showUploadButton]="false"
                      [showCancelButton]="false"
                      chooseLabel="Choose File (CSV, Excel, PDF)"
                      chooseIcon="pi pi-upload"
                      styleClass="circular-file-upload"
                      (onSelect)="onTaskFileSelected($event, 'EDIT')"
                      (onRemove)="removeTaskFile('EDIT')"
                      (onClear)="removeTaskFile('EDIT')">
                      <ng-template pTemplate="file" let-file let-index="index" let-removeFileCallback="removeFileCallback">
                        <div class="flex align-items-center justify-content-between p-3 border-round border-1 border-300 mb-2 bg-surface-card w-full gap-2">
                          <div class="flex align-items-center gap-3 min-width-0 flex-1">
                            <span class="inline-flex align-items-center justify-content-center bg-indigo-100 text-indigo-600 border-round animate-fadein" style="width: 2.5rem; height: 2.5rem; flex: 0 0 auto;">
                              <i class="pi pi-file text-xl"></i>
                            </span>
                            <div class="min-width-0 flex-1">
                              <div class="font-semibold text-900 text-sm" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 280px;" [title]="file.name">{{ file.name }}</div>
                              <div class="text-xs text-600 mt-1" *ngIf="file.size">{{ (file.size / 1024 / 1024).toFixed(3) }} MB</div>
                            </div>
                          </div>
                          <div class="flex align-items-center gap-3 flex-shrink-0">
                            <span *ngIf="uploadingTaskFile()" class="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 border-round">Uploading...</span>
                            <span *ngIf="!uploadingTaskFile() && editTaskFileUrl()" class="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 border-round">Uploaded</span>
                            <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded p-button-danger p-button-sm" (click)="removeFileCallback($event, index); removeTaskFile('EDIT')"></button>
                          </div>
                        </div>
                      </ng-template>
                    </p-fileupload>
                  </ng-template>
                </div>
              </div>
            </section>
          </div>
          }
        </ng-template>

        <ng-template pTemplate="footer">
          <div class="drawer-footer-row">
            <button pButton pRipple type="button" label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="showEditModal.set(false)"></button>
            <button pButton pRipple type="button" label="Save Changes" icon="pi pi-check" [loading]="savingEdit()" [disabled]="!editTaskDescription().trim() || savingEdit()" (click)="saveEditedTask()"></button>
          </div>
        </ng-template>
      </p-drawer>

      <!-- Create Manual Task Drawer -->
      <p-drawer
        [visible]="showManualTaskModal()"
        (visibleChange)="showManualTaskModal.set($event)"
        position="right"
        [style]="{ width: '760px', maxWidth: '96vw' }"
        [modal]="true"
        [dismissible]="true"
        [showCloseIcon]="false"
        styleClass="task-drawer"
        appendTo="body"
      >
        <ng-template pTemplate="header">
          <div class="drawer-header-row">
            <div class="drawer-title-wrap">
              <span class="drawer-title-icon">
                <i class="pi pi-plus-circle"></i>
              </span>
              <div>
                <div class="text-900 font-semibold text-xl">Create Manual Task</div>
                <div class="text-600 text-sm mt-1">Create a new ad-hoc compliance task</div>
              </div>
            </div>
            <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="showManualTaskModal.set(false)"></button>
          </div>
        </ng-template>

        <ng-template pTemplate="content">
          @if (showManualTaskModal()) {
            <div class="drawer-content-shell">
            <section class="drawer-section">
              <div class="section-heading">
                <span class="section-kicker">Task Details</span>
                <span class="section-line"></span>
              </div>

              <div class="grid formgrid p-fluid drawer-form-grid">
                @if (!selectedCircularId) {
                  <div class="field col-12">
                    <app-select-field
                      label="Select Circular (Optional)"
                      [field]="manualTaskCircularId"
                      [options]="circulars()"
                      optionLabel="title"
                      optionValue="id"
                      filterBy="title"
                      [filter]="true"
                      [showClear]="true"
                      placeholder="Select a Circular (Optional)">
                    </app-select-field>
                  </div>
                }

                <div class="field col-12">
                  <app-select-field
                    label="Task Header"
                    [virtualScroll]="false"
                    [field]="manualTaskHeaderId"
                    [options]="taskHeaders()"
                    optionLabel="name"
                    optionValue="id"
                    [showAddButton]="true"
                    addTooltip="Add New Header"
                    (add)="activeHeaderTarget = 'MANUAL'; showAddHeaderModal = true;"
                    placeholder="Select a Header (Optional)">
                  </app-select-field>
                </div>

                <div class="field col-12">
                  <app-select-field
                    label="Priority"
                    [field]="manualTaskPriority"
                    [options]="priorityOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Priority"
                    [virtualScroll]="false">
                  </app-select-field>
                </div>

                <div class="field col-12">
                  <app-textarea-field
                    label="Description"
                    [field]="manualTaskDescription"
                    [rows]="5"
                    [autoResize]="true"
                    [required]="true"
                    placeholder="Enter task description">
                  </app-textarea-field>
                </div>

                <div class="field col-12">
                  <label class="font-semibold text-sm text-gray-700 block mb-2">
                    Attachment (Optional) <span class="text-gray-400 text-xs font-normal">(CSV, Excel, PDF)</span>
                  </label>

                  <p-fileupload
                    name="manualTaskFile"
                    accept=".pdf,.csv,.xlsx,.xls"
                    [multiple]="false"
                    [customUpload]="true"
                    [showUploadButton]="false"
                    [showCancelButton]="false"
                    chooseLabel="Choose File (CSV, Excel, PDF)"
                    chooseIcon="pi pi-upload"
                    styleClass="circular-file-upload"
                    (onSelect)="onTaskFileSelected($event, 'MANUAL')"
                    (onRemove)="removeTaskFile('MANUAL')"
                    (onClear)="removeTaskFile('MANUAL')">
                    <ng-template pTemplate="file" let-file let-index="index" let-removeFileCallback="removeFileCallback">
                      <div class="flex align-items-center justify-content-between p-3 border-round border-1 border-300 mb-2 bg-surface-card w-full gap-2">
                        <div class="flex align-items-center gap-3 min-width-0 flex-1">
                          <span class="inline-flex align-items-center justify-content-center bg-indigo-100 text-indigo-600 border-round animate-fadein" style="width: 2.5rem; height: 2.5rem; flex: 0 0 auto;">
                            <i class="pi pi-file text-xl"></i>
                          </span>
                          <div class="min-width-0 flex-1">
                            <div class="font-semibold text-900 text-sm" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 280px;" [title]="file.name">{{ file.name }}</div>
                            <div class="text-xs text-600 mt-1" *ngIf="file.size">{{ (file.size / 1024 / 1024).toFixed(3) }} MB</div>
                          </div>
                        </div>
                        <div class="flex align-items-center gap-3 flex-shrink-0">
                          <span *ngIf="uploadingTaskFile()" class="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 border-round">Uploading...</span>
                          <span *ngIf="!uploadingTaskFile() && manualTaskFileUrl()" class="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 border-round">Uploaded</span>
                          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded p-button-danger p-button-sm" (click)="removeFileCallback($event, index); removeTaskFile('MANUAL')"></button>
                        </div>
                      </div>
                    </ng-template>
                  </p-fileupload>
                </div>
              </div>
            </section>
          </div>
          }
        </ng-template>

        <ng-template pTemplate="footer">
          <div class="drawer-footer-row">
            <button pButton pRipple type="button" label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="showManualTaskModal.set(false)"></button>
            <button pButton pRipple type="button" label="Create Task" icon="pi pi-check" [loading]="savingManual()" [disabled]="!manualTaskDescription().trim() || savingManual()" (click)="createManualTask()"></button>
          </div>
        </ng-template>
      </p-drawer>

      <!-- Bulk Upload Tasks Drawer -->
      <app-bulk-upload
        #bulkUploadDrawer
        [visible]="showBulkUploadModal()"
        [circulars]="circulars()"
        [taskHeaders]="taskHeaders()"
        (visibleChange)="showBulkUploadModal.set($event)"
        (uploadSuccess)="loadTasks()">
      </app-bulk-upload>

      <!-- Quick Add Header Modal -->
      <p-dialog header="Add New Task Header" [(visible)]="showAddHeaderModal" [modal]="true" [style]="{ width: '100%', 'max-width': '30rem', 'margin': '1rem' }">
        <div class="flex flex-column gap-3 mt-4">
          <div class="flex flex-column gap-2">
            <label class="font-medium">Header Name</label>
            <input type="text" [(ngModel)]="newHeaderName" class="modern-input w-full" placeholder="e.g. KYC Compliance">
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button class="btn-secondary px-4 py-2" (click)="showAddHeaderModal = false">Cancel</button>
          <button class="btn-dynamic px-4 py-2" [disabled]="!newHeaderName.trim()" (click)="quickAddHeader()">Save Header</button>
        </ng-template>
    </p-dialog>
    </div>
  `,
  styles: [`
    :host ::ng-deep .task-drawer .p-drawer-content {
      display: flex;
      flex-direction: column;
      padding: 0;
    }
    
    /* Ensure active tab panel fills space */
    :host ::ng-deep .p-tabpanel {
      height: 100%;
    }

    .drawer-content-shell {
      background: var(--surface-ground);
    }

    :host ::ng-deep .task-drawer .p-drawer-header {
      padding: 1.15rem 1.35rem;
      border-bottom: 1px solid var(--surface-200);
      background: var(--surface-card);
    }

    :host ::ng-deep .task-drawer .p-drawer-footer {
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
export class TasksComponent implements OnInit {
  selectedCircularId: number | null = null;
  currentCircular = signal<any | null>(null);

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

  loading = signal<boolean>(false);
  activeFilter = signal<'All' | 'Pending' | 'Approved'>('All');

  allTasks = signal<ComplianceTask[]>([]);
  totalRecords = signal<number>(0);

  // Pagination & Filter state
  page = 1;
  limit = 10;
  searchQuery = '';
  selectedCircularFilter: number | null = null;

  totalCount = signal(0);
  pendingCount = signal(0);
  approvedCount = signal(0);

  setActiveFilter(filter: 'All' | 'Pending' | 'Approved') {
    this.activeFilter.set(filter);
    this.page = 1;
    this.loadTasks();
  }

  get activeCircularId(): number | null {
    return this.selectedCircularId || this.selectedCircularFilter || null;
  }

  onFilterChange() {
    this.page = 1;
    this.selectedCircularId = this.selectedCircularFilter || null;
    this.loadTasks();
  }

  handleSearch(query: string) {
    this.searchQuery = query;
    this.page = 1;
    this.loadTasks();
  }

  handleLazyLoad(event: any) {
    this.page = (event.first / event.rows) + 1;
    this.limit = event.rows;
    // We handle global filter (search) manually through onSearch event from table, 
    // but if table sends globalFilter in event, we can use it:
    if (event.globalFilter !== undefined) {
      this.searchQuery = event.globalFilter;
    }
    this.loadTasks();
  }

  selectedTasksList: ComplianceTask[] = [];

  tableColumns: TableColumn[] = [
    { field: 'circular_title', header: 'Circular Title', width: '20%', filterable: true },
    { field: 'authority_name', header: 'Authority', width: '15%', filterable: true },
    { field: 'header_name', header: 'Task Header', width: '15%' },
    { field: 'description', header: 'Task Description', width: '25%' },
    { field: 'created_by_name', header: 'Created By', width: '12%', filterable: true },
    {
      field: 'status',
      header: 'Status',
      type: 'badge',
      width: '10%',
      filterable: true
    }
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: (row) => this.openEditModal(row)
    },
    {
      label: 'Approve',
      icon: 'pi pi-check',
      styleClass: 'text-green-500',
      visible: (row) => row ? !row.is_approved : false,
      command: (row) => this.approveTask(row.id)
    }
  ];

  // Options
  priorityOptions = [
    { label: 'Critical', value: 'Critical' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  riskCategoryOptions = [
    { label: 'CREDIT RISK', value: 'CREDIT RISK' },
    { label: 'MARKET RISK', value: 'MARKET RISK' },
    { label: 'FINANCIAL RISK', value: 'FINANCIAL RISK' },
    { label: 'LIQUIDITY RISK', value: 'LIQUIDITY RISK' },
    { label: 'OPERATIONAL RISK', value: 'OPERATIONAL RISK' },
    { label: 'REGULATORY AND LEGAL RISK', value: 'REGULATORY AND LEGAL RISK' },
    { label: 'REPUTATIONAL RISK', value: 'REPUTATIONAL RISK' },
    { label: 'INFORMATION TECHNOLOGY RISK', value: 'INFORMATION TECHNOLOGY RISK' },
    { label: 'OTHER RESIDUAL RISK', value: 'OTHER RESIDUAL RISK' },
    { label: 'NOT APPLICABLE', value: 'NOT APPLICABLE' }
  ];

  businessRiskOptions = [
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  controlRiskOptions = [
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  // Edit Modal State
  showEditModal = signal(false);
  editingTaskId: number | null = null;
  editTaskDescription = signal('');
  editTaskHeaderId = signal<number | null>(null);
  editTaskPriority = signal<string | null>(null);
  editTaskRiskCategory = signal<string | null>(null);
  editTaskBusinessRisk = signal<string | null>(null);
  editTaskControlRisk = signal<string | null>(null);
  editTaskAuditAreaId = signal<number | null>(null);
  editTaskFileUrl = signal<string | null>(null);
  editTaskFileName = signal<string>('');

  taskHeaders = signal<any[]>([]);
  auditAreas = signal<any[]>([]);

  // Bulk Upload State
  showBulkUploadModal = signal(false);

  @ViewChild('bulkUploadDrawer') bulkUploadDrawer!: BulkUploadComponent;

  // Quick Add Header State
  showAddHeaderModal = false;
  newHeaderName = '';
  activeHeaderTarget: 'MANUAL' | 'EDIT' = 'MANUAL';

  // Manual Task Modal State
  showManualTaskModal = signal(false);
  manualTaskDescription = signal('');
  manualTaskHeaderId = signal<number | null>(null);
  manualTaskCircularId = signal<number | null>(null);
  manualTaskPriority = signal<string | null>(null);
  manualTaskRiskCategory = signal<string | null>(null);
  manualTaskBusinessRisk = signal<string | null>(null);
  manualTaskControlRisk = signal<string | null>(null);
  manualTaskAuditAreaId = signal<number | null>(null);
  manualTaskFileUrl = signal<string | null>(null);
  manualTaskFileName = signal<string>('');
  uploadingTaskFile = signal<boolean>(false);

  onTaskFileSelected(event: any, target: 'EDIT' | 'MANUAL') {
    const files = event.currentFiles || event.files || (event.target?.files ? Array.from(event.target.files) : []);
    const file = files[0];
    if (!file) return;

    this.uploadingTaskFile.set(true);
    this.api.uploadTaskFile(file).subscribe({
      next: (res) => {
        if (target === 'EDIT') {
          this.editTaskFileUrl.set(res.file_url);
          this.editTaskFileName.set(res.filename);
        } else {
          this.manualTaskFileUrl.set(res.file_url);
          this.manualTaskFileName.set(res.filename);
        }
        this.uploadingTaskFile.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File uploaded successfully' });
      },
      error: (err) => {
        this.uploadingTaskFile.set(false);
        this.messageService.add({ severity: 'error', summary: 'Upload Error', detail: err.error?.message || 'Failed to upload file' });
      }
    });
  }

  removeTaskFile(target: 'EDIT' | 'MANUAL') {
    if (target === 'EDIT') {
      this.editTaskFileUrl.set('__REMOVE__');
      this.editTaskFileName.set('');
    } else {
      this.manualTaskFileUrl.set(null);
      this.manualTaskFileName.set('');
    }
  }
  circulars = signal<any[]>([]);
  parentPage: number | null = null;
  parentLimit: number | null = null;
  cameFromCirculars = signal<boolean>(false);
  cameFromChat = signal<boolean>(false);

  get isCcoOrAdmin(): boolean {
    const role = String(this.auth.currentUser()?.role || '').toUpperCase();
    return role === 'CCO' || role === 'CO' || role === 'ADMIN' || role === 'SUPERADMIN';
  }

  get canCreateTask(): boolean {
    const role = String(this.auth.currentUser()?.role || '').toUpperCase();
    return !['VIEWER', 'AUDITOR'].includes(role);
  }

  canAccessTaskSets(): boolean {
    const role = String(this.auth.currentUser()?.role || '').toLowerCase();
    return role !== 'cco' || this.api.canCcoAccessTaskSets();
  }

  constructor(private api: ComplianceApiService, private route: ActivatedRoute, private auth: AuthService, private messageService: MessageService, private router: Router) { }

  goBackToCirculars() {
    const queryParams: any = {};
    const id = this.activeCircularId;
    if (id) {
      queryParams.highlight_id = id;
    }
    if (this.parentPage) {
      queryParams.page = this.parentPage;
    }
    if (this.parentLimit) {
      queryParams.limit = this.parentLimit;
    }
    this.router.navigate(['/circulars'], { queryParams });
  }

  goToTaskSets() {
    const queryParams: any = { came_from_tasks: true };
    const id = this.activeCircularId;
    if (id) {
      queryParams.circular_id = id;
    }
    if (this.parentPage) {
      queryParams.parent_page = this.parentPage;
    }
    if (this.parentLimit) {
      queryParams.parent_limit = this.parentLimit;
    }
    this.router.navigate(['/task-sets'], { queryParams });
  }

  goToAIChat() {
    const id = this.activeCircularId;
    if (id) {
      this.router.navigate(['/circulars', id, 'chat']);
    }
  }

  ngOnInit() {
    this.api.getTaskHeaders().subscribe(data => this.taskHeaders.set(data));
    this.api.getCirculars({ limit: 1000 }).subscribe(res => this.circulars.set(res?.data || []));
    this.api.getAuditAreas().subscribe(data => this.auditAreas.set(data));

    this.route.queryParamMap.subscribe(params => {
      const circularId = params.get('circular_id');
      const cameFromChat = params.get('came_from_chat');
      const parentPage = params.get('parent_page');
      const parentLimit = params.get('parent_limit');

      this.parentPage = parentPage ? Number(parentPage) : null;
      this.parentLimit = parentLimit ? Number(parentLimit) : null;
      this.cameFromChat.set(cameFromChat === 'true' || cameFromChat === '1');

      if (circularId) {
        this.selectedCircularId = Number(circularId);
        this.selectedCircularFilter = this.selectedCircularId;
        this.cameFromCirculars.set(true);
        this.api.getCircularById(Number(circularId)).subscribe({
          next: (data) => this.currentCircular.set(data),
          error: (err) => console.error('Failed to load circular details in tasks view:', err)
        });
      } else {
        this.selectedCircularId = null;
        this.selectedCircularFilter = null;
        this.cameFromCirculars.set(false);
        this.cameFromChat.set(false);
        this.currentCircular.set(null);
      }

      this.loadTasks();
    });
  }

  savingEdit = signal<boolean>(false);
  savingManual = signal<boolean>(false);

  loadTasks(isRefresh = false) {
    this.loading.set(true);

    const params: any = {
      page: this.page,
      limit: this.limit,
    };

    if (this.activeFilter() !== 'All') {
      params.status = this.activeFilter();
    }

    const circularId = this.selectedCircularFilter || this.selectedCircularId;
    if (circularId) {
      params.circular_id = circularId;
    }

    if (this.searchQuery) {
      params.search = this.searchQuery;
    }

    // Fetch dynamic task counts for the summary cards
    this.api.getTaskStats(circularId).subscribe({
      next: (stats) => {
        this.totalCount.set(stats.total);
        this.pendingCount.set(stats.pending);
        this.approvedCount.set(stats.approved);
      },
      error: (err) => console.error('Error fetching task stats:', err)
    });

    this.api.getTasks(params).subscribe({
      next: (res) => {
        const mappedTasks = res.data.map((t: any) => ({
          ...t,
          created_by_name: t.created_by_username || t.created_by_name || t.creator_name || (t.created_by ? `User #${t.created_by}` : '—'),
          status: t.is_approved ? 'Approved' : 'Pending'
        }));
        this.allTasks.set(mappedTasks);
        this.totalRecords.set(res.total);
        this.loading.set(false);
        if (isRefresh) {
          this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Tasks list refreshed', life: 2500 });
        }
      },
      error: () => this.loading.set(false)
    });
  }

  approvingAll = signal<boolean>(false);

  approveTask(id: number) {
    this.api.approveTask(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Task approved successfully', life: 3000 });
        this.loadTasks();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to approve task' });
      }
    });
  }

  approveAllPendingTasks() {
    const circularId = this.selectedCircularFilter || this.selectedCircularId;
    this.approvingAll.set(true);
    this.api.approveAllTasks(circularId).subscribe({
      next: (res: any) => {
        this.approvingAll.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Successfully approved ${res?.count ?? 'all'} pending tasks!`
        });
        this.loadTasks();
      },
      error: (err: any) => {
        this.approvingAll.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to approve tasks: ' + (err.message || err.statusText)
        });
      }
    });
  }

  openEditModal(task: any) {
    this.editingTaskId = task.id;
    this.editTaskDescription.set(task.description || '');
    this.editTaskHeaderId.set(task.header_id || null);
    const rawPriority = (task.priority || '').trim();
    const matchedPriority = this.priorityOptions.find(p => p.value.toLowerCase() === rawPriority.toLowerCase());
    this.editTaskPriority.set(matchedPriority ? matchedPriority.value : (task.priority || null));
    this.editTaskRiskCategory.set(task.risk_category || null);
    this.editTaskBusinessRisk.set(task.business_risk || null);
    this.editTaskControlRisk.set(task.control_risk || null);
    this.editTaskAuditAreaId.set(task.audit_area_id || null);
    this.editTaskFileUrl.set(task.file_url || null);
    if (task.file_url) {
      const parts = task.file_url.split('/');
      this.editTaskFileName.set(parts[parts.length - 1] || 'Attached File');
    } else {
      this.editTaskFileName.set('');
    }
    this.showEditModal.set(true);
  }

  saveEditedTask() {
    if (this.editingTaskId && this.editTaskDescription().trim()) {
      this.savingEdit.set(true);
      const payload = {
        description: this.editTaskDescription(),
        header_id: this.editTaskHeaderId() || undefined,
        priority: this.editTaskPriority() || undefined,
        risk_category: this.editTaskRiskCategory() || undefined,
        business_risk: this.editTaskBusinessRisk() || undefined,
        control_risk: this.editTaskControlRisk() || undefined,
        audit_area_id: this.editTaskAuditAreaId() || undefined,
        file_url: this.editTaskFileUrl() || null
      };
      this.api.updateTaskDescription(this.editingTaskId, payload).subscribe({
        next: () => {
          this.savingEdit.set(false);
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Task updated successfully', life: 3000 });
          this.showEditModal.set(false);
          this.loadTasks();
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to update task' });
        }
      });
    }
  }

  openCreateManualTaskModal() {
    this.manualTaskDescription.set('');
    this.manualTaskHeaderId.set(null);
    this.manualTaskPriority.set(null);
    this.manualTaskRiskCategory.set(null);
    this.manualTaskBusinessRisk.set(null);
    this.manualTaskControlRisk.set(null);
    this.manualTaskAuditAreaId.set(null);
    this.manualTaskFileUrl.set(null);
    this.manualTaskFileName.set('');
    this.manualTaskCircularId.set(this.selectedCircularId);
    this.showManualTaskModal.set(true);
  }

  createManualTask() {
    if (!this.manualTaskDescription().trim()) return;
    const circularId = this.manualTaskCircularId() || this.selectedCircularId || null;

    this.savingManual.set(true);
    const user = this.auth.currentUser();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? storedUser?.id ?? storedUser?.user_id ?? storedUser?.userId;
    const userName = user?.name || user?.full_name || user?.fullName || user?.username || storedUser?.name || storedUser?.full_name || storedUser?.username;
    const userRole = user?.role || user?.designation || storedUser?.role || storedUser?.designation;

    const payload = {
      description: this.manualTaskDescription(),
      circular_id: circularId || undefined,
      header_id: this.manualTaskHeaderId() || undefined,
      priority: this.manualTaskPriority() || undefined,
      risk_category: this.manualTaskRiskCategory() || undefined,
      business_risk: this.manualTaskBusinessRisk() || undefined,
      control_risk: this.manualTaskControlRisk() || undefined,
      audit_area_id: this.manualTaskAuditAreaId() || undefined,
      file_url: this.manualTaskFileUrl() || null,
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
      next: () => {
        this.savingManual.set(false);
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Manual task created successfully', life: 3000 });
        this.showManualTaskModal.set(false);
        this.loadTasks();
      },
      error: (err) => {
        this.savingManual.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to create manual task' });
      }
    });
  }

  quickAddHeader() {
    if (!this.newHeaderName.trim()) return;
    this.api.createTaskHeader(this.newHeaderName).subscribe(newHeader => {
      // Reload headers
      this.api.getTaskHeaders().subscribe(data => {
        this.taskHeaders.set(data);
        if (this.activeHeaderTarget === 'MANUAL') {
          this.manualTaskHeaderId.set(newHeader.id);
        } else {
          this.editTaskHeaderId.set(newHeader.id);
        }
        this.showAddHeaderModal = false;
        this.newHeaderName = '';
      });
    });
  }

  openBulkUploadModal() {
    this.showBulkUploadModal.set(true);
    // Seed the child component with the active circular and reset its state
    setTimeout(() => this.bulkUploadDrawer?.open(this.selectedCircularFilter || this.selectedCircularId));
  }



}
