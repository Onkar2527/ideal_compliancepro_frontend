import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { getCompliancePeriodInfo } from '../../shared/utils/compliance-period.util';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-assignment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, Textarea, TagModule, TooltipModule, DatePickerModule, DialogModule, InputTextModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  styleUrls: ['../../shared/styles/checklist-shared.css'],
  template: `
    <!-- Compact Premium Dashboard Header -->
    <div class="review-header-card mb-4" 
         style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 1.25rem;">
      
      <!-- Left: Scope & Period -->
      <div class="flex-column gap-1" style="flex: 1.2; min-width: 250px;">
        <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="dept-pill-badge">
            {{ branchName() }}
          </span>
          <span class="dept-pill-badge" *ngIf="isSubDepartmentUser() && userBranchName()" style="background: rgba(99, 102, 241, 0.15); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.3);">
            <i class="pi pi-users" style="font-size: 0.7rem;"></i> {{ userBranchName() }}
          </span>
          <span *ngIf="isBranchCreated()" style="background: rgba(16, 185, 129, 0.12); color: #047857; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;">
            <i class="pi pi-building" style="font-size: 0.68rem;"></i> Branch Created
          </span>
          <span *ngIf="!isBranchCreated()" style="background: rgba(59, 130, 246, 0.12); color: #1d4ed8; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;">
            <i class="pi pi-shield" style="font-size: 0.68rem;"></i> CO Created
          </span>
        </div>
        <h1 class="text-lg font-bold m-0 mt-1" style="margin-top: 0.25rem; color: var(--text-color, #1e293b); font-size: 1.2rem; line-height: 1.3;">{{ taskSetName() }}</h1>
        <div class="flex items-center gap-2 flex-wrap" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.2rem;" *ngIf="startDate() && endDate()">
          <span class="text-xs font-medium" style="color: var(--text-color-secondary, #64748b); font-size: 0.75rem;">
            Overall Task Set Period: {{ startDate() | date:'dd/MM/yyyy' }} to {{ endDate() | date:'dd/MM/yyyy' }}
          </span>
        </div>
      </div>

      <!-- Middle: Circular Ref & Due Date -->
      <div class="flex-column gap-1" style="flex: 1.5; min-width: 280px; border-left: 1px solid var(--surface-border, #e2e8f0); padding-left: 1rem;">
        <span class="text-xs font-bold uppercase tracking-wider block" style="font-size: 0.725rem; color: var(--text-color-secondary, #64748b);">Circular Details</span>
        <p class="text-sm font-bold m-0 truncate max-w-md" [title]="circularTitle()" style="font-size: 0.92rem; line-height: 1.35; color: var(--text-color, #1e293b);">
          {{ circularTitle() }}
        </p>
        <div class="flex items-center gap-2 mt-1" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.35rem; flex-wrap: wrap;">
          <span class="meta-chip-badge">
            Ref: {{ circularReferenceNo() || 'N/A' }}
          </span>
          <span class="meta-chip-badge">
            Auth: {{ authorityName() || 'N/A' }}
          </span>
          
          <!-- Editable main assignment due date in planning phase -->
          <div *ngIf="canEditTimeline(); else viewDueDate" class="flex items-center gap-1">
            <span class="due-date-pill">
              <i class="pi pi-calendar"></i> Suggest Assignment Due:
            </span>
            <p-datepicker [(ngModel)]="tempAssignmentTimelineObj" (ngModelChange)="tempAssignmentTimeline = formatDateForBackend($event)" dateFormat="dd-mm-yy" appendTo="body" styleClass="w-32" [inputStyleClass]="'p-1 border rounded text-xs font-semibold'"></p-datepicker>
          </div>
          <ng-template #viewDueDate>
            <span class="due-date-pill">
              <i class="pi pi-calendar-times"></i> Due: {{ proposedTimeline() | date:'dd-MM-yyyy' }}
            </span>
          </ng-template>
        </div>
      </div>

      <!-- Right: Progress, Status & Back Button -->
      <div class="flex items-center justify-content-between gap-4" style="display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-width: 320px; border-left: 1px solid var(--surface-border, #e2e8f0); padding-left: 1.5rem; flex: 1.2;">
        <div class="flex-column items-start" style="display: flex; flex-direction: column; align-items: flex-start; flex: 1;">
          <span class="text-xs font-bold uppercase tracking-wider block mb-0.5" style="font-size: 0.725rem; color: var(--text-color-secondary, #64748b);">Status & Progress</span>
          <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
            <p-tag [value]="assignmentStatus()" 
                   [severity]="assignmentStatus().toUpperCase() === 'COMPLETED' ? 'success' : (assignmentStatus().toUpperCase() === 'REJECTED' ? 'danger' : (assignmentStatus().toUpperCase().includes('PENDING') ? 'warn' : 'info'))" 
                   [rounded]="true" />
            <span class="text-xs font-bold" style="color: var(--primary-color, #2563eb); font-size: 0.82rem;">
              {{ completedCount() }}/{{ isSubDepartmentUser() ? visibleTasks().length : tasks().length }}
              {{ (assignmentStatus().toUpperCase() === 'PENDING_TIMELINE' || assignmentStatus().toUpperCase() === 'TIMELINE_REVIEW') ? 'Dates Set' : 'Done' }}
            </span>
          </div>
          <div class="w-24 rounded-full h-1 overflow-hidden mt-1" style="width: 5rem; margin-top: 0.25rem; background: var(--surface-border, #e2e8f0);">
            <div class="h-1 rounded-full transition-all duration-300" style="background: #3b82f6;" [style.width.%]="progressPercentage()"></div>
          </div>
        </div>
        
        <button pButton type="button" icon="pi pi-arrow-left" label="Back" severity="secondary" outlined size="small" class="p-button-sm no-print" (click)="goBack()"></button>
      </div>
    </div>

    <!-- Reviewer Viewing Internal / Branch-Created Task Banner (View-Only Mode) -->
    <div *ngIf="isReviewer() && (isInternalTaskSet() || isBranchCreated())" 
         style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: #f0fdf4; border: 1.5px solid #86efac; border-left: 4px solid #16a34a; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <i class="pi pi-info-circle" style="color: #16a34a; font-size: 1.25rem;"></i>
        <div>
          <span style="font-size: 0.85rem; font-weight: 700; color: #14532d; display: block;">Department / Branch Task Set — View-Only Tracking Mode</span>
          <span style="font-size: 0.75rem; color: #166534;">Department compliance checklist. Compliance is executed and completed directly within the department without requiring CO review.</span>
        </div>
      </div>
      <span style="font-size: 0.72rem; font-weight: 700; color: #15803d; background: #dcfce7; border: 1px solid #bbf7d0; padding: 0.25rem 0.6rem; border-radius: 6px; text-transform: uppercase;">
        <i class="pi pi-eye"></i> View Only
      </span>
    </div>

    <!-- Rejection Alert Banner -->
    <div *ngIf="assignmentStatus().toUpperCase() === 'REJECTED'" class="p-3 mb-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="pi pi-exclamation-triangle text-red-500 text-lg"></i>
        </div>
        <div class="ml-3">
          <h3 class="text-xs font-bold text-red-800 m-0">Assignment Rejected by CCO/CO</h3>
          <div class="mt-1 text-xs text-red-700">
            <p class="font-semibold m-0">Reason: "{{ reviewRemark() || 'No feedback provided' }}"</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Department Submission Notification Banner for Head Department -->
    <div *ngIf="isHeadDepartmentUser() && !isReviewer() && pendingSubDeptReviewCount() > 0 && assignmentStatus() !== 'COMPLETED'" 
         style="margin-bottom: 1rem; padding: 0.75rem 1.25rem; background: #ecfdf5; border: 1.5px solid #a7f3d0; border-left: 4px solid #10b981; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="subdept-pulse-badge" style="padding: 0.25rem 0.6rem;">
          <span class="pulse-dot"></span>
          <span>New Submission</span>
        </span>
        <div>
          <span style="font-size: 0.85rem; font-weight: 700; color: #065f46; display: block;">
            Sub-Department Compliance Ready for Review ({{ pendingSubDeptReviewCount() }} Task{{ pendingSubDeptReviewCount() > 1 ? 's' : '' }})
          </span>
          <span style="font-size: 0.75rem; color: #047857;">
            Sub-department has submitted compliance declarations & documents. Please review each item below and click <strong>Accept</strong> or <strong>Reject</strong>.
          </span>
        </div>
      </div>
    </div>

    <!-- Bulk Assign All Tasks Bar (Visible to Head Department) -->
    <div *ngIf="availableSubDepts().length > 1 && isHeadDepartmentUser() && !isReviewer() && assignmentStatus() !== 'COMPLETED'" 
         style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; background: var(--surface-card, #ffffff); border: 1px solid var(--surface-border, #cbd5e1); border-left: 4px solid var(--primary-color, #0f2942); border-radius: 10px; margin-top: 0.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(15,41,66,0.04);">
      
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 2.25rem; height: 2.25rem; border-radius: 8px; background: var(--primary-color, #0f2942); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 1px 3px rgba(15,41,66,0.25);">
          <i class="pi pi-sitemap"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 0.9rem; font-weight: 800; color: var(--text-color, #0f2942);">Bulk Assign All Tasks</h3>
          <span style="font-size: 0.725rem; color: var(--text-color-secondary, #64748b); font-weight: 500;">Assign all {{ tasks().length }} tasks in this checklist to a sub-department or self-compliance in one click</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-color, #0f2942);">Assign All To:</span>
        <p-select 
          [options]="availableSubDepts()" 
          [(ngModel)]="bulkSelectedSubDeptId" 
          optionLabel="label" 
          optionValue="value" 
          placeholder="Select Sub-Department"
          styleClass="h-2rem text-xs font-semibold"
          [style]="{'min-width': '220px'}"
          appendTo="body">
        </p-select>

        <p-button 
          label="Apply to All Tasks" 
          icon="pi pi-check" 
          severity="primary" 
          size="small" 
          [loading]="bulkAssigning"
          (click)="bulkAssignAllTasks()">
        </p-button>
      </div>
    </div>

    <!-- Task Headers Groups -->
    <ng-container *ngFor="let group of taskGroups()">
      <div class="task-group-container mb-4" style="margin-bottom: 1.25rem;">
        <!-- Group Header Banner (Dynamic Medium-Dark Tone) -->
        <div class="task-group-header-bar" style="background: var(--topbar-bg, linear-gradient(90deg, #1e3a5f 0%, #2c4f7c 100%)); color: white; padding: 0.45rem 1rem; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="pi pi-folder" style="font-size: 0.85rem; color: #93c5fd;"></i>
            <span style="font-weight: 800; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: #ffffff;">
              {{ group.headerName === 'Uncategorized' ? 'GENERAL COMPLIANCE' : group.headerName }}
            </span>
          </div>
          <span style="background: rgba(255,255,255,0.18); color: #ffffff; font-size: 0.68rem; font-weight: 700; padding: 0.12rem 0.55rem; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2);">
            {{ group.tasks.length }} {{ group.tasks.length === 1 ? 'Task' : 'Tasks' }}
          </span>
        </div>

        <div class="task-group-body">
          <div *ngFor="let t of group.tasks; trackBy: trackByTaskId; let i = index" 
               class="question-card"
               [ngClass]="{
                 'card-approved': t.review_status === 'APPROVED',
                 'card-needs-redo': t.review_status === 'NEEDS_REDO',
                 'border-left-green': (!t.review_status && (t.compliance_status === 'COMPLIED' || (t.status === 'COMPLETED' && t.compliance_status !== 'NOT_COMPLIED'))),
                 'border-left-red': (!t.review_status && t.compliance_status === 'NOT_COMPLIED'),
                 'border-left-yellow': (!t.review_status && (!t.compliance_status || t.compliance_status === 'PENDING') && t.status !== 'COMPLETED')
               }"
               style="margin-bottom: 0.75rem;">
            
            <!-- Left Column: Serial Number & Task Info -->
            <div class="question-main" style="padding: 1.1rem; border-right: 1px solid var(--surface-border, #f1f5f9); display: flex; gap: 0.85rem; align-items: stretch;">
              <div class="question-number">
                {{ i + 1 }}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0;">
                <div>
                  <!-- Top Tags Bar -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                      <span class="circular-ref-tag" *ngIf="t.circular_title" style="color: #93c5fd; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em;">
                        {{ t.circular_title }}
                      </span>
                      <span *ngIf="t.review_status === 'APPROVED'" style="padding: 0.15rem 0.55rem; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="pi pi-check-circle" style="font-size: 0.65rem; color: #10b981;"></i> Accepted
                      </span>
                      <span *ngIf="t.review_status === 'NEEDS_REDO'" style="padding: 0.15rem 0.55rem; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="pi pi-times-circle" style="font-size: 0.65rem;"></i> Rejected
                      </span>
                      <span *ngIf="t.review_status === 'ESCALATED'" style="padding: 0.15rem 0.55rem; background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="pi pi-exclamation-triangle" style="font-size: 0.65rem;"></i> Escalated to CCO
                      </span>
                    </div>
                  </div>

                  <!-- Task Description -->
                  <p class="task-description" style="margin-top: 0.35rem; margin-bottom: 0;">
                    {{ t.description || t.task_description || t.title }}
                  </p>
                </div>

                <!-- Task Reference Document (Small Size in Left Bottom) -->
                <div *ngIf="t.file_url" 
                     style="margin-top: 0.6rem; display: flex; align-items: center; align-self: flex-start; max-width: 100%;">
                  <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.15rem 0.45rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.68rem; max-width: 100%; box-sizing: border-box;">
                    <i [class]="getFileIcon(t.file_name || t.file_url)" [style.color]="getFileIconColor(t.file_name || t.file_url)" style="font-size: 0.8rem; flex-shrink: 0;"></i>
                    <span style="font-weight: 700; color: #4f46e5; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap;">Ref Doc:</span>
                    <span style="font-weight: 600; color: #334155; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem;" [title]="cleanFileName(t.file_name || t.file_url)">
                      {{ cleanFileName(t.file_name || t.file_url) }}
                    </span>
                    <button type="button" (click)="previewFileUrlDirect(t.file_url, t.file_name)"
                            style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; padding: 0.08rem 0.3rem; cursor: pointer; color: #4f46e5; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.65rem; font-weight: 600;"
                            title="Preview Reference Document">
                      <i class="pi pi-eye" style="font-size: 0.62rem;"></i> Preview
                    </button>
                    <button type="button" (click)="downloadFile(t.file_url, t.file_name)"
                            style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; padding: 0.08rem 0.3rem; cursor: pointer; color: #475569; display: inline-flex; align-items: center; gap: 0.15rem; font-size: 0.65rem; font-weight: 600;"
                            title="Download Reference Document">
                      <i class="pi pi-download" style="font-size: 0.62rem;"></i> Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Answer Form or Timeline Proposing -->
            <div class="answer-form" *ngIf="isTimelineMode(); else complianceForm" style="display: flex; flex-direction: column; align-items: stretch; justify-content: center; width: 100%; padding: 0.9rem 1rem; box-sizing: border-box;">
              
              <!-- If Branch is proposing/editing timeline -->
              <ng-container *ngIf="!isReviewer()">
                <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; min-width: 0; box-sizing: border-box;">
                  
                  <!-- Timeline Header with Mode / Assignee (Single Line matching Topbar) -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%; padding-bottom: 0.45rem; border-bottom: 1px solid var(--surface-border, #e2e8f0); box-sizing: border-box; min-width: 0;">
                    <label class="control-label font-bold m-0" style="font-size: 0.72rem; white-space: nowrap; flex-shrink: 0; color: var(--text-color-secondary, #475569);">{{ getTimelineLabel() }}</label>

                    <!-- Sub-Department Delegation Control (Shown ONLY to Head Department / Admin) -->
                    <div *ngIf="availableSubDepts().length > 1 && isHeadDepartmentUser() && !isReviewer() && assignmentStatus() !== 'COMPLETED'" 
                         style="display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 0; justify-content: flex-end;">
                      <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-color-secondary, #475569); display: inline-flex; align-items: center; gap: 0.2rem; white-space: nowrap; flex-shrink: 0;">
                        <i class="pi pi-sitemap" style="color: var(--primary-color, #0f2942); font-size: 0.72rem;"></i> Assignee:
                      </span>
                      <div style="flex: 1; min-width: 0; max-width: 200px;">
                        <p-select 
                          [options]="availableSubDepts()" 
                          [ngModel]="t.sub_dept_id || null" 
                          (ngModelChange)="onTaskSubDeptChange(t, $event)"
                          [disabled]="t.remarks || t.has_evidence || t.status === 'COMPLETED'"
                          optionLabel="label" 
                          optionValue="value" 
                          placeholder="Select Assignee"
                          styleClass="h-1.85rem text-xs font-semibold w-full"
                          [style]="{'width': '100%', 'min-width': '0'}"
                          appendTo="body">
                        </p-select>
                      </div>
                    </div>

                    <!-- For Sub-Department User: Badge display of assignee -->
                    <div *ngIf="isSubDepartmentUser() && t.sub_dept_name" style="white-space: nowrap; flex-shrink: 0;">
                      <span style="padding: 0.2rem 0.5rem; background: var(--surface-hover, #f8fafc); color: var(--text-color, #0f2942); border: 1px solid var(--surface-border, #cbd5e1); border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                        <i class="pi pi-users" style="color: var(--primary-color, #0f2942);"></i> Assigned: {{ t.sub_dept_name }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between;">
                    <span class="text-xs font-medium" *ngIf="hasTaskDueDate(t)" style="color: var(--text-color-secondary, #64748b);">Default Due Date: <strong style="color: var(--text-color, #1e293b);">{{ t.due_date | date:'dd-MM-yyyy' }}</strong></span>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);" *ngIf="t.review_status === 'REJECTED'">
                      Rejected
                    </span>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);" *ngIf="t.review_status === 'APPROVED'">
                      Approved
                    </span>
                  </div>

                  <!-- Reviewer's Feedback (Show to Branch if rejected/approved) -->
                  <div class="text-xs font-medium p-2 rounded mb-2" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px;" *ngIf="t.review_status === 'REJECTED' && t.timeline_review_remark">
                    <strong>Reviewer Feedback:</strong> "{{ t.timeline_review_remark }}"
                  </div>
                  <div class="text-xs font-medium p-2 rounded mb-2" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; border-radius: 6px;" *ngIf="t.review_status === 'APPROVED' && t.timeline_review_remark">
                    <strong>Reviewer Remarks:</strong> "{{ t.timeline_review_remark }}"
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.5rem;" *ngIf="canEditTimeline()">
                    <p-datepicker 
                      [(ngModel)]="t.temp_proposed_due_date_obj" 
                      (ngModelChange)="t.temp_proposed_due_date = formatDateForBackend($event)" 
                      [disabled]="!canEditTimeline()" 
                      dateFormat="dd-mm-yy" 
                      appendTo="body" 
                      styleClass="w-full" 
                      [inputStyleClass]="'answer-control p-2 border rounded w-full text-sm font-medium'">
                    </p-datepicker>
                  </div>

                  <!-- Proposed Remark for Branch to fill -->
                  <div class="mt-2" *ngIf="canEditTimeline()">
                    <label class="control-label font-bold text-gray-600 block mb-1" style="font-size: 0.7rem;">Propose Date Remark / Justification</label>
                    <textarea pTextarea
                              [(ngModel)]="t.temp_proposed_remark"
                              [disabled]="!canEditTimeline()"
                              class="answer-control w-full p-2 border rounded text-xs"
                              style="resize: none; height: 3rem; font-size: 0.75rem;"
                              placeholder="Explain why you are proposing this due date..."></textarea>
                  </div>
                  <div class="text-xs text-slate-700 font-medium bg-slate-100 border border-slate-200 p-2 rounded mt-1" *ngIf="!canEditTimeline() && t.proposed_remark">
                    <strong>Propose Remark:</strong> "{{ t.proposed_remark }}"
                  </div>

                  <p-button *ngIf="canEditTimeline()"
                            label="Save Date"
                            [loading]="!!rowSavingMap()[t.assignment_task_id]"
                            loadingIcon="pi pi-spinner pi-spin"
                            icon="pi pi-save"
                            iconPos="left"
                            [disabled]="!t.temp_proposed_due_date"
                            (click)="saveSingleTaskTimeline(t)"
                            styleClass="w-full save-row-btn mt-2"
                            size="small" />
                </div>
              </ng-container>

              <!-- If CO/CCO/Admin is reviewing timeline -->
              <ng-container *ngIf="isReviewer()">
                <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 100%; min-width: 250px;">
                  <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between;">
                    <label class="control-label font-bold text-gray-700" style="font-size: 0.75rem;">{{ getTimelineLabel() }}</label>
                    <span class="text-xs text-green-600 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full" *ngIf="t.review_status === 'APPROVED'">
                      Accepted
                    </span>
                    <span class="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full" *ngIf="t.review_status === 'REJECTED'">
                      Rejected
                    </span>
                  </div>

                  <div class="text-xs text-gray-800 font-bold bg-gray-50 border border-gray-200 p-2 rounded">
                    Proposed: {{ (t.proposed_due_date || t.due_date) | date:'dd/MM/yyyy' }}
                  </div>

                  <!-- Propose Date Remark from Branch -->
                  <div class="text-xs text-slate-800 font-medium bg-slate-100 border border-slate-200 p-2 rounded" *ngIf="t.proposed_remark">
                    <strong>Branch Justification:</strong> "{{ t.proposed_remark }}"
                  </div>

                  <div *ngIf="canApproveTimeline()" style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.25rem;">
                    <textarea pTextarea
                              [(ngModel)]="t.temp_timeline_review_remark"
                              class="answer-control w-full p-2 border rounded text-xs"
                              style="resize: none; height: 2.5rem; font-size: 0.75rem;"
                              placeholder="Reviewer Remark (Optional)..."></textarea>
                    
                    <div style="display: flex; gap: 0.35rem;">
                      <p-button label="Accept"
                                icon="pi pi-check"
                                severity="success"
                                (click)="reviewSingleTaskTimeline(t, 'APPROVED')"
                                styleClass="flex-1"
                                size="small" />
                      <p-button label="Reject"
                                icon="pi pi-times"
                                severity="danger"
                                outlined
                                (click)="reviewSingleTaskTimeline(t, 'REJECTED')"
                                styleClass="flex-1"
                                size="small" />
                    </div>
                  </div>
                </div>
              </ng-container>
            </div>

            <ng-template #complianceForm>
              <div class="answer-form" style="display: flex; flex-direction: column; gap: 0.65rem; width: 100%; padding: 0.9rem 1rem; box-sizing: border-box;">
                
                <!-- Card Header Line: Due Date & Mode / Assignee (Single Line matching Topbar) -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%; padding-bottom: 0.45rem; border-bottom: 1px solid var(--surface-border, #e2e8f0); box-sizing: border-box; min-width: 0;">
                  <!-- Due Date Badge (only shown when an explicit due date is given for this task) -->
                  <div class="task-due-badge" *ngIf="hasTaskDueDate(t)">
                    <i class="pi pi-calendar" style="color: var(--primary-color, #0f2942); font-size: 0.75rem;"></i>
                    <span style="color: var(--text-color-secondary, #64748b); font-weight: 600;">Due:</span>
                    <span style="color: var(--text-color, #0f2942); font-weight: 800;">{{ t.due_date | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <div *ngIf="!hasTaskDueDate(t)"></div>

                  <!-- Sub-Department Delegation Control (Shown ONLY to Head Department / Admin) -->
                  <div *ngIf="availableSubDepts().length > 1 && isHeadDepartmentUser() && !isReviewer() && assignmentStatus() !== 'COMPLETED'" 
                       style="display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 0; justify-content: flex-end;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-color-secondary, #475569); display: inline-flex; align-items: center; gap: 0.2rem; white-space: nowrap; flex-shrink: 0;">
                      <i class="pi pi-sitemap" style="color: var(--primary-color, #0f2942); font-size: 0.72rem;"></i> Assignee:
                    </span>
                    <div style="flex: 1; min-width: 0; max-width: 200px;">
                      <p-select 
                        [options]="availableSubDepts()" 
                        [ngModel]="t.sub_dept_id || null" 
                        (ngModelChange)="onTaskSubDeptChange(t, $event)" 
                        [disabled]="t.remarks || t.has_evidence || t.status === 'COMPLETED'"
                        optionLabel="label" 
                        optionValue="value" 
                        placeholder="Select Assignee"
                        styleClass="h-1.85rem text-xs font-semibold w-full"
                        [style]="{'width': '100%', 'min-width': '0'}"
                        appendTo="body">
                      </p-select>
                    </div>
                  </div>

                  <!-- For Sub-Department User: Badge display of assignee -->
                  <div *ngIf="isSubDepartmentUser() && t.sub_dept_name" style="white-space: nowrap; flex-shrink: 0;">
                    <span style="padding: 0.2rem 0.5rem; background: var(--surface-hover, #f8fafc); color: var(--text-color, #0f2942); border: 1px solid var(--surface-border, #cbd5e1); border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                      <i class="pi pi-users" style="color: var(--primary-color, #0f2942);"></i> Assigned: {{ t.sub_dept_name }}
                    </span>
                  </div>
                </div>

                <!-- Per-Task Review Status Banner -->
                <div *ngIf="t.review_status" class="w-full">
                  <div *ngIf="t.review_status === 'APPROVED'" class="decision-banner-approved">
                    <span style="display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
                      <i class="pi pi-check-circle" style="color: #10b981;"></i>
                      <span>Approved {{ isHeadDepartmentUser() ? 'by Head Department' : 'by Reviewer' }}</span>
                    </span>
                    <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 0.15rem 0.5rem; border-radius: 4px;">Accepted</span>
                  </div>

                  <div *ngIf="t.review_status === 'NEEDS_REDO'" class="decision-banner-rejected">
                    <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600; width: 100%;">
                      <span style="display: flex; align-items: center; gap: 0.35rem;">
                        <i class="pi pi-exclamation-circle" style="color: #ef4444;"></i>
                        <span>Needs Re-compliance</span>
                      </span>
                      <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 0.15rem 0.5rem; border-radius: 4px;">Rejected</span>
                    </div>
                    <div *ngIf="t.review_remark" style="font-size: 0.725rem; font-weight: 500; color: #ef4444; margin-top: 0.25rem;">
                      <strong>Feedback:</strong> "{{ t.review_remark }}"
                    </div>
                  </div>

                  <div *ngIf="t.review_status === 'ESCALATED'" style="padding: 0.45rem 0.75rem; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); border-left: 3px solid #f59e0b; border-radius: 6px; font-size: 0.75rem; color: #f59e0b;">
                    <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600;">
                      <span style="display: flex; align-items: center; gap: 0.35rem;">
                        <i class="pi pi-exclamation-triangle" style="color: #f59e0b;"></i>
                        <span>Escalated to CCO for Final Review</span>
                      </span>
                      <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: rgba(245,158,11,0.2); color: #f59e0b; padding: 0.15rem 0.5rem; border-radius: 4px;">Escalated to CCO</span>
                    </div>
                    <div *ngIf="t.review_remark" style="font-size: 0.725rem; font-weight: 500; color: #f59e0b; margin-top: 0.25rem;">
                      <strong>CO Remarks:</strong> "{{ t.review_remark }}"
                    </div>
                  </div>
                </div>

                <!-- ══ CASE 1: HEAD DEPARTMENT VIEWING DELEGATED SUB-DEPT TASK ══ -->
                <ng-container *ngIf="isHeadDepartmentUser() && isSubDeptSubmission(null, t) && !isReviewer()">
                  <!-- If Sub-Dept has filled compliance -->
                  <div *ngIf="t.remarks || t.has_evidence || t.status === 'COMPLETED'; else subDeptPendingBlock" 
                       class="subdept-submission-card w-full"
                       [ngClass]="{
                         'panel-complied': t.compliance_status === 'COMPLIED' || (!t.compliance_status && t.status === 'COMPLETED'),
                         'panel-not-complied': t.compliance_status === 'NOT_COMPLIED'
                       }">
                    
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span class="subdept-submission-title" style="display: flex; align-items: center; gap: 0.35rem;">
                        <i class="pi pi-users" style="color: #3b82f6;"></i> {{ t.sub_dept_name || 'Sub-Department' }} Submission:
                      </span>
                      <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span class="subdept-pulse-badge" *ngIf="t.review_status !== 'APPROVED' && t.review_status !== 'NEEDS_REDO'" title="Submitted by sub-department, awaiting your review">
                          <span class="pulse-dot"></span>
                          <span>Awaiting Review</span>
                        </span>
                        <span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                              [style.background]="t.compliance_status === 'COMPLIED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'"
                              [style.color]="t.compliance_status === 'COMPLIED' ? '#10b981' : '#ef4444'"
                              [style.border]="t.compliance_status === 'COMPLIED' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'"
                              style="font-size: 0.68rem; font-weight: 800;">
                          {{ t.compliance_status || 'COMPLIED' }}
                        </span>
                      </div>
                    </div>

                    <!-- Sub-Dept Remarks with Edit and Save option -->
                    <div class="subdept-submission-remarks" 
                         style="background: var(--surface-hover, #f8fafc); padding: 0.35rem 0.6rem; border-radius: 6px; border: 1px solid var(--surface-border, #e2e8f0); margin-top: 0.25rem;">
                      
                      <!-- View Mode (when not editing) -->
                      <div *ngIf="!t.isEditingRemark" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 0; font-size: 0.775rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
                          <span style="font-weight: 700; color: var(--text-color-secondary, #64748b);">Sub-Dept Remarks:</span>
                          <span *ngIf="t.remarks" style="color: var(--text-color, #0f172a); font-weight: 600;">"{{ t.remarks }}"</span>
                          <span *ngIf="!t.remarks" style="color: #94a3b8; font-style: italic;">No remarks provided</span>
                          
                          <!-- Edited by Head badge -->
                          <span *ngIf="isTaskSubDeptRemarkEditedByHead(t)" 
                                style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 9999px; display: inline-flex; align-items: center; gap: 0.25rem;"
                                [title]="'Remark modified by Head' + (getHeadEditorName(t) ? ' (' + getHeadEditorName(t) + ')' : '')">
                            <i class="pi pi-pencil" style="font-size: 0.62rem;"></i>
                            <span>Edited by Head{{ getHeadEditorName(t) ? ' (' + getHeadEditorName(t) + ')' : '' }}</span>
                          </span>
                        </div>
                        <button *ngIf="t.remarks && t.remarks.trim() && assignmentStatus() !== 'COMPLETED'"
                                type="button" 
                                (click)="startEditSubDeptRemark(t)" 
                                title="Edit Sub-Department Remark"
                                style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); cursor: pointer; color: #4f46e5; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 700; border-radius: 4px;"
                                class="hover:bg-indigo-50">
                          <i class="pi pi-pencil" style="font-size: 0.72rem;"></i>
                          <span>Edit Remark</span>
                        </button>
                      </div>

                      <!-- Edit Mode -->
                      <div *ngIf="t.isEditingRemark" style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <span style="font-size: 0.725rem; font-weight: 700; color: #4f46e5; display: inline-flex; align-items: center; gap: 0.3rem;">
                            <i class="pi pi-pencil" style="font-size: 0.7rem;"></i> Edit Sub-Dept Remark
                          </span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <input type="text" 
                                 pInputText 
                                 [(ngModel)]="t.editedRemark" 
                                 placeholder="Enter or modify sub-department remark..." 
                                 (keyup.enter)="saveSubDeptRemark(t)"
                                 (keyup.escape)="cancelEditSubDeptRemark(t)"
                                 style="flex: 1; font-size: 0.78rem; height: 2rem; border-radius: 4px; padding: 0.25rem 0.5rem;" />
                          <button type="button" 
                                  (click)="saveSubDeptRemark(t)" 
                                  [disabled]="t.savingRemark"
                                  title="Save Remark"
                                  style="background: #10b981; border: 1px solid #059669; color: white; cursor: pointer; padding: 0.25rem 0.55rem; height: 2rem; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; font-weight: 700; border-radius: 4px;">
                            <i class="pi" [ngClass]="t.savingRemark ? 'pi-spin pi-spinner' : 'pi-check'" style="font-size: 0.72rem;"></i>
                            <span>Save</span>
                          </button>
                          <button type="button" 
                                  (click)="cancelEditSubDeptRemark(t)" 
                                  [disabled]="t.savingRemark"
                                  title="Cancel Edit"
                                  style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #64748b; cursor: pointer; padding: 0.25rem 0.5rem; height: 2rem; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; font-weight: 600; border-radius: 4px;">
                            <i class="pi pi-times" style="font-size: 0.72rem;"></i>
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    <!-- Sub-Dept Evidence Display / Head Upload Section -->
                    <div style="margin-top: 0.35rem;">
                      <!-- If evidence exists, show list with View, Download, Delete, and Add Evidence -->
                      <div *ngIf="t.has_evidence && t.evidence_url; else noEvidenceTpl">
                        <div *ngIf="t.evidence_history && t.evidence_history.length > 0; else singleSubEvidenceTpl" style="display: flex; flex-direction: column; gap: 0.35rem;">
                          <div *ngFor="let ev of t.evidence_history; let evIdx = index" 
                               style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: #fff5f5; border: 1px solid #fecaca; border-radius: 6px; padding: 0.35rem 0.6rem;">
                            <div style="display: flex; align-items: center; gap: 0.35rem; min-width: 0; flex: 1;">
                              <i [class]="getFileIcon(ev.file_name || ev.file_url)" [style.color]="getFileIconColor(ev.file_name || ev.file_url)" style="font-size: 0.95rem;"></i>
                              <a [href]="resolveFileUrl(ev.file_url)" target="_blank" class="evidence-link" style="font-size: 0.76rem; font-weight: 700; color: #dc2626; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                {{ cleanFileName(ev.file_name || ev.file_url || 'Evidence Document') }}
                              </a>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                              <button type="button" (click)="previewFileUrlDirect(ev.file_url, ev.file_name)" 
                                      style="background: #ffffff; border: 1px solid #fca5a5; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; color: #dc2626; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                                <i class="pi pi-eye" style="font-size: 0.68rem;"></i> Preview
                              </button>
                              <button type="button" (click)="downloadFile(ev.file_url, ev.file_name)" 
                                      style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; color: #475569; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                                <i class="pi pi-download" style="font-size: 0.68rem;"></i> Download
                              </button>
                              <button type="button" (click)="deleteTaskEvidenceDirect(t, ev)" 
                                      title="Delete this evidence file"
                                      style="background: #fef2f2; border: 1px solid #f87171; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; color: #b91c1c; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                                <i class="pi pi-trash" style="font-size: 0.68rem;"></i> Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        <ng-template #singleSubEvidenceTpl>
                          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: #fff5f5; border: 1px solid #fecaca; border-radius: 6px; padding: 0.35rem 0.6rem;">
                            <div style="display: flex; align-items: center; gap: 0.35rem; min-width: 0; flex: 1;">
                              <i [class]="getFileIcon(t.evidence_url)" [style.color]="getFileIconColor(t.evidence_url)" style="font-size: 0.95rem;"></i>
                              <a [href]="resolveFileUrl(t.evidence_url)" target="_blank" class="evidence-link" style="font-size: 0.76rem; font-weight: 700; color: #dc2626; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                {{ cleanFileName(t.evidence_file_name || t.evidence_url || 'Evidence Document') }}
                              </a>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                              <button type="button" (click)="previewFile(t)" 
                                      style="background: #ffffff; border: 1px solid #fca5a5; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; color: #dc2626; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                                <i class="pi pi-eye" style="font-size: 0.68rem;"></i> Preview
                              </button>
                              <button type="button" (click)="downloadFile(t.evidence_url, t.evidence_file_name)" 
                                      style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; color: #475569; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                                <i class="pi pi-download" style="font-size: 0.68rem;"></i> Download
                              </button>
                              <button type="button" (click)="deleteTaskEvidenceDirect(t)" 
                                      title="Delete this evidence file"
                                      style="background: #fef2f2; border: 1px solid #f87171; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; color: #b91c1c; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                                <i class="pi pi-trash" style="font-size: 0.68rem;"></i> Delete
                              </button>
                            </div>
                          </div>
                        </ng-template>

                        <!-- Optional Add More Evidence button when evidence already exists -->
                        <div style="display: flex; justify-content: flex-end; margin-top: 0.3rem;">
                          <button type="button" 
                                  (click)="openEvidencePicker(t)" 
                                  style="padding: 0.15rem 0.55rem; height: 1.75rem; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 5px; font-weight: 600; border: 1px dashed #6366f1; background: rgba(99, 102, 241, 0.08); color: #4f46e5; cursor: pointer;">
                            <i class="pi pi-upload" style="font-size: 0.68rem;"></i>
                            <span>+ Upload Additional Evidence</span>
                          </button>
                        </div>
                      </div>

                      <!-- When evidence is deleted or missing, show Upload Evidence option to Head Department -->
                      <ng-template #noEvidenceTpl>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--surface-hover, #f8fafc); border: 1px dashed var(--surface-border, #cbd5e1); border-radius: 6px; padding: 0.4rem 0.65rem;">
                          <span style="font-size: 0.73rem; color: var(--text-color-secondary, #64748b); display: inline-flex; align-items: center; gap: 0.35rem; font-style: italic;">
                            <i class="pi pi-file-excel" style="font-size: 0.75rem; color: #94a3b8;"></i>
                            No evidence attached (deleted or not provided by sub-dept)
                          </span>
                          <button type="button" 
                                  (click)="openEvidencePicker(t)" 
                                  style="padding: 0.25rem 0.65rem; height: 1.85rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; font-weight: 600; border: 1px dashed #6366f1; background: rgba(99, 102, 241, 0.12); color: #4f46e5; cursor: pointer;">
                            <i class="pi pi-upload" style="font-size: 0.72rem;"></i>
                            {{ getSelectedFiles(t.assignment_task_id).length > 0 ? '+ Add More Evidence' : 'Upload Evidence' }}
                          </button>
                        </div>
                      </ng-template>

                      <!-- Staged Files Selected by Head for this Sub-Dept Task -->
                      <div *ngIf="getSelectedFiles(t.assignment_task_id).length > 0" 
                           style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; padding: 0.45rem 0.65rem; background: rgba(99, 102, 241, 0.05); border-radius: 6px; border: 1px dashed rgba(99, 102, 241, 0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                          <span style="font-size: 0.725rem; font-weight: 700; color: #4338ca; display: inline-flex; align-items: center; gap: 0.3rem;">
                            <i class="pi pi-paperclip"></i>
                            Staged Evidence ({{ getSelectedFiles(t.assignment_task_id).length }}):
                          </span>
                          <p-button label="Save Uploaded Evidence" 
                                    icon="pi pi-cloud-upload" 
                                    size="small" 
                                    severity="help"
                                    [loading]="!!rowSavingMap()[t.assignment_task_id]"
                                    (click)="saveSubDeptEvidence(t)"
                                    styleClass="p-button-sm text-xs font-semibold h-1.85rem"></p-button>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.15rem;">
                          <div *ngFor="let file of getSelectedFiles(t.assignment_task_id); let fIdx = index"
                               style="display: inline-flex; align-items: center; gap: 0.35rem; background: #ffffff; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; padding: 0.15rem 0.45rem; font-size: 0.72rem; color: #047857; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            <i [class]="getFileIcon(file.name)" [style.color]="getFileIconColor(file.name)" style="font-size: 0.8rem;"></i>
                            <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;" [title]="file.name">
                              {{ file.name }}
                            </span>
                            <button type="button" 
                                    (click)="previewSelectedFile(file)" 
                                    title="Preview File"
                                    style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 0.1rem 0.3rem; cursor: pointer; color: #10b981; display: inline-flex; align-items: center; font-size: 0.68rem; font-weight: 700;">
                              <i class="pi pi-eye" style="font-size: 0.68rem;"></i>
                            </button>
                            <button type="button" 
                                    (click)="removeSelectedFile(t.assignment_task_id, fIdx)" 
                                    title="Remove file"
                                    style="background: none; border: none; padding: 0.1rem 0.2rem; cursor: pointer; color: #ef4444; display: inline-flex; align-items: center;">
                              <i class="pi pi-trash" style="font-size: 0.72rem;"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>


                    <!-- Head Decision Action Bar (Only in Hierarchical Mode) -->
                    <div *ngIf="!isDirectSubDeptAssignment() && isHeadDepartmentUser() && assignmentStatus() !== 'COMPLETED' && !isReviewer()" class="mt-2 pt-2" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--surface-border, #e2e8f0);">
                      
                      <!-- When task is awaiting sub-dept re-compliance after rejection -->
                      <div *ngIf="t.review_status === 'NEEDS_REDO'" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.5rem 0.75rem;">
                        <div class="text-xs font-bold text-red-600 flex items-center gap-1.5">
                          <i class="pi pi-clock text-red-500"></i>
                          <span>Sent for Re-compliance — Awaiting revised submission from {{ t.sub_dept_name || 'Sub-Department' }}</span>
                          <span *ngIf="t.review_remark" class="font-normal text-gray-500 ml-1"> (Feedback: "{{ t.review_remark }}")</span>
                        </div>
                      </div>

                      <!-- Head Comment / Remarks Box (Only when pending initial review) -->
                      <div *ngIf="t.review_status !== 'APPROVED' && t.review_status !== 'NEEDS_REDO'" style="display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem;">
                        <label class="text-xs font-semibold block" style="font-size: 0.725rem; display: flex; align-items: center; gap: 0.35rem; color: var(--text-color, #374151);">
                          <i class="pi pi-comment text-gray-500"></i> Head Remarks / Comment:
                        </label>
                        <textarea pTextarea 
                                  [(ngModel)]="t.head_comment"
                                  class="w-full p-2 border rounded text-xs co-remark-input" 
                                  style="resize: none; min-height: 2.75rem; height: 2.75rem; font-size: 0.775rem;"
                                  placeholder="Enter review remarks / comments (optional for Accept, required for Reject)..."></textarea>
                      </div>

                      <!-- If Head is writing rejection feedback -->
                      <div *ngIf="rejectingTaskId() === t.assignment_task_id" style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <label class="text-xs font-bold text-red-700 block" style="font-size: 0.725rem;">Rejection Reason for {{ t.sub_dept_name || 'Sub-Dept' }} *</label>
                        <textarea pTextarea 
                                  [(ngModel)]="headRejectionRemark"
                                  class="w-full p-2 border rounded text-xs co-remark-input" 
                                  style="resize: none; height: 3rem; font-size: 0.75rem;"
                                  placeholder="Explain why this is rejected and what needs to be fixed..."></textarea>
                        <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                          <p-button label="Cancel" severity="secondary" [outlined]="true" size="small" (click)="cancelHeadRejectBox()"></p-button>
                          <p-button label="Confirm Rejection & Send to Sub-Dept" severity="danger" icon="pi pi-times" size="small" (click)="headRejectSubDeptTask(t)"></p-button>
                        </div>
                      </div>

                      <!-- Accept / Reject Buttons for Head -->
                      <div *ngIf="rejectingTaskId() !== t.assignment_task_id && t.review_status !== 'NEEDS_REDO'" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                        <div *ngIf="t.review_status === 'APPROVED'" class="text-xs font-bold text-green-600 flex items-center gap-1">
                          <i class="pi pi-check-circle text-green-500"></i> Accepted by Head Department
                          <span *ngIf="t.review_remark" class="font-normal text-gray-400 ml-1"> — "{{ t.review_remark }}"</span>
                        </div>
                        <div *ngIf="!t.review_status" class="text-xs font-semibold text-gray-400">
                          Head Decision:
                        </div>

                        <div style="display: flex; gap: 0.35rem;">
                          <p-button *ngIf="t.review_status !== 'APPROVED'"
                                    label="Accept" 
                                    icon="pi pi-check" 
                                    severity="success" 
                                    size="small" 
                                    (click)="headAcceptSubDeptTask(t)"></p-button>
                          <p-button *ngIf="t.review_status !== 'APPROVED'"
                                    label="Reject" 
                                    icon="pi pi-times" 
                                    severity="danger" 
                                    [outlined]="true" 
                                    size="small" 
                                    (click)="openHeadRejectBox(t)"></p-button>
                        </div>
                      </div>

                    </div>
                  </div>

                  <!-- Awaiting Sub-Dept Submission template -->
                  <ng-template #subDeptPendingBlock>
                    <div class="p-3 border rounded-lg text-xs font-semibold flex items-center gap-2"
                         style="padding: 0.75rem; background: var(--surface-hover, #f8fafc); border: 1px solid var(--surface-border, #e2e8f0); border-left: 3px solid #64748b; border-radius: 8px; color: var(--text-color-secondary, #94a3b8); display: flex; align-items: center; gap: 0.5rem;">
                      <i class="pi pi-clock" style="color: var(--primary-color, #0f2942);"></i>
                      <span>Awaiting compliance declaration & documents from <strong style="color: var(--text-color, #e2e8f0);">{{ t.sub_dept_name || 'Sub-Department' }}</strong></span>
                    </div>
                  </ng-template>
                </ng-container>

                <!-- ══ CASE 2: DIRECT TASKS OR SUB-DEPT USER VIEWING THEIR TASK ══ -->
                <ng-container *ngIf="!isHeadDepartmentUser() || (!isSubDeptSubmission(null, t)) || isReviewer()">
                  <!-- If assignment is completed, hide form inputs and show read-only details -->
                  <div *ngIf="assignmentStatus() === 'COMPLETED'; else activeComplianceForm" 
                       class="saved-response-panel w-full"
                       [ngClass]="{
                         'panel-complied': t.compliance_status === 'COMPLIED' || (!t.compliance_status && t.status === 'COMPLETED'),
                         'panel-not-complied': t.compliance_status === 'NOT_COMPLIED'
                       }">
                    <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                      <span class="text-xs font-bold" style="color: var(--text-color-secondary, #94a3b8);">Compliance Status:</span>
                      <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                            [style.background]="t.compliance_status === 'COMPLIED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'"
                            [style.color]="t.compliance_status === 'COMPLIED' ? '#10b981' : '#ef4444'"
                            [style.border]="t.compliance_status === 'COMPLIED' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'"
                            *ngIf="t.compliance_status === 'COMPLIED'">
                        Complied
                      </span>
                      <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                            [style.background]="'rgba(239,68,68,0.15)'"
                            [style.color]="'#ef4444'"
                            [style.border]="'1px solid rgba(239,68,68,0.3)'"
                            *ngIf="t.compliance_status === 'NOT_COMPLIED'">
                        Not Complied
                      </span>
                      <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                            style="background: var(--surface-hover); color: var(--text-color-secondary); border: 1px solid var(--surface-border);"
                            *ngIf="t.compliance_status !== 'COMPLIED' && t.compliance_status !== 'NOT_COMPLIED'">
                        {{ t.compliance_status || 'Pending Declaration' }}
                      </span>
                    </div>
                    <div class="text-xs font-medium mt-1" *ngIf="t.remarks" style="color: var(--text-color, #1f2937);">
                      <strong style="color: var(--text-color-secondary, #94a3b8);">Remarks / Explanation:</strong> "{{ t.remarks }}"
                    </div>
                    <!-- View PDF link -->
                    <div class="mt-1.5" *ngIf="hasFileToView(t)">
                      <button type="button" (click)="previewFile(t)" class="evidence-link border-none bg-transparent cursor-pointer p-0 font-bold" style="color: #ef4444; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                        <i [class]="getFileIcon(t.evidence_url)" [style.color]="getFileIconColor(t.evidence_url)"></i> View Evidence
                      </button>
                    </div>
                  </div>

                  <!-- Active compliance form (during In_Progress or review) -->
                  <ng-template #activeComplianceForm>
                    <div *ngIf="canEditTaskAssignment(t); else readOnlyTaskBlock" style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                      
                      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <label class="control-label font-bold m-0" style="font-size: 0.725rem; color: var(--text-color-secondary, #475569);">
                            Remarks / Explanation <span style="color: #ef4444;">*</span>
                          </label>
                        </div>
                        <textarea pTextarea
                                  [(ngModel)]="t.temp_remarks"
                                  class="answer-control w-full"
                                  style="resize: none; min-height: 3.4rem; height: 3.4rem; font-size: 0.8rem; padding: 0.45rem 0.6rem;"
                                  placeholder="Add compliance remarks or explanation..."></textarea>
                      </div>

                      <!-- Bottom Actions Row -->
                      <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.25rem;">
                        
                        <!-- Actions & Upload Button Row -->
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                          
                          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                            <button type="button"
                                    (click)="openEvidencePicker(t)"
                                    style="padding: 0.25rem 0.65rem; height: 1.95rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; font-weight: 600; border: 1px dashed #6366f1; background: rgba(99, 102, 241, 0.12); color: #818cf8; margin: 0; cursor: pointer;">
                              <i class="pi pi-upload" style="font-size: 0.72rem;"></i> 
                              {{ getSelectedFiles(t.assignment_task_id).length > 0 ? '+ Add More Evidence' : 'Upload Evidence' }}
                            </button>

                            <button *ngIf="hasSavedEvidence(t)"
                                    type="button"
                                    (click)="previewFile(t)"
                                    class="p-button p-button-sm p-button-outlined p-button-danger"
                                    style="height: 1.95rem; font-size: 0.72rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                              <i [class]="getFileIcon(t.evidence_url)"></i> View Saved Evidence
                            </button>
                          </div>

                          <!-- Save Task Button -->
                          <p-button label="Save Task"
                                    [loading]="!!rowSavingMap()[t.assignment_task_id]"
                                    loadingIcon="pi pi-spinner pi-spin"
                                    icon="pi pi-save"
                                    iconPos="left"
                                    (click)="saveSingleTask(t)"
                                    styleClass="save-row-btn"
                                    size="small" />
                        </div>

                        <!-- Staged Evidence Files List with Preview & Remove Option -->
                        <div *ngIf="getSelectedFiles(t.assignment_task_id).length > 0" 
                             style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.2rem; padding: 0.35rem 0.5rem; background: rgba(99, 102, 241, 0.05); border-radius: 6px; border: 1px dashed rgba(99, 102, 241, 0.2);">
                          <div *ngFor="let file of getSelectedFiles(t.assignment_task_id); let fIdx = index"
                               style="display: inline-flex; align-items: center; gap: 0.35rem; background: #ffffff; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.72rem; color: #047857; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            <i [class]="getFileIcon(file.name)" [style.color]="getFileIconColor(file.name)" style="font-size: 0.82rem;"></i>
                            <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;" [title]="file.name">
                              {{ file.name }}
                            </span>
                            <button type="button" 
                                    (click)="previewSelectedFile(file)" 
                                    title="Preview File"
                                    style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 0.1rem 0.35rem; cursor: pointer; color: #10b981; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                              <i class="pi pi-eye" style="font-size: 0.68rem;"></i>
                            </button>
                            <button type="button" 
                                    (click)="removeSelectedFile(t.assignment_task_id, fIdx)" 
                                    title="Remove this evidence file"
                                    style="background: none; border: none; padding: 0.1rem 0.2rem; cursor: pointer; color: #ef4444; display: inline-flex; align-items: center;">
                              <i class="pi pi-trash" style="font-size: 0.75rem;"></i>
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>

                    <ng-template #readOnlyTaskBlock>
                      <div class="saved-response-panel w-full"
                           [ngClass]="{
                             'panel-complied': t.compliance_status === 'COMPLIED' || (!t.compliance_status && t.status === 'COMPLETED'),
                             'panel-not-complied': t.compliance_status === 'NOT_COMPLIED'
                           }">
                        <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                          <span class="text-xs font-bold" style="color: var(--text-color-secondary, #94a3b8);">Compliance Status:</span>
                          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                                [style.background]="t.compliance_status === 'COMPLIED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'"
                                [style.color]="t.compliance_status === 'COMPLIED' ? '#10b981' : '#ef4444'"
                                [style.border]="t.compliance_status === 'COMPLIED' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'"
                                *ngIf="t.compliance_status === 'COMPLIED'">
                            Complied
                          </span>
                          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                                [style.background]="'rgba(239,68,68,0.15)'"
                                [style.color]="'#ef4444'"
                                [style.border]="'1px solid rgba(239,68,68,0.3)'"
                                *ngIf="t.compliance_status === 'NOT_COMPLIED'">
                            Not Complied
                          </span>
                          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                                style="background: var(--surface-hover); color: var(--text-color-secondary); border: 1px solid var(--surface-border);"
                                *ngIf="t.compliance_status !== 'COMPLIED' && t.compliance_status !== 'NOT_COMPLIED'">
                            {{ t.compliance_status || 'Pending Declaration' }}
                          </span>
                        </div>
                        <div class="text-xs font-medium mt-1" *ngIf="t.remarks" style="color: var(--text-color, #1f2937);">
                          <strong style="color: var(--text-color-secondary, #94a3b8);">Remarks / Explanation:</strong> "{{ t.remarks }}"
                        </div>
                        <div class="mt-1.5" *ngIf="hasFileToView(t)">
                          <button type="button" (click)="previewFile(t)" class="evidence-link border-none bg-transparent cursor-pointer p-0 font-bold" style="color: #ef4444; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                            <i [class]="getFileIcon(t.evidence_url)" [style.color]="getFileIconColor(t.evidence_url)"></i> View Evidence
                          </button>
                        </div>
                      </div>
                    </ng-template>

                  </ng-template>
                </ng-container>

                <!-- History Action Trigger Buttons Footer -->
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding-top: 0.4rem; border-top: 1px solid var(--surface-border, #f1f5f9); margin-top: 0.2rem;">
                  <button *ngIf="hasRemarksHistory(t)"
                          type="button"
                          pButton
                          icon="pi pi-comments"
                          [label]="'Remark Chain (' + getVisibleRemarksHistory(t).length + ')'"
                          class="p-button-outlined p-button-sm p-button-secondary"
                          (click)="openRemarkChainDialog(t)"
                          style="font-size: 0.72rem; padding: 0.2rem 0.55rem; height: 1.75rem;">
                  </button>

                  <button *ngIf="hasEvidenceHistory(t)"
                          type="button"
                          pButton
                          icon="pi pi-paperclip"
                          [label]="'Evidence History (' + t.evidence_history.length + ')'"
                          class="p-button-outlined p-button-sm p-button-info"
                          (click)="openEvidenceHistoryDialog(t)"
                          style="font-size: 0.72rem; padding: 0.2rem 0.55rem; height: 1.75rem;">
                  </button>
                </div>

              </div>
            </ng-template>

          </div>
        </div>
      </div>
    </ng-container>

    <!-- ══ SUB-DEPARTMENT USER: SUBMIT COMPLIANCE TO HEAD DEPARTMENT ══ -->
    <div class="mt-4 mb-5" *ngIf="isSubDepartmentUser() && assignmentStatus() !== 'COMPLETED' && !isReviewer()" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
      <div style="width: 100%; max-width: 680px; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
           [ngClass]="{
             'bg-green-50 border border-green-200 text-green-800': subDeptSubmitted() || isSubDeptAllTasksFilled(),
             'bg-blue-50 border border-blue-200 text-blue-800': !subDeptSubmitted() && !isSubDeptAllTasksFilled()
           }">
        <i [class]="subDeptSubmitted() ? 'pi pi-check-circle text-green-600 text-lg' : (isSubDeptAllTasksFilled() ? 'pi pi-info-circle text-green-600 text-lg' : 'pi pi-clock text-blue-600 text-lg')" style="margin-top: 0.1rem;"></i>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 0.825rem; margin-bottom: 0.15rem;">
            <ng-container *ngIf="subDeptSubmitted()">
              ✅ Compliance Submitted to Head Department ({{ completedCount() }}/{{ visibleTasks().length }} Completed)
            </ng-container>
            <ng-container *ngIf="!subDeptSubmitted() && isSubDeptAllTasksFilled()">
              All Checklist Items Ready ({{ completedCount() }}/{{ visibleTasks().length }})
            </ng-container>
            <ng-container *ngIf="!subDeptSubmitted() && !isSubDeptAllTasksFilled()">
              Checklist In Progress ({{ completedCount() }}/{{ visibleTasks().length }} Completed)
            </ng-container>
          </div>
          <div>
            <ng-container *ngIf="subDeptSubmitted()">
              Your checklist responses and evidence have been submitted to Head Department. Awaiting Head Department review and acceptance.
            </ng-container>
            <ng-container *ngIf="!subDeptSubmitted() && isSubDeptAllTasksFilled()">
              Your compliance responses and evidence are ready. Click below to submit them to the Head Department for review & acceptance.
            </ng-container>
            <ng-container *ngIf="!subDeptSubmitted() && !isSubDeptAllTasksFilled()">
              Please ensure each checklist item has remarks and evidence saved before submitting.
            </ng-container>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <p-button
          [label]="subDeptSubmitted() ? 'Submitted to Head Department' : 'Submit to Head Department for Review'"
          [icon]="subDeptSubmitted() ? 'pi pi-check' : 'pi pi-send'"
          [severity]="subDeptSubmitted() ? 'success' : 'primary'"
          [disabled]="!isSubDeptAllTasksFilled() || submitting || subDeptSubmitted()"
          [loading]="submitting"
          loadingIcon="pi pi-spinner pi-spin"
          (click)="submitSubDeptComplianceToHead()" />
      </div>
    </div>

    <!-- Bulk Submit / Complete Compliance Section: For Head Department User -->
    <div class="mt-4 mb-5" *ngIf="!isDirectSubDeptAssignment() && isHeadDepartmentUser() && assignmentStatus().toUpperCase() !== 'COMPLETED' && !isReviewer()" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
      
      <!-- ==================== CASE A: Branch-Created Task Sets (Direct Completion Flow) ==================== -->
      <ng-container *ngIf="isBranchCreated(); else circularReviewFlow">
        
        <!-- Pending Head Decision / Rejection Alert Banner for Internal Task Sets -->
        <div *ngIf="!allTasksApprovedByHead()" style="width: 100%; max-width: 680px; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
             [ngClass]="{
               'bg-red-50 border border-red-200 text-red-800': rejectedSubDeptTasksCount() > 0,
               'bg-amber-50 border border-amber-200 text-amber-800': rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0,
               'bg-blue-50 border border-blue-200 text-blue-800': rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0
             }">
          <i [class]="rejectedSubDeptTasksCount() > 0 ? 'pi pi-exclamation-triangle text-red-600 text-lg' : (pendingHeadAcceptanceCount() > 0 ? 'pi pi-info-circle text-amber-600 text-lg' : 'pi pi-clock text-blue-600 text-lg')" style="margin-top: 0.1rem;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.825rem; margin-bottom: 0.15rem;">
              <ng-container *ngIf="rejectedSubDeptTasksCount() > 0">
                Action Required: {{ rejectedSubDeptTasksCount() }} Task(s) Rejected & Pending Sub-Department Re-compliance
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0">
                Pending Head Decision: {{ pendingHeadAcceptanceCount() }} Sub-Department Submission(s) Ready for Review
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0">
                Awaiting Task Compliance
              </ng-container>
            </div>
            <div>
              <ng-container *ngIf="rejectedSubDeptTasksCount() > 0">
                You have rejected {{ rejectedSubDeptTasksCount() }} task(s). The Sub-Department must re-submit their compliance and you must accept it before you can complete the assignment.
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0">
                Please review each task card above and click <strong>"Accept"</strong> (or "Reject" if changes are needed). All delegated tasks must be accepted by Head Department before completing.
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0">
                Ensure all direct and delegated checklist items are completed before marking as completed.
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Ready to Complete Banner for Branch-Created Tasks -->
        <div *ngIf="allTasksApprovedByHead()" style="width: 100%; max-width: 680px; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: #f0fdf4; border: 1px solid #86efac; color: #166534;">
          <i class="pi pi-check-circle text-green-600 text-lg" style="margin-top: 0.1rem;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.825rem; margin-bottom: 0.15rem;">
              All Compliance Tasks Accepted
            </div>
            <div>
              All checklist items have been reviewed and accepted. Click <strong>"Complete Compliance"</strong> below to directly complete and close this department compliance checklist.
            </div>
          </div>
        </div>

        <!-- Direct Complete Button Only (No CO submission for branch-created task sets) -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
          <p-button
            label="Complete Compliance"
            icon="pi pi-check-circle"
            severity="success"
            [disabled]="!allTasksApprovedByHead() || submitting"
            pTooltip="Complete this department compliance directly"
            [loading]="submitting && lastSubmitAction === 'COMPLETE'"
            loadingIcon="pi pi-spinner pi-spin"
            (click)="submitAllCompliance('COMPLETE')" />
        </div>
      </ng-container>

      <!-- ==================== CASE B: Regular Circular Master Flow (CO Review) ==================== -->
      <ng-template #circularReviewFlow>
        <!-- Rejection / Pending Guidance Alert Banner for Head (when in progress or pending sub-dept review) -->
        <div *ngIf="!allTasksApprovedByHead() && assignmentStatus().toUpperCase() !== 'ESCALATED_TO_CCO'" style="width: 100%; max-width: 680px; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
             [ngClass]="{
               'bg-red-50 border border-red-200 text-red-800': rejectedSubDeptTasksCount() > 0,
               'bg-amber-50 border border-amber-200 text-amber-800': rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0,
               'bg-blue-50 border border-blue-200 text-blue-800': rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0
             }">
          <i [class]="rejectedSubDeptTasksCount() > 0 ? 'pi pi-exclamation-triangle text-red-600 text-lg' : (pendingHeadAcceptanceCount() > 0 ? 'pi pi-info-circle text-amber-600 text-lg' : 'pi pi-clock text-blue-600 text-lg')" style="margin-top: 0.1rem;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.825rem; margin-bottom: 0.15rem;">
              <ng-container *ngIf="rejectedSubDeptTasksCount() > 0">
                Action Required: {{ rejectedSubDeptTasksCount() }} Task(s) Rejected & Pending Sub-Department Re-compliance
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0">
                Pending Head Decision: {{ pendingHeadAcceptanceCount() }} Sub-Department Submission(s) Ready for Review
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0">
                Awaiting Task Compliance
              </ng-container>
            </div>
            <div>
              <ng-container *ngIf="rejectedSubDeptTasksCount() > 0">
                You have rejected {{ rejectedSubDeptTasksCount() }} task(s). The Sub-Department must re-submit their compliance and you must accept it before you can submit to CO.
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0">
                Please review each task card above and click <strong>"Accept"</strong> (or "Reject" if changes are needed). All delegated tasks must be accepted by Head Department before submitting to CO.
              </ng-container>
              <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0">
                Ensure all direct and delegated checklist items are completed and accepted before submitting to CO.
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Ready to Submit to Compliance Officer Banner (When all tasks approved, ready for Head to submit) -->
        <div *ngIf="allTasksApprovedByHead() && assignmentStatus().toUpperCase() !== 'REVIEW_PENDING' && assignmentStatus().toUpperCase() !== 'ESCALATED_TO_CCO'" style="width: 100%; max-width: 680px; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: #f0fdf4; border: 1px solid #86efac; color: #166534;">
          <i class="pi pi-check-circle text-green-600 text-lg" style="margin-top: 0.1rem;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.825rem; margin-bottom: 0.15rem;">
              All Compliance Tasks Accepted
            </div>
            <div>
              All checklist items have been reviewed and accepted. Click <strong>"Submit to Compliance Officer"</strong> below to send this compliance checklist to the CO Review Queue for approval.
            </div>
          </div>
        </div>

        <!-- Submit to Compliance Officer Button (Shown to Head Dept whenever not yet in review, or disabled if pending tasks) -->
        <div *ngIf="(!allTasksApprovedByHead()) || (assignmentStatus().toUpperCase() !== 'REVIEW_PENDING' && assignmentStatus().toUpperCase() !== 'ESCALATED_TO_CCO')" 
             style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
          <p-button
            label="Submit to Compliance Officer"
            icon="pi pi-send"
            severity="primary"
            [disabled]="!allTasksApprovedByHead() || submitting"
            [pTooltip]="!allTasksApprovedByHead() ? 'Cannot submit: Please ensure all direct tasks are filled, all sub-dept submissions are accepted, and no tasks are pending re-compliance.' : 'Submit compliance checklist to CO Review Queue'"
            tooltipPosition="top"
            [loading]="submitting && lastSubmitAction === 'SUBMIT_CO'"
            loadingIcon="pi pi-spinner pi-spin"
            (click)="submitAllCompliance('SUBMIT_CO')" />
        </div>

        <!-- Already submitted to CO banner (ONLY when ALL tasks approved AND status is REVIEW_PENDING or ESCALATED) -->
        <div *ngIf="allTasksApprovedByHead() && (assignmentStatus().toUpperCase() === 'REVIEW_PENDING' || assignmentStatus().toUpperCase() === 'ESCALATED_TO_CCO')" 
             style="width: 100%; max-width: 680px; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46;">
          <i class="pi pi-check-circle text-green-600 text-lg" style="margin-top: 0.1rem;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.825rem; margin-bottom: 0.15rem;">
              {{ assignmentStatus().toUpperCase() === 'ESCALATED_TO_CCO' ? 'Escalated to CCO for Final Review' : 'Compliance Submitted to Compliance Officer' }}
            </div>
            <div>
              {{ assignmentStatus().toUpperCase() === 'ESCALATED_TO_CCO' ? 'This assignment has been escalated to CCO. Awaiting CCO review decision.' : 'Your department compliance checklist has been submitted to the Compliance Officer. Awaiting review and approval in CO Review Queue.' }}
            </div>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Direct Mode Info for Head Department User (View-only compliance info) -->
    <div class="mt-4 mb-5 flex justify-content-center" *ngIf="isDirectSubDeptAssignment() && isHeadDepartmentUser() && assignmentStatus() !== 'COMPLETED' && !isReviewer()">
      <div style="padding: 0.65rem 1.25rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
        <i class="pi pi-eye" style="color: #0f2942; font-size: 0.9rem;"></i>
        <span>Head Department Overview: Sub-department compliance submissions are routed directly to CO Review.</span>
      </div>
    </div>

    <!-- Approve Timeline with changes (CCO/CO reviewing) -->
    <div class="flex justify-content-center mt-4 mb-5" *ngIf="canApproveTimeline()" style="display: flex; justify-content: center;">
      <p-button
        label="Approve Timeline"
        icon="pi pi-check"
        severity="success"
        [loading]="submitting"
        loadingIcon="pi pi-spinner pi-spin"
        (click)="approveCustomTimeline()" />
    </div>

    <div *ngIf="taskGroups().length === 0" class="glass-panel text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100" style="padding: 2.5rem; text-align: center; border-radius: 12px; background: #ffffff; border: 1px dashed #cbd5e1; margin-top: 1rem;">
      <i class="pi pi-inbox text-4xl mb-3 text-gray-400" style="font-size: 2.5rem; color: #94a3b8; display: block; margin-bottom: 0.75rem;"></i>
      <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #334155;">{{ isSubDepartmentUser() ? 'No Tasks Assigned to Your Sub-Department' : 'No compliance tasks found for this assignment.' }}</h3>
      <p *ngIf="isSubDepartmentUser()" style="margin: 0; font-size: 0.875rem; color: #64748b;">There are currently no tasks delegated to your sub-department under this checklist.</p>
    </div>

    <!-- Remark Chain & Evidence History Dialog Overlay -->
    <p-dialog [(visible)]="displayRemarkChainDialog" 
              [header]="(historyDialogMode === 'EVIDENCE' ? 'Evidence Upload History' : 'Remark Chain Timeline') + ' - Task #' + (selectedTaskForChain?.assignment_task_id || '')" 
              [modal]="true" 
              [style]="{ width: '650px', maxWidth: '92vw' }" 
              [draggable]="false" 
              [resizable]="false"
              (onHide)="closeRemarkChainDialog()">

      <div *ngIf="selectedTaskForChain" style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Task Title Banner -->
        <div style="background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.725rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem;">
            Task Description
          </div>
          <div style="font-size: 0.88rem; font-weight: 600; color: #1e293b; line-height: 1.4;">
            {{ selectedTaskForChain.description }}
          </div>
        </div>

        <!-- Evidence History Section in Dialog (shown only in EVIDENCE mode) -->
        <div *ngIf="historyDialogMode === 'EVIDENCE' && hasEvidenceHistory(selectedTaskForChain)" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <div style="background: #f1f5f9; padding: 0.55rem 0.85rem; font-size: 0.78rem; font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between;">
            <span style="display: flex; align-items: center; gap: 0.4rem;">
              <i class="pi pi-paperclip text-indigo-600"></i> Evidence Upload History ({{ selectedTaskForChain.evidence_history.length }})
            </span>
            <span style="font-size: 0.68rem; color: #64748b; font-weight: 500;">
              Role Chain: Department &rarr; CO &rarr; CCO
            </span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 0.65rem; padding: 0.85rem; max-height: 280px; overflow-y: auto;">
            <div *ngFor="let ev of selectedTaskForChain.evidence_history; let evIdx = index" 
                 style="padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem;">
              
              <!-- Header: Uploader Info & Date -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.35rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem;">
                <div style="display: flex; align-items: center; gap: 0.45rem;">
                  <i [class]="getRoleIcon(ev.uploader_role)" style="font-size: 0.85rem; color: #4338ca;"></i>
                  <span style="font-weight: 700; color: #0f2942; font-size: 0.8rem;">
                    {{ ev.uploader_name || 'Department / Reviewer' }}
                  </span>
                  <span [class]="getRoleBadgeClass(ev.uploader_role)" 
                        style="font-size: 0.62rem; font-weight: 700; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 4px; letter-spacing: 0.03em;">
                    {{ ev.uploader_role || 'EVIDENCE' }}
                  </span>
                </div>
                <span style="font-size: 0.68rem; color: #64748b; display: flex; align-items: center; gap: 0.25rem;">
                  <i class="pi pi-clock" style="font-size: 0.65rem;"></i>
                  {{ ev.submitted_at | date:'dd-MM-yyyy HH:mm' }}
                </span>
              </div>

              <!-- PDF Link & File Info -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.15rem;">
                <a [href]="ev.file_url" target="_blank" 
                   style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; color: #dc2626; text-decoration: none; font-size: 0.78rem;">
                  <i [class]="getFileIcon(ev.file_name || ev.file_url)" [style.color]="getFileIconColor(ev.file_name || ev.file_url)" style="font-size: 0.95rem;"></i> 
                  <span>{{ cleanFileName(ev.file_name || ev.file_url || 'View Evidence') }}</span>
                </a>
                
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <a [href]="ev.file_url" target="_blank" 
                     class="p-button p-button-sm p-button-outlined p-button-danger"
                     style="text-decoration: none; padding: 0.2rem 0.55rem; font-size: 0.7rem; height: 1.65rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i class="pi pi-external-link"></i> Open File
                  </a>
                  <!-- Delete button allowed ONLY if user has authority to delete (e.g. self-compliance or sub-dept owner before submit) -->
                  <button *ngIf="canDeleteEvidence(ev, selectedTaskForChain, evIdx)"
                          type="button" 
                          pButton 
                          icon="pi pi-trash" 
                          label="Delete" 
                          size="small" 
                          severity="danger" 
                          (click)="deleteSavedEvidence(ev, selectedTaskForChain)"
                          styleClass="p-button-sm p-button-outlined h-2rem text-xs font-semibold px-2 text-red-600 border-red-300 hover:bg-red-50"
                          title="Delete this recently uploaded evidence"></button>
                  <span *ngIf="!canDeleteEvidence(ev, selectedTaskForChain, evIdx)" 
                        style="font-size: 0.65rem; color: #94a3b8; font-style: italic; background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px;"
                        [title]="isSubDeptSubmission(ev, selectedTaskForChain) ? 'Evidence submitted by delegated sub-department' : 'Historical evidence is preserved in compliance audit trail'">
                    <i class="pi pi-lock" style="font-size: 0.6rem;"></i> {{ isSubDeptSubmission(ev, selectedTaskForChain) && !isSubDepartmentUser() ? 'Sub-Dept Submission' : 'Audit Record' }}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Visual Remark Chain Timeline in Dialog (shown only in REMARK mode) -->
        <div *ngIf="historyDialogMode === 'REMARK' && hasRemarksHistory(selectedTaskForChain)" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #f1f5f9; padding: 0.5rem 0.75rem; font-size: 0.78rem; font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between;">
            <span style="display: flex; align-items: center; gap: 0.4rem;">
              <i class="pi pi-comments text-indigo-600"></i> Remark Chain Timeline ({{ getVisibleRemarksHistory(selectedTaskForChain).length }})
            </span>
            <span style="font-size: 0.68rem; color: #6b7280; font-weight: 500;">Role Chain: Department &rarr; CO &rarr; CCO</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; max-height: 320px; overflow-y: auto; background: #fafafa;">
            <div *ngFor="let h of getVisibleRemarksHistory(selectedTaskForChain); let last = last" 
                 style="position: relative; padding-left: 1.75rem; text-align: left;">
                 
              <!-- Vertical Connector Line -->
              <div *ngIf="!last" style="position: absolute; left: 0.5rem; top: 1.25rem; bottom: -0.75rem; width: 2px; background: #cbd5e1;"></div>
              
              <!-- Node Icon Bullet -->
              <div [ngClass]="{
                     'bg-amber-600 text-white': isHeadEditRemark(h, selectedTaskForChain),
                     'bg-purple-600 text-white': !isHeadEditRemark(h, selectedTaskForChain) && (h.role || '').toUpperCase() === 'CCO',
                     'bg-amber-500 text-white': !isHeadEditRemark(h, selectedTaskForChain) && ((h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER'),
                     'bg-indigo-600 text-white': !isHeadEditRemark(h, selectedTaskForChain) && ((h.role || '').toUpperCase() === 'COMPLIER' || (h.role || '').toUpperCase() === 'DEPARTMENT' || (h.role || '').toUpperCase() === 'BRANCH')
                   }" 
                   style="position: absolute; left: 0; top: 0.15rem; width: 1.1rem; height: 1.1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                <i [class]="isHeadEditRemark(h, selectedTaskForChain) ? 'pi pi-pencil' : ((h.role || '').toUpperCase() === 'CCO' ? 'pi pi-verified' : (((h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER') ? 'pi pi-shield' : 'pi pi-user'))"></i>
              </div>

              <!-- Node Content Card -->
              <div [ngClass]="{
                     'bg-amber-50/90 border-amber-300': isHeadEditRemark(h, selectedTaskForChain),
                     'bg-purple-50/70 border-purple-200': !isHeadEditRemark(h, selectedTaskForChain) && (h.role || '').toUpperCase() === 'CCO',
                     'bg-amber-50/70 border-amber-200': !isHeadEditRemark(h, selectedTaskForChain) && ((h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER'),
                     'bg-indigo-50/70 border-indigo-200': !isHeadEditRemark(h, selectedTaskForChain) && ((h.role || '').toUpperCase() === 'COMPLIER' || (h.role || '').toUpperCase() === 'DEPARTMENT' || (h.role || '').toUpperCase() === 'BRANCH')
                   }"
                   style="padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid; font-size: 0.78rem;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.25rem;">
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: #111827;">{{ h.username }}</span>
                    
                    <!-- Head Edit Badge -->
                    <ng-container *ngIf="isHeadEditRemark(h, selectedTaskForChain)">
                      <span style="font-size: 0.65rem; padding: 0.1rem 0.5rem; border-radius: 9999px; font-weight: 700; text-transform: uppercase; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="pi pi-pencil" style="font-size: 0.6rem;"></i> Edited by Head
                      </span>
                      <span style="font-size: 0.65rem; color: #92400e; font-weight: 600;">
                        (Sub-Dept Remark Modified)
                      </span>
                    </ng-container>

                    <!-- Standard Role Badge -->
                    <span *ngIf="!isHeadEditRemark(h, selectedTaskForChain)"
                          [ngClass]="{
                            'bg-purple-200 text-purple-800': (h.role || '').toUpperCase() === 'CCO',
                            'bg-amber-200 text-amber-800': (h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER',
                            'bg-indigo-200 text-indigo-800': (h.role || '').toUpperCase() === 'COMPLIER' || (h.role || '').toUpperCase() === 'DEPARTMENT' || (h.role || '').toUpperCase() === 'BRANCH'
                          }"
                          style="font-size: 0.65rem; padding: 0.1rem 0.45rem; border-radius: 9999px; font-weight: 700; text-transform: uppercase;">
                      {{ (h.role || '').toUpperCase() === 'CCO' ? 'CCO' : (((h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER') ? 'CO Reviewer' : (selectedTaskForChain?.sub_dept_name ? 'Sub-Department' : 'Department/Branch')) }}
                    </span>
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span style="font-size: 0.68rem; color: #6b7280; font-weight: 500;">
                      <i class="pi pi-clock" style="font-size: 0.65rem; margin-right: 0.15rem;"></i> {{ h.created_at | date:'dd-MM-yyyy HH:mm' }}
                    </span>
                    <button *ngIf="canEditRemark(h, selectedTaskForChain)" 
                            type="button" 
                            (click)="startEditTimelineRemark(h)"
                            title="Edit this remark"
                            style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 4px; padding: 0.12rem 0.45rem; cursor: pointer; color: #4f46e5; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                      <i class="pi pi-pencil" style="font-size: 0.65rem;"></i> Edit
                    </button>
                  </div>
                </div>

                <div *ngIf="!h.isEditing">
                  <div *ngIf="isHeadEditRemark(h, selectedTaskForChain)" style="font-size: 0.68rem; color: #b45309; font-weight: 700; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.25rem;">
                    <i class="pi pi-pencil" style="font-size: 0.62rem;"></i> Modified Sub-Dept Remark:
                  </div>
                  <p style="margin: 0; font-weight: 500; line-height: 1.4;" [style.color]="isHeadEditRemark(h, selectedTaskForChain) ? '#78350f' : '#1f2937'">
                    {{ h.remark }}
                  </p>
                </div>
                <div *ngIf="h.isEditing" style="margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.35rem;">
                  <textarea pTextarea 
                            [(ngModel)]="h.editedRemark" 
                            rows="2" 
                            class="w-full p-2 border rounded text-xs" 
                            style="resize: none; font-size: 0.78rem;" 
                            placeholder="Edit remark..."></textarea>
                  <div style="display: flex; justify-content: flex-end; gap: 0.3rem;">
                    <button type="button" 
                            (click)="saveTimelineRemark(h, selectedTaskForChain)" 
                            [disabled]="h.saving" 
                            style="background: #10b981; border: 1px solid #059669; color: white; padding: 0.15rem 0.5rem; font-size: 0.7rem; font-weight: 700; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.2rem;">
                      <i class="pi" [ngClass]="h.saving ? 'pi-spin pi-spinner' : 'pi-check'" style="font-size: 0.65rem;"></i>
                      <span>Save</span>
                    </button>
                    <button type="button" 
                            (click)="cancelEditTimelineRemark(h)" 
                            [disabled]="h.saving" 
                            style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #64748b; padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 600; border-radius: 4px; cursor: pointer;">
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton label="Close" icon="pi pi-times" class="p-button-secondary p-button-sm" (click)="closeRemarkChainDialog()"></button>
      </ng-template>
    </p-dialog>

    <!-- Evidence Source Selection & Department Repository Dialog -->
    <p-dialog [(visible)]="displayEvidenceSourceModal"
              [header]="evidenceSourceStep === 'CHOOSE_SOURCE' ? 'Attach Compliance Evidence' : (evidenceSourceStep === 'BROWSE_PREVIOUS' ? 'Select Previous Department Evidence' : 'Confirm & Name Evidence Document')"
              [modal]="true"
              appendTo="body"
              [style]="{ width: '640px', maxWidth: '95vw' }"
              [draggable]="false"
              [resizable]="false">

      <!-- Step 1: Choose Source (PC vs Previous Department Evidence) -->
      <div *ngIf="evidenceSourceStep === 'CHOOSE_SOURCE'" style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
        <p style="font-size: 0.85rem; color: #475569; margin: 0;">
          Choose the source for evidence attachment for: <strong>{{ activeEvidenceTaskTitle }}</strong>
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
          
          <!-- Option 1: Upload from Computer (PC) -->
          <label style="border: 2px dashed #6366f1; background: #f5f7ff; border-radius: 10px; padding: 1.5rem 1rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.65rem; cursor: pointer; transition: all 0.2s;">
            <input type="file" (change)="onFileSelected($event, activeEvidenceTaskId)" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,image/*" style="display: none;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
              <i class="pi pi-desktop"></i>
            </div>
            <span style="font-size: 0.95rem; font-weight: 700; color: #1e1b4b;">Upload from PC</span>
            <span style="font-size: 0.75rem; color: #64748b; line-height: 1.4;">Browse and upload files (PDF, Images, Word, Excel &bull; Max 5MB)</span>
          </label>

          <!-- Option 2: Select from Previous Department Evidence -->
          <div (click)="evidenceSourceStep = 'BROWSE_PREVIOUS'" style="border: 2px solid #0d9488; background: #f0fdfa; border-radius: 10px; padding: 1.5rem 1rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.65rem; cursor: pointer; transition: all 0.2s;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: #ccfbf1; color: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
              <i class="pi pi-folder-open"></i>
            </div>
            <span style="font-size: 0.95rem; font-weight: 700; color: #134e4a;">Previous Department Evidence</span>
            <span style="font-size: 0.75rem; color: #64748b; line-height: 1.4;">
              Choose from previously stored evidence documents for {{ branchName() || 'this department' }}
            </span>
          </div>

        </div>
      </div>

      <!-- Step 2: Browse Department Evidences -->
      <div *ngIf="evidenceSourceStep === 'BROWSE_PREVIOUS'" style="display: flex; flex-direction: column; gap: 0.85rem; padding: 0.25rem 0;">
        
        <!-- Search & Department Badge Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #0f766e; background: #ccfbf1; padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid #99f6e4;">
              <i class="pi pi-building" style="font-size: 0.7rem;"></i> {{ deptEvidenceBadgeLabel }}
            </span>
            <span style="font-size: 0.75rem; color: #64748b;">({{ filteredDeptEvidences.length }} available)</span>
          </div>
          <input type="text" pInputText [(ngModel)]="deptEvidenceSearch" placeholder="Search evidence files..." style="font-size: 0.78rem; height: 2rem; min-width: 200px;" />
        </div>

        <!-- Loading State -->
        <div *ngIf="loadingDeptEvidences" style="text-align: center; padding: 2rem; color: #64748b; font-size: 0.82rem;">
          <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block; color: #0d9488;"></i>
          Loading department evidence repository...
        </div>

        <!-- Empty State -->
        <div *ngIf="!loadingDeptEvidences && filteredDeptEvidences.length === 0" style="text-align: center; padding: 2rem 1rem; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
          <i class="pi pi-folder-open" style="font-size: 2rem; color: #94a3b8; margin-bottom: 0.5rem; display: block;"></i>
          <p style="font-size: 0.85rem; font-weight: 600; color: #334155; margin: 0 0 0.25rem 0;">No previous evidence found for this department</p>
          <p style="font-size: 0.75rem; color: #64748b; margin: 0 0 0.75rem 0;">You can upload a fresh file from your computer.</p>
          <button pButton label="Back to Source Selection" icon="pi pi-arrow-left" size="small" [outlined]="true" (click)="evidenceSourceStep = 'CHOOSE_SOURCE'"></button>
        </div>

        <!-- List of Previous Evidence Items -->
        <div *ngIf="!loadingDeptEvidences && filteredDeptEvidences.length > 0" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 340px; overflow-y: auto; padding-right: 0.25rem;">
          <div *ngFor="let item of filteredDeptEvidences" 
               style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.85rem; transition: all 0.15s;">
            <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
              <i [class]="getFileIcon(item.name || item.url)" [style.color]="getFileIconColor(item.name || item.url)" style="font-size: 1.35rem; flex-shrink: 0;"></i>
              <div style="display: flex; flex-direction: column; gap: 0.15rem; min-width: 0;">
                <span style="font-size: 0.82rem; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="item.name">
                  {{ item.name }}
                </span>
                <div style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.68rem; color: #64748b; flex-wrap: wrap;">
                  <span *ngIf="item.source" style="background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 600; color: #475569;">
                    {{ item.source }}
                  </span>
                  <span *ngIf="item.date">
                    <i class="pi pi-calendar" style="font-size: 0.62rem;"></i> {{ item.date | date:'dd/MM/yyyy' }}
                  </span>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
              <a *ngIf="item.url" [href]="resolveFileUrl(item.url)" target="_blank" 
                 class="p-button p-button-sm p-button-text p-button-secondary" 
                 style="text-decoration: none; padding: 0.25rem 0.5rem; font-size: 0.72rem; height: 1.85rem; display: inline-flex; align-items: center; gap: 0.25rem;"
                 title="Preview Evidence">
                <i class="pi pi-eye"></i> Preview
              </a>
              <button pButton label="Attach" icon="pi pi-check" size="small" severity="success" 
                      (click)="attachPreviousEvidence(item)" 
                      styleClass="p-button-sm h-2rem text-xs font-semibold px-2.5"></button>
            </div>
          </div>
        </div>

      </div>

      <!-- Step 3: Rename & Confirm Uploaded File -->
      <div *ngIf="evidenceSourceStep === 'RENAME_CONFIRM'" style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
        
        <!-- Selected File Info Banner -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i [class]="getFileIcon(originalFileName)" [style.color]="getFileIconColor(originalFileName)" style="font-size: 2rem;"></i>
            <div style="display: flex; flex-direction: column; gap: 0.15rem;">
              <span style="font-size: 0.82rem; font-weight: 700; color: #1e293b;">Selected File: {{ originalFileName }}</span>
              <span style="font-size: 0.72rem; color: #64748b;" *ngIf="stagedFile">
                Size: {{ (stagedFile.size / 1024).toFixed(1) }} KB &bull; {{ getFileTypeName(originalFileName) }}
              </span>
            </div>
          </div>
          <span style="font-size: 0.7rem; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px;">
            Ready to Attach
          </span>
        </div>

        <!-- Rename Input Section -->
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.78rem; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.03em;">
              Save Document As <span style="color: #dc2626;">*</span>
            </label>
            <button type="button" 
                    (click)="resetToOriginalName()" 
                    style="background: none; border: none; font-size: 0.72rem; font-weight: 600; color: #4f46e5; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
              <i class="pi pi-refresh" style="font-size: 0.68rem;"></i> Same as selected
            </button>
          </div>

          <div style="position: relative; display: flex; align-items: center;">
            <i class="pi pi-pencil" style="position: absolute; left: 0.75rem; color: #94a3b8; font-size: 0.85rem;"></i>
            <input type="text" pInputText [(ngModel)]="customDocName" placeholder="Enter document name..." 
                   style="width: 100%; padding-left: 2.2rem; font-size: 0.85rem; height: 2.4rem; border-radius: 6px;" />
          </div>
          <small style="font-size: 0.7rem; color: #64748b;">
            You can customize the document name before uploading or keep the original selected name.
          </small>
        </div>

      </div>

      <ng-template pTemplate="footer">
        <button *ngIf="evidenceSourceStep === 'BROWSE_PREVIOUS'" pButton label="Back" icon="pi pi-arrow-left" class="p-button-text p-button-sm" (click)="evidenceSourceStep = 'CHOOSE_SOURCE'"></button>
        <button *ngIf="evidenceSourceStep === 'RENAME_CONFIRM'" pButton label="Back" icon="pi pi-arrow-left" class="p-button-text p-button-sm" (click)="evidenceSourceStep = 'CHOOSE_SOURCE'"></button>
        <button *ngIf="evidenceSourceStep !== 'RENAME_CONFIRM'" pButton label="Cancel" icon="pi pi-times" class="p-button-secondary p-button-sm" (click)="displayEvidenceSourceModal = false"></button>
        <button *ngIf="evidenceSourceStep === 'RENAME_CONFIRM'" pButton label="Confirm & Attach" icon="pi pi-check" class="p-button-primary p-button-sm" (click)="confirmAttachStagedFile()"></button>
      </ng-template>
    </p-dialog>
    
    <p-confirmDialog [style]="{ width: '450px', maxWidth: '95vw' }" appendTo="body"></p-confirmDialog>

    <!-- Dedicated In-App Document Preview Modal (Renders PDF, Images, Word DOCX, and Text directly) -->
    <p-dialog [(visible)]="showPreviewModal" 
              [modal]="true" 
              [maximizable]="true" 
              [dismissableMask]="true"
              [style]="{ width: '75rem', maxWidth: '96vw', height: '88vh' }"
              appendTo="body"
              styleClass="doc-preview-dialog">
      
      <ng-template pTemplate="header">
        <div style="display: flex; align-items: center; gap: 0.5rem; max-width: calc(100% - 60px);">
          <i [class]="getFileIcon(previewFileName() || previewFileUrl() || '')" [style.color]="getFileIconColor(previewFileName() || previewFileUrl() || '')" style="font-size: 1.2rem;"></i>
          <span style="font-weight: 700; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="previewFileName()">
            Preview: {{ previewFileName() || 'Document' }}
          </span>
          <span style="padding: 0.15rem 0.5rem; background: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;">
            {{ previewFileType() }}
          </span>
        </div>
      </ng-template>

      <!-- Main Preview Body Area -->
      <div style="height: calc(88vh - 130px); width: 100%; overflow: auto; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 1rem; box-sizing: border-box;">
        
        <!-- Loading Spinner -->
        <div *ngIf="previewLoading()" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 0.75rem;">
          <i class="pi pi-spin pi-spinner text-3xl text-indigo-500"></i>
          <span style="color: #64748b; font-size: 0.85rem; font-weight: 600;">Loading document preview...</span>
        </div>

        <!-- 1. PDF Preview -->
        <iframe *ngIf="!previewLoading() && previewFileType() === 'pdf' && previewSafeUrl()" 
                [src]="previewSafeUrl()!" 
                style="width: 100%; height: 100%; border: none; border-radius: 6px; background: #ffffff;">
        </iframe>

        <!-- 2. Image Preview -->
        <div *ngIf="!previewLoading() && previewFileType() === 'image' && previewSafeUrl()"
             style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <img [src]="previewSafeUrl()!" 
               alt="Document Image" 
               style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
        </div>

        <!-- 3. Word (.docx) Rendered Document Preview -->
        <div *ngIf="!previewLoading() && previewFileType() === 'docx'" style="width: 100%;">
          <div *ngIf="previewDocxHtml()" [innerHTML]="previewDocxHtml()" style="width: 100%;"></div>

          <!-- Fallback if docx parsing not available -->
          <div *ngIf="!previewDocxHtml()" 
               style="background: #ffffff; padding: 3rem 2rem; border-radius: 8px; border: 1px solid #cbd5e1; max-width: 600px; margin: 3rem auto; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <i class="pi pi-file-word" style="font-size: 3rem; color: #2563eb; display: block; margin-bottom: 1rem;"></i>
            <h4 style="margin: 0 0 0.5rem 0; font-weight: 700; color: #1e293b;">{{ previewFileName() }}</h4>
            <p style="color: #64748b; font-size: 0.82rem; margin-bottom: 1.5rem;">
              Microsoft Word Document (.docx). You can view the document by downloading or opening in Word.
            </p>
            <div style="display: flex; justify-content: center; gap: 0.5rem;">
              <button type="button" (click)="downloadFile(previewFileUrl(), previewFileName())"
                      style="background: #2563eb; border: 1px solid #2563eb; border-radius: 6px; padding: 0.45rem 1rem; color: #ffffff; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
                <i class="pi pi-download"></i> Download to Open
              </button>
            </div>
          </div>
        </div>

        <!-- 4. Text Preview -->
        <pre *ngIf="!previewLoading() && previewFileType() === 'text' && previewTextContent()"
             style="width: 100%; height: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 1.25rem; overflow: auto; font-family: monospace; font-size: 0.85rem; color: #1e293b; box-sizing: border-box; margin: 0;">{{ previewTextContent() }}</pre>

        <!-- 5. Other File Types Fallback -->
        <div *ngIf="!previewLoading() && previewFileType() === 'other'"
             style="background: #ffffff; padding: 3rem 2rem; border-radius: 8px; border: 1px solid #cbd5e1; max-width: 600px; margin: 3rem auto; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <i [class]="getFileIcon(previewFileName() || previewFileUrl() || '')" [style.color]="getFileIconColor(previewFileName() || previewFileUrl() || '')" style="font-size: 3rem; display: block; margin-bottom: 1rem;"></i>
          <h4 style="margin: 0 0 0.5rem 0; font-weight: 700; color: #1e293b;">{{ previewFileName() }}</h4>
          <p style="color: #64748b; font-size: 0.82rem; margin-bottom: 1.5rem;">
            Click below to download or view the file in its default application.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.5rem;">
            <button type="button" (click)="downloadFile(previewFileUrl(), previewFileName())"
                    style="background: #4f46e5; border: 1px solid #4f46e5; border-radius: 6px; padding: 0.45rem 1rem; color: #ffffff; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="pi pi-download"></i> Download Document
            </button>
          </div>
        </div>

      </div>

      <!-- Dialog Footer -->
      <ng-template pTemplate="footer">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button type="button" *ngIf="previewFileUrl()" (click)="downloadFile(previewFileUrl(), previewFileName())"
                    style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer; color: #10b981; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;">
              <i class="pi pi-download"></i> Download
            </button>
            <button type="button" *ngIf="previewFileUrl()" (click)="openInNewTab(previewFileUrl())"
                    style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer; color: #475569; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;">
              <i class="pi pi-external-link"></i> Open Direct URL
            </button>
          </div>
          <button type="button" (click)="showPreviewModal.set(false)"
                  style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.3rem 0.85rem; cursor: pointer; color: #475569; font-weight: 700; font-size: 0.75rem;">
            Close
          </button>
        </div>
      </ng-template>

    </p-dialog>

    <div style="height: 4rem;"></div> <!-- bottom padding spacing -->
  `,
})
export class AssignmentDetailsComponent implements OnInit {
  private confirmationService = inject(ConfirmationService);
  private sanitizer = inject(DomSanitizer);

  // In-App Document Preview Modal Signals
  showPreviewModal = signal<boolean>(false);
  previewFileUrl = signal<string | null>(null);
  previewFileName = signal<string>('');
  previewFileType = signal<'pdf' | 'image' | 'docx' | 'text' | 'other'>('other');
  previewSafeUrl = signal<SafeResourceUrl | null>(null);
  previewLoading = signal<boolean>(false);
  previewDocxHtml = signal<SafeHtml | null>(null);
  previewTextContent = signal<string | null>(null);
  displayRemarkChainDialog = false;
  selectedTaskForChain: any = null;
  historyDialogMode: 'REMARK' | 'EVIDENCE' = 'REMARK';

  // Evidence Source Picker & Department Repository Modal
  displayEvidenceSourceModal = false;
  activeEvidenceTaskId: number | null = null;
  activeEvidenceTaskTitle = '';
  evidenceSourceStep: 'CHOOSE_SOURCE' | 'BROWSE_PREVIOUS' | 'RENAME_CONFIRM' = 'CHOOSE_SOURCE';
  deptPreviousEvidences = signal<any[]>([]);
  deptEvidenceSearch = '';
  loadingDeptEvidences = false;
  stagedFile: File | null = null;
  customDocName = '';
  originalFileName = '';

  openRemarkChainDialog(task: any) {
    this.selectedTaskForChain = task;
    this.historyDialogMode = 'REMARK';
    if (task?.remarks_history) {
      task.remarks_history.forEach((h: any) => (h.isEditing = false));
    }
    this.displayRemarkChainDialog = true;
  }

  openEvidenceHistoryDialog(task: any) {
    this.selectedTaskForChain = task;
    this.historyDialogMode = 'EVIDENCE';
    this.displayRemarkChainDialog = true;
  }

  closeRemarkChainDialog() {
    this.displayRemarkChainDialog = false;
    this.selectedTaskForChain = null;
  }

  openEvidencePicker(task: any) {
    this.activeEvidenceTaskId = task.assignment_task_id;
    this.activeEvidenceTaskTitle = task.task_title || 'Compliance Task';
    this.evidenceSourceStep = 'CHOOSE_SOURCE';
    this.deptEvidenceSearch = '';
    this.loadDepartmentPreviousEvidences();
    this.displayEvidenceSourceModal = true;
  }

  cleanFileName(rawName: string): string {
    if (!rawName) return 'evidence_document';
    let name = decodeURIComponent(rawName.trim().split('?')[0]);
    if (name.includes('/') || name.includes('\\')) {
      name = name.split(/[/\\]/).pop() || name;
    }
    // Remove leading timestamp prefix e.g. 1726483920192-file.pdf
    name = name.replace(/^\d{10,14}[-_]/, '');
    // Remove trailing hex hash suffix e.g. filename_2dd9801a2b.docx -> filename.docx
    name = name.replace(/_[0-9a-fA-F]{8,32}(\.[a-zA-Z0-9]+)$/, '$1');
    name = name.replace(/_[0-9a-fA-F]{8,32}$/, '');
    return name || 'evidence_document';
  }

  getFileIcon(nameOrUrl?: string | null): string {
    if (!nameOrUrl) return 'pi pi-file';
    const lower = nameOrUrl.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pi pi-file-pdf';
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return 'pi pi-image';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'pi pi-file-word';
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return 'pi pi-file-excel';
    return 'pi pi-file';
  }

  getFileIconColor(nameOrUrl?: string | null): string {
    if (!nameOrUrl) return '#6b7280';
    const lower = nameOrUrl.toLowerCase();
    if (lower.endsWith('.pdf')) return '#dc2626';
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return '#2563eb';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return '#1d4ed8';
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return '#059669';
    return '#6b7280';
  }

  getFileTypeName(nameOrUrl?: string | null): string {
    if (!nameOrUrl) return 'Document';
    const lower = nameOrUrl.toLowerCase();
    if (lower.endsWith('.pdf')) return 'PDF Document';
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return 'Image File';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'Word Document';
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return 'Spreadsheet';
    return 'Document';
  }

  private getDeletedEvidenceKeys(): Set<string> {
    try {
      const stored = localStorage.getItem(`compliancepro_deleted_evidence_${this.assignmentId}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  }

  private markEvidenceAsDeleted(ev: any) {
    try {
      const keys = this.getDeletedEvidenceKeys();
      if (ev.id) keys.add(`id_${ev.id}`);
      if (ev.file_url) {
        keys.add(`url_${ev.file_url}`);
        const parts = ev.file_url.split('/');
        const lastPart = parts[parts.length - 1];
        keys.add(`part_${lastPart}`);
      }
      if (ev.url) {
        keys.add(`url_${ev.url}`);
        const parts = ev.url.split('/');
        const lastPart = parts[parts.length - 1];
        keys.add(`part_${lastPart}`);
      }
      if (ev.file_name) keys.add(`name_${ev.file_name}`);
      if (ev.name) keys.add(`name_${ev.name}`);
      localStorage.setItem(`compliancepro_deleted_evidence_${this.assignmentId}`, JSON.stringify(Array.from(keys)));
    } catch (e) {
      console.warn('Failed to save deleted evidence key:', e);
    }
  }

  isEvidenceDeleted(ev: any): boolean {
    if (!ev) return false;
    const keys = this.getDeletedEvidenceKeys();
    if (ev.id && keys.has(`id_${ev.id}`)) return true;
    if (ev.file_url) {
      if (keys.has(`url_${ev.file_url}`)) return true;
      const parts = ev.file_url.split('/');
      const lastPart = parts[parts.length - 1];
      if (keys.has(`part_${lastPart}`)) return true;
    }
    if (ev.url) {
      if (keys.has(`url_${ev.url}`)) return true;
      const parts = ev.url.split('/');
      const lastPart = parts[parts.length - 1];
      if (keys.has(`part_${lastPart}`)) return true;
    }
    if (ev.file_name && keys.has(`name_${ev.file_name}`)) return true;
    if (ev.name && keys.has(`name_${ev.name}`)) return true;
    return false;
  }

  private getDeletedRemarkKeys(): Set<string> {
    return new Set<string>();
  }

  private markRemarkAsDeleted(remarkObj: any, taskId?: number) {
    // Remarks are not deleteable; they are editable
  }

  isRemarkDeleted(h: any, taskId?: number): boolean {
    if (!h) return true;
    const rText = String(h.remark || '').trim();
    if (!rText) return true; // empty or whitespace-only remarks are not displayed
    return false;
  }

  get deptEvidenceBadgeLabel(): string {
    const role = (this.userRole() || '').toUpperCase();
    const isCcoOrCo = ['CCO', 'CO', 'CHIEF_COMPLIANCE_OFFICER', 'COMPLIANCE_OFFICER'].includes(role);
    if (isCcoOrCo) {
      return this.branchName() ? `${this.branchName()} & All Evidences` : 'All Department Evidences';
    }
    return `${this.branchName() || this.userBranchName() || 'Department'} Evidences`;
  }

  loadDepartmentPreviousEvidences() {
    const role = (this.userRole() || '').toUpperCase();
    const isCcoOrCo = ['CCO', 'CO', 'CHIEF_COMPLIANCE_OFFICER', 'COMPLIANCE_OFFICER'].includes(role);

    const currentBranchName = (this.branchName() || '').toLowerCase().trim();
    const userBranchName = (this.userBranchName() || '').toLowerCase().trim();
    const taskBranchId = this.tasks()[0]?.branch_id ? Number(this.tasks()[0].branch_id) : null;
    const userBranchId = this.userBranchId() ? Number(this.userBranchId()) : null;
    const targetBranchId = taskBranchId || userBranchId;

    const branches = this.allBranches().length > 0 ? this.allBranches() : this.api.getCachedBranches();
    const targetBranchObj = targetBranchId
      ? (branches || []).find((b: any) => Number(b.id) === targetBranchId)
      : (branches || []).find((b: any) => (b.name || '').toLowerCase().trim() === currentBranchName);

    const actualDeptId = targetBranchObj?.id ? Number(targetBranchObj.id) : targetBranchId;
    const parentId = targetBranchObj?.parent_id ? Number(targetBranchObj.parent_id) : null;

    // Sub-department branch objects for this department
    const subDeptObjs = (branches || []).filter((b: any) => {
      const bParentId = b.parent_id ? Number(b.parent_id) : null;
      if (actualDeptId && bParentId === actualDeptId) return true;
      if (parentId && bParentId === parentId) return true;
      return false;
    });

    const allowedDeptIds = new Set<number>();
    if (actualDeptId) allowedDeptIds.add(actualDeptId);
    if (userBranchId) allowedDeptIds.add(userBranchId);
    if (parentId) allowedDeptIds.add(parentId);
    subDeptObjs.forEach((b: any) => allowedDeptIds.add(Number(b.id)));

    const allowedDeptNames = new Set<string>();
    if (currentBranchName) allowedDeptNames.add(currentBranchName);
    if (userBranchName) allowedDeptNames.add(userBranchName);
    if (targetBranchObj?.name) allowedDeptNames.add(targetBranchObj.name.toLowerCase().trim());
    subDeptObjs.forEach((b: any) => {
      if (b.name) allowedDeptNames.add(b.name.toLowerCase().trim());
    });

    // Filtering rule:
    // CCO & CO see ALL department evidences.
    // Branch / Department users see ONLY their department and its sub-departments.
    const belongsToDeptOrSubDept = (doc: any): boolean => {
      if (isCcoOrCo) return true; // CCO & CO show all!

      const docDeptId = doc.department_id ? Number(doc.department_id) : null;
      const docDeptName = (doc.department_name || '').toLowerCase().trim();

      if (docDeptId && allowedDeptIds.has(docDeptId)) {
        return true;
      }

      if (docDeptName) {
        for (const name of allowedDeptNames) {
          if (!name) continue;
          if (docDeptName === name || docDeptName.includes(name) || name.includes(docDeptName)) {
            return true;
          }
        }
      }

      if (doc.task_set_name) {
        const tsn = doc.task_set_name.toLowerCase();
        for (const name of allowedDeptNames) {
          if (name && (tsn.includes(name) || name.includes(tsn))) return true;
        }
      }

      return false;
    };

    // Helper to extract canonical filename key (strips hashes, random uuids, timestamps)
    const getCanonicalKey = (nameOrUrl: string): string => {
      if (!nameOrUrl) return '';
      let s = decodeURIComponent(nameOrUrl.trim().split('?')[0]);
      s = s.replace(/\\/g, '/').split('/').pop() || s;
      s = s.replace(/^\d{10,14}[-_]/, '');
      s = s.replace(/[-_]([0-9a-fA-F]{8,36}|\d{10,14}|[0-9a-fA-F]{4,8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?=\.[a-zA-Z0-9]+$|$)/i, '');
      return s.toLowerCase().trim();
    };

    // Helper for robust deduplication (collapses hash vs non-hash duplicates e.g. sign.jpeg and sign_ddc2311e115ebd0a.jpeg)
    const deduplicateEvidences = (list: any[]) => {
      const seen = new Map<string, any>();
      list.forEach(item => {
        if (!item) return;
        let name = (item.name || '').trim();
        if ((!name || name === 'Task Evidence Document.pdf' || name === 'evidence_document') && item.url) {
          const extracted = item.url.split('/').pop()?.split('?')[0];
          if (extracted) {
            name = decodeURIComponent(extracted);
          }
        }
        name = this.cleanFileName(name);
        item.name = name;
        const url = (item.url || '').trim();
        if (!name && !url) return;

        const canonKey = getCanonicalKey(item.url) || getCanonicalKey(name) || name.toLowerCase();

        if (!seen.has(canonKey)) {
          seen.set(canonKey, item);
        } else {
          const existing = seen.get(canonKey);
          const itemHasTaskSet = item.source && item.source.startsWith('Task Set:');
          const existingHasTaskSet = existing.source && existing.source.startsWith('Task Set:');
          const preferredName = (item.name.length >= (existing.name || '').length) ? item.name : existing.name;
          const preferredUrl = (item.url && item.url.length >= (existing.url || '').length) ? item.url : existing.url;
          const preferredSource = itemHasTaskSet ? item.source : (existingHasTaskSet ? existing.source : (item.source || existing.source));

          seen.set(canonKey, {
            ...existing,
            ...item,
            name: preferredName,
            url: preferredUrl,
            source: preferredSource,
            date: item.date || existing.date
          });
        }
      });
      return Array.from(seen.values());
    };

    this.loadingDeptEvidences = true;

    // 1. Collect from current assignment tasks
    const taskEvidences: any[] = [];
    (this.tasks() || []).forEach(t => {
      if (t.evidence_history && Array.isArray(t.evidence_history)) {
        t.evidence_history.forEach((eh: any) => {
          if (eh.file_url) {
            let fname = eh.file_name || eh.filename || eh.file_url.split('/').pop()?.split('?')[0];
            taskEvidences.push({
              name: this.cleanFileName(fname || 'evidence_document'),
              url: eh.file_url,
              date: eh.uploaded_at || eh.created_at,
              source: `Task: ${t.task_title ? (t.task_title.substring(0, 45) + '...') : 'Compliance Task'}`,
              type: 'TASK_EVIDENCE'
            });
          }
        });
      } else if (t.evidence_url) {
        let fname = t.evidence_file_name || t.evidence_url.split('/').pop()?.split('?')[0];
        taskEvidences.push({
          name: this.cleanFileName(fname || 'evidence_document'),
          url: t.evidence_url,
          date: t.updated_at || t.created_at,
          source: `Task: ${t.task_title ? (t.task_title.substring(0, 45) + '...') : 'Compliance Task'}`,
          type: 'TASK_EVIDENCE'
        });
      }
    });

    // 2. Collect from Evidence Management repository (localStorage store)
    const storedEvidences: any[] = [];
    const sharedDocs = this.api.getEvidenceDocuments() || [];

    sharedDocs.forEach((d: any) => {
      if (!d.file_url) return;
      if (!belongsToDeptOrSubDept(d)) return;

      storedEvidences.push({
        name: this.cleanFileName(d.file_name || d.document_name),
        url: d.file_url,
        date: d.created_at || d.issue_date,
        source: d.task_set_name ? `Task Set: ${d.task_set_name}` : (d.document_name ? `Evidence: ${d.document_name}` : 'Evidence Repository'),
        type: 'TASK_EVIDENCE'
      });
    });

    // Instantly display known evidences from current tasks and shared repository
    const initialList = deduplicateEvidences([...taskEvidences, ...storedEvidences]);
    this.deptPreviousEvidences.set(initialList);
    if (initialList.length > 0) {
      this.loadingDeptEvidences = false;
    }

    // 3. Live sync department evidences across all assignments of this department
    this.api.getAssignments({ limit: 40 }).pipe(catchError(() => of({ data: [] }))).subscribe({
      next: (asgRes) => {
        const asgList = asgRes?.data || (Array.isArray(asgRes) ? asgRes : []);

        let deptAssignments = asgList;
        if (!isCcoOrCo) {
          // Strictly filter assignments to this department and its sub-departments
          deptAssignments = asgList.filter((a: any) => {
            const bName = (a.branch_name || '').toLowerCase().trim();
            for (const name of allowedDeptNames) {
              if (name && (bName === name || bName.includes(name) || name.includes(bName))) return true;
            }
            return false;
          });
        }

        const asgObs = deptAssignments.slice(0, 20).map((a: any) =>
          forkJoin({
            evList: this.api.getAssignmentEvidence(a.id).pipe(catchError(() => of([]))),
            tasksList: this.api.getAssignmentTasks(a.id).pipe(catchError(() => of([])))
          }).pipe(
            map((res: any) => ({
              asg: a,
              evList: Array.isArray(res?.evList) ? res.evList : [],
              tasksList: Array.isArray(res?.tasksList) ? res.tasksList : []
            })),
            catchError(() => of({ asg: a, evList: [], tasksList: [] }))
          )
        );

        if (asgObs.length === 0) {
          this.loadingDeptEvidences = false;
          return;
        }

        forkJoin(asgObs).subscribe({
          next: (results: any[]) => {
            const liveAsgEvidences: any[] = [];
            const newSharedDocs: any[] = [];

            (results || []).forEach(({ asg, evList, tasksList }: any) => {
              const taskMap = new Map<number, any>();
              (tasksList || []).forEach((t: any) => {
                if (t.assignment_task_id) taskMap.set(Number(t.assignment_task_id), t);
                if (t.task_id) taskMap.set(Number(t.task_id), t);
              });

              evList.forEach((ev: any) => {
                if (!ev.file_url) return;
                const fname = this.cleanFileName(ev.file_name || ev.filename || ev.file_url.split('/').pop()?.split('?')[0]);
                const matchedTask = taskMap.get(Number(ev.assignment_task_id || ev.task_id));
                const targetDeptId = matchedTask?.sub_dept_id || matchedTask?.branch_id || ev.sub_dept_id || asg.branch_id || actualDeptId;
                const targetDeptName = matchedTask?.sub_dept_name || matchedTask?.branch_name || ev.sub_dept_name || asg.branch_name || currentBranchName;

                const evItem = {
                  department_id: targetDeptId,
                  department_name: targetDeptName,
                  task_set_name: asg.task_set_name || asg.name || 'Compliance',
                  file_url: ev.file_url
                };

                if (!belongsToDeptOrSubDept(evItem)) {
                  return;
                }

                liveAsgEvidences.push({
                  name: fname,
                  url: ev.file_url,
                  date: ev.submitted_at || ev.created_at || asg.created_at,
                  source: `Task Set: ${asg.task_set_name || asg.name || 'Compliance'}`,
                  type: 'TASK_EVIDENCE'
                });

                newSharedDocs.push({
                  id: 9000000 + Number(ev.id || Math.floor(Math.random() * 1000000)),
                  document_name: fname,
                  document_number: asg.task_set_name ? `TASK: ${asg.task_set_name}` : 'TASK-EVIDENCE',
                  issue_date: ev.submitted_at || ev.created_at || asg.created_at || null,
                  created_at: ev.submitted_at || ev.created_at || asg.created_at || new Date().toISOString(),
                  start_date: asg.start_date || null,
                  department_id: targetDeptId ? Number(targetDeptId) : null,
                  department_name: targetDeptName || null,
                  user_id: ev.uploaded_by ? Number(ev.uploaded_by) : null,
                  user_name: ev.uploader_name || ev.uploaded_by_name || 'Branch Member',
                  file_url: ev.file_url,
                  file_name: fname,
                  description: ev.remark || `Evidence for "${matchedTask?.task_title || asg.task_set_name || 'Compliance Task'}"`,
                  status: 'ACTIVE',
                  access_level: 'PUBLIC',
                  is_evidence: true,
                  source_type: 'TASK_EVIDENCE',
                  task_set_id: asg.task_set_id ? Number(asg.task_set_id) : null,
                  task_set_name: asg.task_set_name || null,
                  frequency: asg.frequency ? String(asg.frequency) : null
                });
              });
            });

            if (newSharedDocs.length > 0) {
              this.api.saveEvidenceDocuments(newSharedDocs);
            }

            const updatedCombined = deduplicateEvidences([
              ...taskEvidences,
              ...storedEvidences,
              ...liveAsgEvidences
            ]);
            this.deptPreviousEvidences.set(updatedCombined);
            this.loadingDeptEvidences = false;
          },
          error: () => {
            this.loadingDeptEvidences = false;
          }
        });
      },
      error: () => {
        this.loadingDeptEvidences = false;
      }
    });
  }

  get filteredDeptEvidences(): any[] {
    const list = this.deptPreviousEvidences();
    const query = (this.deptEvidenceSearch || '').toLowerCase().trim();
    if (!query) return list;
    return list.filter(e =>
      (e.name && e.name.toLowerCase().includes(query)) ||
      (e.source && e.source.toLowerCase().includes(query))
    );
  }

  attachPreviousEvidence(item: any) {
    if (!this.activeEvidenceTaskId) return;
    const taskId = this.activeEvidenceTaskId;
    const fullUrl = this.resolveFileUrl(item.url) || item.url;

    fetch(fullUrl)
      .then(res => res.blob())
      .then(blob => {
        const mimeType = blob.type || (item.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : (item.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'));
        const file = new File([blob], item.name, { type: mimeType });
        this.addSelectedFiles(taskId, [file]);
        this.notification.success(`Attached "${item.name}" from department evidence repository.`);
        this.displayEvidenceSourceModal = false;
      })
      .catch(() => {
        const mimeType = item.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : (item.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
        const file = new File([new Blob()], item.name, { type: mimeType });
        this.addSelectedFiles(taskId, [file]);
        this.notification.success(`Selected "${item.name}" from department evidence repository.`);
        this.displayEvidenceSourceModal = false;
      });
  }

  assignmentId: number | null = null;

  tasks = signal<any[]>([]);
  taskGroups = signal<{ headerName: string, tasks: any[] }[]>([]);

  assignmentStatus = signal<string>('');
  reviewRemark = signal<string>('');

  // Rich metadata properties
  branchName = signal<string>('');
  taskSetName = signal<string>('');
  taskSetType = signal<string>('');
  createdByRole = signal<string>('');
  createdByName = signal<string>('');

  isBranchCreated = computed(() => {
    const role = (
      this.createdByRole() ||
      this.tasks()[0]?.created_by_role ||
      this.tasks()[0]?.creator_role ||
      this.tasks()[0]?.task_set_created_by_role ||
      this.tasks()[0]?.user_role ||
      ''
    ).toUpperCase().trim();

    // 1. Explicit role check
    if (['BRANCH_USER', 'BRANCH', 'DEPARTMENT', 'DEPARTMENT_USER', 'SUB_DEPARTMENT', 'USER', 'STAFF', 'BRANCH USER'].includes(role)) {
      return true;
    }
    if (['CO', 'CCO', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CHIEF_COMPLIANCE_OFFICER'].includes(role)) {
      return false;
    }

    // 2. Explicit username / name check
    const name = String(
      this.createdByName() ||
      this.tasks()[0]?.created_by_username ||
      this.tasks()[0]?.created_by_name ||
      this.tasks()[0]?.creator_name ||
      this.tasks()[0]?.created_by ||
      ''
    ).toLowerCase().trim();

    if (
      name.startsWith('co_') ||
      name.startsWith('cco_') ||
      name.startsWith('co ') ||
      name.startsWith('cco ') ||
      name === 'co' ||
      name === 'cco' ||
      name === 'admin' ||
      name.includes('(co)') ||
      name.includes('(cco)') ||
      name.includes('compliance officer') ||
      name.includes('compliance_officer') ||
      name.includes('co_it') ||
      name.includes('co_admin') ||
      name.includes('co_ops') ||
      name.includes('compliance')
    ) {
      return false;
    }

    if (
      name.includes('branch') ||
      name.includes('department') ||
      name.includes('branch_user') ||
      name.includes('it_dept') ||
      name.includes('it department') ||
      name.includes('(branch)')
    ) {
      return true;
    }

    // 3. Current logged-in user check (if creator ID matches logged in branch user)
    const currentUser = this.currentUser() as any;
    const currentRole = String(currentUser?.role || '').toUpperCase();
    const isCurrentBranchUser = ['BRANCH_USER', 'BRANCH', 'DEPARTMENT', 'SUB_DEPARTMENT', 'BRANCH USER'].includes(currentRole);
    if (isCurrentBranchUser) {
      const creatorId = this.tasks()[0]?.created_by || this.tasks()[0]?.created_by_id;
      if (creatorId && currentUser?.id && String(creatorId) === String(currentUser.id)) {
        return true;
      }
    }

    // 4. Default: All task sets assigned to branches by default originate from CO / Admin
    return false;
  });

  isCOCreated = computed(() => {
    return !this.isBranchCreated();
  });

  isInternalTaskSet = computed(() => {
    const type = (this.taskSetType() || '').toUpperCase().trim();
    if (type === 'INTERNAL') return true;
    if (type === 'REGULAR') return false;
    if (this.circularReferenceNo() || this.circularTitle()) return false;
    return false;
  });

  proposedTimeline = signal<string>('');
  frequency = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  circularReferenceNo = signal<string>('');
  circularTitle = signal<string>('');
  authorityName = signal<string>('');

  complianceCycleInfo = computed(() => {
    return getCompliancePeriodInfo({
      frequency: this.frequency(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      proposedTimeline: this.proposedTimeline()
    });
  });

  submitting = false;
  lastSubmitAction: 'COMPLETE' | 'SUBMIT_CO' = 'COMPLETE';

  readonly frequencyMap: Record<string, string> = {
    '0': 'Daily',
    '1': 'Fortnight',
    '2': 'Monthly',
    '3': 'Quarterly',
    '4': 'Semi-Annually',
    '5': 'Yearly',
    '6': '1 Time Use',
    '7': 'Weekly'
  };

  // Customizable due dates state
  userRole = signal<string>('');
  tempAssignmentTimeline: string = '';
  tempAssignmentTimelineObj: Date | null = null;

  // Options for the p-select compliance status dropdown
  complianceOptions = [
    { label: 'Pending Declaration', value: 'PENDING' },
    { label: 'Complied', value: 'COMPLIED' },
    { label: 'Not Complied', value: 'NOT_COMPLIED' }
  ];

  // Local reactive signals to track newly selected files and saving states
  selectedFilesMap = signal<Record<number, File[]>>({});
  rowSavingMap = signal<Record<number, boolean>>({});
  headerSavingMap = new Map<string, boolean>();

  // Sub-departments available for delegation
  availableSubDepts = signal<{ label: string, value: number | null }[]>([]);
  bulkSelectedSubDeptId: number | null = null;
  bulkAssigning: boolean = false;

  allBranches = signal<any[]>([]);
  subDeptSubmittedSignal = signal<boolean>(false);
  subDeptSubmitted = computed(() => {
    if (this.subDeptSubmittedSignal()) return true;
    const visible = this.visibleTasks();
    if (!visible.length) return false;

    // Sub-department is submitted only if all their visible tasks are filled
    const allVisibleFilled = visible.every(t => !!(t.remarks?.trim() || t.has_evidence || t.status === 'COMPLETED'));
    if (!allVisibleFilled) return false;

    const status = (this.assignmentStatus() || '').toUpperCase();
    if (status === 'REVIEW_PENDING' || status === 'COMPLETED') {
      if (visible.some(t => t.review_status === 'NEEDS_REDO')) return false;
      return true;
    }
    return false;
  });
  auth = inject(AuthService);
  currentUser = computed(() => this.auth.currentUser());
  userBranchId = computed(() => {
    const u = this.currentUser() as any;
    return u?.branch_id ?? u?.branchId ?? null;
  });
  userBranchName = computed(() => {
    const u = this.currentUser() as any;
    return u?.branch_name || u?.branchName || '';
  });
  isSubDepartmentUser = computed(() => {
    const u = this.currentUser() as any;
    if (u?.is_sub_department || u?.branch_parent_id || u?.parent_id) return true;
    const role = String(u?.role || '').toLowerCase();
    if (role === 'sub_department' || role.includes('sub_dept') || role.includes('subdepartment')) return true;
    const userName = String(u?.username || u?.name || '').toLowerCase();
    if (userName.includes('sub_') || userName.includes('subdept') || userName.includes('sub_dep')) return true;
    const userBId = this.userBranchId();
    if (!userBId) return false;
    const branches = this.allBranches();
    if (!branches.length) return false;
    const userBranch = branches.find(b => String(b.id) === String(userBId));
    return !!(userBranch && userBranch.parent_id);
  });
  isHeadDepartmentUser = computed(() => {
    const role = (this.userRole() || '').toLowerCase();
    if (role === 'admin') return true;
    if (role === 'co' || role === 'cco') return false;
    return !this.isSubDepartmentUser();
  });

  pendingSubDeptReviewCount = computed(() => {
    if (!this.isHeadDepartmentUser() || this.isReviewer()) return 0;
    return this.tasks().filter(t =>
      t.sub_dept_id &&
      (t.remarks?.trim() || t.temp_remarks?.trim() || t.has_evidence || !!t.evidence_file_name || t.status === 'COMPLETED') &&
      t.review_status !== 'APPROVED'
    ).length;
  });

  visibleTasks = computed(() => {
    const all = this.tasks();
    const isSubDept = this.isSubDepartmentUser();
    if (!isSubDept) return all;

    const userBId = this.userBranchId();
    const u = this.currentUser() as any;
    const userBName = (u?.branch_name || u?.branchName || '').trim().toLowerCase();

    return all.filter(task => {
      // 1. Explicit match on sub_dept_id
      if (task.sub_dept_id && userBId && String(task.sub_dept_id) === String(userBId)) {
        return true;
      }
      // 2. Explicit match on sub_dept_name
      if (task.sub_dept_name && userBName && task.sub_dept_name.trim().toLowerCase() === userBName) {
        return true;
      }
      // 3. If assignment itself was created directly for this sub-department (and not assigned to another sub-dept)
      const taskBranchId = task.branch_id || (all.length > 0 ? all[0].branch_id : null);
      if (taskBranchId && userBId && String(taskBranchId) === String(userBId)) {
        return !task.sub_dept_id || String(task.sub_dept_id) === String(userBId);
      }
      return false;
    });
  });

  rejectingTaskId = signal<number | null>(null);
  headRejectionRemark = signal<string>('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ComplianceApiService,
    private notification: NotificationService
  ) { }

  ngOnInit() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.userRole.set(String(user.role || '').toLowerCase());
    } catch (e) {
      console.warn('Failed to parse user in details:', e);
    }

    const cached = this.api.getCachedBranches();
    if (cached && cached.length > 0) {
      this.allBranches.set(cached);
    }
    this.api.getBranches().subscribe(branches => {
      this.allBranches.set(branches || []);
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.assignmentId = parseInt(id, 10);
        this.loadTasks();
      }
    });
  }

  isDirectSubDeptAssignment(): boolean {
    return this.api.isDirectSubDeptAssignment();
  }

  allTasksApprovedByHead = computed(() => {
    const all = this.tasks();
    if (!all.length) return false;
    const isDirect = this.isDirectSubDeptAssignment();
    return all.every(t => {
      if (t.sub_dept_id) {
        if (isDirect) {
          return !!(t.remarks?.trim() || t.has_evidence || t.status === 'COMPLETED');
        }
        return (t.remarks?.trim() || t.has_evidence || t.status === 'COMPLETED') && t.review_status === 'APPROVED';
      }
      return !!(t.remarks?.trim() || t.temp_remarks?.trim());
    });
  });

  delegatedTasksCount = computed(() => this.tasks().filter(t => !!t.sub_dept_id).length);
  rejectedSubDeptTasksCount = computed(() => this.tasks().filter(t => !!t.sub_dept_id && t.review_status === 'NEEDS_REDO').length);
  pendingSubDeptSubmissionCount = computed(() => this.tasks().filter(t => !!t.sub_dept_id && !t.remarks?.trim() && !t.has_evidence && t.status !== 'COMPLETED').length);
  pendingHeadAcceptanceCount = computed(() => this.tasks().filter(t => (t.sub_dept_id || this.isTargetSubDeptOfHead()) && (t.remarks?.trim() || t.has_evidence || t.status === 'COMPLETED') && t.review_status !== 'APPROVED' && t.review_status !== 'NEEDS_REDO').length);

  isTargetSubDeptOfHead = computed(() => {
    if (!this.isHeadDepartmentUser()) return false;
    const userBId = this.userBranchId();
    if (!userBId) return false;
    const branches = this.allBranches();
    const bName = (this.branchName() || '').trim().toLowerCase();
    const targetBranch = branches.find(b =>
      (bName && (b.name || '').trim().toLowerCase() === bName) ||
      (this.tasks().length > 0 && String(b.id) === String(this.tasks()[0].branch_id))
    );
    return !!(targetBranch && String(targetBranch.parent_id) === String(userBId));
  });

  isSubDeptAllTasksFilled = computed(() => {
    const visible = this.visibleTasks();
    if (!visible.length) return false;
    return visible.every(t => !!(t.remarks?.trim() || t.temp_remarks?.trim() || t.has_evidence || t.status === 'COMPLETED'));
  });

  isTimelineMode(): boolean {
    // Both REGULAR and INTERNAL flows go directly to compliance execution (no propose date barrier)
    return false;
  }

  completedCount = computed(() => {
    const target = this.isSubDepartmentUser() ? this.visibleTasks() : this.tasks();
    return target.filter(t =>
      t.compliance_status === 'COMPLIED' ||
      t.compliance_status === 'NOT_COMPLIED' ||
      t.status === 'COMPLETED' ||
      !!t.remarks?.trim() ||
      !!t.temp_remarks?.trim() ||
      t.has_evidence ||
      !!t.evidence_file_name
    ).length;
  });
  progressPercentage = computed(() => {
    const total = this.isSubDepartmentUser() ? this.visibleTasks().length : this.tasks().length;
    return total ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  canEditAssignment(): boolean {
    const status = this.assignmentStatus().toUpperCase();
    if (status === 'REVIEW_PENDING' || status === 'COMPLETED') {
      return false;
    }
    return true;
  }

  canEditTaskAssignment(task: any): boolean {
    if (!task) return false;
    if (this.isReviewer()) {
      return false;
    }

    const assignmentStatus = (this.assignmentStatus() || '').toUpperCase();
    if (assignmentStatus === 'COMPLETED') {
      return false;
    }

    // If reviewer explicitly accepted or escalated this single task point, hide Save Task button & lock inputs for this task
    if (task?.review_status === 'APPROVED' || task?.review_status === 'ESCALATED') {
      return false;
    }

    const userBId = this.userBranchId();

    // If user is a Sub-Department user, they can edit their assigned tasks
    if (this.isSubDepartmentUser()) {
      if (task?.review_status === 'NEEDS_REDO') {
        return true;
      }
      if (this.subDeptSubmitted()) {
        return false;
      }
      if (task?.sub_dept_id && userBId) {
        return String(task.sub_dept_id) === String(userBId);
      }
      return true;
    }

    // If user is a Head Department user:
    if (this.isHeadDepartmentUser()) {
      // If task is delegated to / submitted by a sub-department, head department does not fill it (sub-dept fills, head accepts/rejects)
      if (this.isSubDeptSubmission(null, task)) {
        return false;
      }
      // If assignment belongs to a child sub-department, head department does not fill it
      const taskBranchId = task?.branch_id || (this.tasks().length > 0 ? this.tasks()[0].branch_id : null);
      if (taskBranchId && userBId && String(taskBranchId) !== String(userBId)) {
        return false;
      }
      // For Direct Tasks (Self-Compliance):
      if (assignmentStatus === 'COMPLETED') {
        return false;
      }
      if (assignmentStatus === 'REVIEW_PENDING') {
        // If all sub-dept tasks are approved AND direct task is filled AND already submitted to CO
        if (this.allTasksApprovedByHead() && (task.remarks?.trim() || task.has_evidence)) {
          return false;
        }
        return true;
      }
      return true;
    }

    return assignmentStatus !== 'REVIEW_PENDING' && assignmentStatus !== 'COMPLETED';
  }

  canEditTimeline(): boolean {
    const role = this.userRole();
    const status = this.assignmentStatus();
    if ((status === 'Pending_Timeline' || status === 'Timeline_Review') && (role === 'branch' || role === 'branch_user' || role === 'department')) {
      return true;
    }
    if (status === 'Timeline_Review' && (role === 'cco' || role === 'co' || role === 'admin')) {
      return true;
    }
    return false;
  }

  isReviewer(): boolean {
    const role = this.userRole();
    return role === 'cco' || role === 'co' || role === 'admin';
  }

  formatDateForBackend(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return d;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  canApproveTimeline(): boolean {
    const role = this.userRole();
    const status = this.assignmentStatus();
    return status === 'Timeline_Review' && (role === 'cco' || role === 'co' || role === 'admin');
  }

  getTimelineLabel(): string {
    const role = this.userRole();
    const status = this.assignmentStatus();
    if (status === 'Pending_Timeline') {
      return 'Propose Task Due Date';
    }
    if (status === 'Timeline_Review') {
      if (role === 'cco' || role === 'co' || role === 'admin') {
        return 'Branch Proposed Due Date';
      }
      return 'Proposed Due Date (Awaiting Approval)';
    }
    return 'Suggested Task Due Date';
  }

  saveSingleTaskTimeline(task: any) {
    const dateStr = task.temp_proposed_due_date || (task.temp_proposed_due_date_obj ? this.formatDateForBackend(task.temp_proposed_due_date_obj) : '');
    if (!this.assignmentId || !dateStr) return;

    this.rowSavingMap.update(map => ({ ...map, [task.assignment_task_id]: true }));

    this.api.proposeSingleTaskTimeline(this.assignmentId, task.assignment_task_id, dateStr, task.temp_proposed_remark).subscribe({
      next: () => {
        this.rowSavingMap.update(map => ({ ...map, [task.assignment_task_id]: false }));
        this.notification.success('Task due date updated successfully.');
        this.loadTasks();
      },
      error: (err) => {
        this.rowSavingMap.update(map => ({ ...map, [task.assignment_task_id]: false }));
        this.notification.error('Failed to update task due date: ' + (err.message || err.statusText));
      }
    });
  }

  reviewSingleTaskTimeline(task: any, status: 'APPROVED' | 'REJECTED') {
    if (!this.assignmentId) return;

    if (!task.temp_timeline_review_remark || !task.temp_timeline_review_remark.trim()) {
      this.notification.error('Please enter review remarks/feedback before taking action.');
      return;
    }

    this.rowSavingMap.update(map => ({ ...map, [task.assignment_task_id]: true }));

    this.api.reviewSingleTaskTimeline(
      this.assignmentId,
      task.assignment_task_id,
      status,
      task.temp_timeline_review_remark
    ).subscribe({
      next: () => {
        this.rowSavingMap.update(map => ({ ...map, [task.assignment_task_id]: false }));
        this.notification.success(`Task timeline proposal ${status.toLowerCase()} successfully.`);
        this.loadTasks();
      },
      error: (err) => {
        this.rowSavingMap.update(map => ({ ...map, [task.assignment_task_id]: false }));
        this.notification.error('Failed to review task timeline: ' + (err.message || err.statusText));
      }
    });
  }

  approveCustomTimeline() {
    if (!this.assignmentId) return;

    const dateStr = this.tempAssignmentTimeline;
    const taskTimelines = this.tasks().map(t => ({
      assignment_task_id: t.assignment_task_id,
      proposed_due_date: t.temp_proposed_due_date || dateStr
    }));

    this.submitting = true;
    this.api.acceptTimelineWithChanges(this.assignmentId, dateStr, taskTimelines).subscribe({
      next: () => {
        this.submitting = false;
        this.notification.success('Timeline approved successfully.');
        this.loadTasks();
      },
      error: (err) => {
        this.submitting = false;
        this.notification.error('Failed to approve timeline: ' + (err.message || err.statusText));
      }
    });
  }

  loadTasks() {
    if (this.assignmentId) {
      console.log('Fetching tasks for assignmentId:', this.assignmentId);
      forkJoin({
        data: this.api.getAssignmentTasks(this.assignmentId),
        taskSets: this.api.getTaskSets().pipe(catchError(() => of([]))),
        assignments: this.api.getAssignments({ limit: 1000 }).pipe(catchError(() => of({ data: [] }))),
        branches: this.api.getBranches().pipe(catchError(() => of([])))
      }).subscribe({
        next: ({ data, taskSets, assignments, branches }: any) => {
          console.log('API Response data received:', data);

          const taskSetList = taskSets || [];
          const asgList = assignments?.data || (Array.isArray(assignments) ? assignments : []);
          const branchList = branches || [];
          const matchedAsg = asgList.find((a: any) => Number(a.id) === Number(this.assignmentId));

          // Map backend tasks to hold temporary form values while preserving unsaved user input
          const currentTasksMap = new Map<number, any>();
          (this.tasks() || []).forEach(ct => {
            if (ct && ct.assignment_task_id) {
              currentTasksMap.set(ct.assignment_task_id, ct);
            }
          });

          const firstItem = (data && data.length > 0) ? data[0] : {};
          const matchedTs = taskSetList.find((s: any) =>
            (matchedAsg?.task_set_id && Number(s.id) === Number(matchedAsg.task_set_id)) ||
            (firstItem.task_set_id && Number(s.id) === Number(firstItem.task_set_id)) ||
            (firstItem.task_set_name && (s.name || '').toLowerCase().trim() === (firstItem.task_set_name || '').toLowerCase().trim()) ||
            (matchedAsg?.task_set_name && (s.name || '').toLowerCase().trim() === (matchedAsg.task_set_name || '').toLowerCase().trim())
          );

          const creatorRole = (
            firstItem.created_by_role ||
            firstItem.creator_role ||
            firstItem.task_set_created_by_role ||
            matchedTs?.created_by_role ||
            matchedTs?.creator_role ||
            matchedAsg?.created_by_role ||
            matchedAsg?.creator_role ||
            ''
          );

          const creatorName = (
            firstItem.created_by_username ||
            firstItem.created_by_name ||
            firstItem.creator_name ||
            firstItem.created_by ||
            matchedTs?.created_by_name ||
            matchedTs?.created_by_username ||
            matchedTs?.creator_name ||
            matchedAsg?.created_by_name ||
            matchedAsg?.created_by_username ||
            ''
          );

          const tsType = (
            firstItem.task_set_type ||
            firstItem.type ||
            matchedTs?.type ||
            matchedTs?.task_set_type ||
            matchedAsg?.type ||
            matchedAsg?.task_set_type ||
            'REGULAR'
          );

          const tsName = firstItem.task_set_name || matchedTs?.name || matchedAsg?.task_set_name || '';
          const circRef = firstItem.circular_reference_no || matchedTs?.reference_no || matchedTs?.circular_reference_no || matchedAsg?.circular_reference_no || '';
          const circTitle = firstItem.circular_title || matchedTs?.circular_title || matchedAsg?.circular_title || '';
          const asgStatus = firstItem.assignment_status || matchedAsg?.status || '';

          const mappedTasks = (data || []).map((t: any) => {
            const rawDate = t.proposed_due_date || t.due_date;
            const existing = currentTasksMap.get(t.assignment_task_id);

            // Preserve unsaved compliance remarks if modified locally by user
            let preservedRemarks = t.remarks || '';
            if (existing && existing.temp_remarks !== undefined && existing.temp_remarks !== null) {
              const savedRemarks = existing.remarks || '';
              if (existing.temp_remarks !== savedRemarks && existing.temp_remarks.trim().length > 0) {
                preservedRemarks = existing.temp_remarks;
              }
            }

            // Preserve unsaved compliance status
            let preservedComplianceStatus = t.compliance_status && t.compliance_status !== 'PENDING' ? t.compliance_status : 'COMPLIED';
            if (existing && existing.temp_compliance_status) {
              const savedStatus = existing.compliance_status && existing.compliance_status !== 'PENDING' ? existing.compliance_status : 'COMPLIED';
              if (existing.temp_compliance_status !== savedStatus) {
                preservedComplianceStatus = existing.temp_compliance_status;
              }
            }

            // Preserve unsaved proposed due date
            let preservedProposedDate = rawDate ? rawDate.split('T')[0] : '';
            let preservedProposedDateObj = rawDate ? new Date(rawDate) : null;
            if (existing && existing.temp_proposed_due_date !== undefined) {
              const dbDateStr = rawDate ? rawDate.split('T')[0] : '';
              if (existing.temp_proposed_due_date !== dbDateStr && existing.temp_proposed_due_date) {
                preservedProposedDate = existing.temp_proposed_due_date;
                preservedProposedDateObj = existing.temp_proposed_due_date_obj || preservedProposedDateObj;
              }
            }

            // Preserve unsaved proposed remark
            let preservedProposedRemark = t.proposed_remark || '';
            if (existing && existing.temp_proposed_remark !== undefined) {
              if (existing.temp_proposed_remark !== (existing.proposed_remark || '')) {
                preservedProposedRemark = existing.temp_proposed_remark;
              }
            }

            // Preserve unsaved timeline review remark
            let preservedTimelineReviewRemark = t.timeline_review_remark || '';
            if (existing && existing.temp_timeline_review_remark !== undefined) {
              if (existing.temp_timeline_review_remark !== (existing.timeline_review_remark || '')) {
                preservedTimelineReviewRemark = existing.temp_timeline_review_remark;
              }
            }

            // Preserve unsaved head comment
            let preservedHeadComment = t.review_remark || '';
            if (existing && existing.head_comment !== undefined) {
              preservedHeadComment = existing.head_comment;
            }

            const desc = t.description || t.task_description || t.title || 'Compliance Task';
            return {
              ...t,
              assignment_status: t.assignment_status || asgStatus || firstItem.assignment_status,
              branch_id: t.branch_id || matchedAsg?.branch_id || firstItem.branch_id || firstItem.branchId,
              branch_name: t.branch_name || matchedAsg?.branch_name || firstItem.branch_name || firstItem.branchName,
              task_set_name: t.task_set_name || tsName,
              task_set_type: tsType,
              type: tsType,
              created_by_role: creatorRole,
              created_by_username: creatorName,
              created_by_name: creatorName,
              circular_reference_no: t.circular_reference_no || circRef,
              circular_title: t.circular_title || circTitle,
              description: desc,
              task_description: desc,
              temp_compliance_status: preservedComplianceStatus,
              temp_remarks: preservedRemarks,
              temp_proposed_due_date: preservedProposedDate,
              temp_proposed_due_date_obj: preservedProposedDateObj,
              temp_proposed_remark: preservedProposedRemark,
              temp_timeline_review_remark: preservedTimelineReviewRemark,
              head_comment: preservedHeadComment,
              has_evidence: false,
              evidence_url: '',
              remarks_history: []
            };
          });

          // Recover task-set sub-department assignments if not yet stored on assignment_tasks
          const taskSetId = matchedTs?.id || matchedAsg?.task_set_id || firstItem.task_set_id;
          if (taskSetId) {
            this.api.getTaskSet(taskSetId).subscribe({
              next: (tsDetails) => {
                const tsTasks = tsDetails?.tasks || [];
                const tsSubDeptMap = new Map<number, number>();
                const tsTaskDateMap = new Map<number, string | null>();
                tsTasks.forEach((tt: any) => {
                  if (tt.sub_dept_id || tt.branch_id) {
                    tsSubDeptMap.set(tt.id, tt.sub_dept_id || tt.branch_id);
                  }
                  const dStr = tt.due_date ? String(tt.due_date).trim() : null;
                  tsTaskDateMap.set(tt.id, dStr || null);
                });

                mappedTasks.forEach((mt: any) => {
                  if (!mt.sub_dept_id && tsSubDeptMap.has(mt.task_id)) {
                    const sId = tsSubDeptMap.get(mt.task_id)!;
                    mt.sub_dept_id = sId;
                    this.api.delegateTaskToSubDept(this.assignmentId!, mt.assignment_task_id, sId).subscribe();
                  }

                  if (tsTaskDateMap.has(mt.task_id)) {
                    const origTsDueDate = tsTaskDateMap.get(mt.task_id);
                    if (!origTsDueDate) {
                      mt.has_explicit_due_date = false;
                      mt.due_date = null;
                    } else {
                      mt.has_explicit_due_date = true;
                      mt.due_date = origTsDueDate;
                    }
                  }
                });
                this.tasks.set(mappedTasks);
                this.groupTasks();
              }
            });
          }

          // Fetch evidence urls linked to this assignment
          this.api.getAssignmentEvidence(this.assignmentId!).subscribe({
            next: (evidenceList) => {
              const activeEvidenceList = (evidenceList || []).filter((e: any) => !this.isEvidenceDeleted(e));
              mappedTasks.forEach((task: any) => {
                const evidences = activeEvidenceList.filter((e: any) => e.assignment_task_id === task.assignment_task_id || e.task_id === task.task_id);
                task.evidence_history = evidences.map((e: any) => {
                  let fileName = 'Evidence Document.pdf';
                  if (e.file_url) {
                    const parts = e.file_url.split('/');
                    const lastPart = parts[parts.length - 1];
                    fileName = this.cleanFileName(lastPart);
                  }
                  let uName = e.uploader_name || '';
                  let uRole = e.uploader_role || '';
                  const r = (uRole || '').toUpperCase();
                  if (r === 'CO' || r === 'CO_REVIEWER' || r === 'REVIEWER') {
                    uRole = 'CO REVIEWER';
                    uName = uName || 'CO Reviewer';
                  } else if (r === 'CCO' || r === 'CCO_REVIEWER') {
                    uRole = 'CCO REVIEWER';
                    uName = uName || 'CCO Reviewer';
                  } else if (r === 'BRANCH_USER' || r === 'DEPARTMENT') {
                    uRole = 'DEPARTMENT/BRANCH';
                    uName = uName || task.sub_dept_name || task.branch_name || 'it_dept';
                  }
                  return {
                    ...e,
                    file_url: this.api.getFileUrl(e.file_url),
                    file_name: fileName,
                    uploader_name: uName,
                    uploader_role: uRole
                  };
                });
                if (task.evidence_history.length > 0) {
                  task.has_evidence = true;
                  task.evidence_url = task.evidence_history[0].file_url;
                }
              });

              // Save mapped evidence items into shared repository
              const asgName = this.taskSetName();
              const asgStartDate = this.startDate();
              const asgBranchId = this.tasks()[0]?.branch_id || this.userBranchId();
              const asgBranchName = this.branchName() || this.userBranchName();

              const evDocsToSave: any[] = [];
              mappedTasks.forEach((task: any) => {
                if (Array.isArray(task.evidence_history)) {
                  task.evidence_history.forEach((eh: any) => {
                    if (!eh.file_url) return;
                    const deptId = task.sub_dept_id || task.branch_id || asgBranchId;
                    const deptName = task.sub_dept_name || task.branch_name || asgBranchName;
                    const fname = this.cleanFileName(eh.file_name || eh.filename || (eh.file_url ? eh.file_url.split('/').pop()?.split('?')[0] : 'Task Evidence'));

                    evDocsToSave.push({
                      id: 9000000 + Number(eh.id || Math.floor(Math.random() * 1000000)),
                      document_name: fname,
                      document_number: asgName ? `TASK: ${asgName}` : (task.assignment_task_id ? `TASK-#${task.assignment_task_id}` : 'TASK-EVIDENCE'),
                      issue_date: eh.created_at || eh.uploaded_at || null,
                      created_at: eh.created_at || eh.uploaded_at || new Date().toISOString(),
                      start_date: asgStartDate || null,
                      end_date: null,
                      department_id: deptId ? Number(deptId) : null,
                      department_name: deptName || null,
                      user_id: eh.uploaded_by ? Number(eh.uploaded_by) : null,
                      user_name: eh.uploader_name || 'Branch Member',
                      file_url: eh.file_url,
                      file_name: fname,
                      description: `Evidence for "${task.task_title || task.description || asgName || 'Task Assignment'}"`,
                      status: 'ACTIVE',
                      access_level: 'PUBLIC',
                      is_evidence: true,
                      source_type: 'TASK_EVIDENCE',
                      task_set_id: taskSetId ? Number(taskSetId) : null,
                      task_set_name: asgName || null,
                      frequency: this.frequency() || null,
                      cycle_label: this.complianceCycleInfo()?.cycleLabel || null
                    });
                  });
                }
              });
              if (evDocsToSave.length > 0) {
                this.api.saveEvidenceDocuments(evDocsToSave);
              }

              // Fetch remarks history in parallel
              let completedCount = 0;
              if (mappedTasks.length === 0) {
                this.loadFallbackFromTaskSet();
                return;
              }

              mappedTasks.forEach((task: any) => {
                this.api.getTaskRemarksHistory(this.assignmentId!, task.assignment_task_id).subscribe({
                  next: (history) => {
                    const rawList = history || [];
                    const historyList = rawList.filter((h: any) => !this.isRemarkDeleted(h, task.assignment_task_id));
                    const reviewRemarkText = task.assignment_review_remark || task.review_remark;
                    if (reviewRemarkText && reviewRemarkText.trim() && !this.isRemarkDeleted({ remark: reviewRemarkText }, task.assignment_task_id)) {
                      const exists = historyList.some((h: any) => h.remark.includes(reviewRemarkText) || reviewRemarkText.includes(h.remark));
                      if (!exists) {
                        historyList.push({
                          role: 'CO',
                          username: 'CO Reviewer',
                          remark: reviewRemarkText.toLowerCase().includes('re-compliance') ? reviewRemarkText : `[Re-compliance Requested] ${reviewRemarkText}`,
                          created_at: task.reviewed_at || new Date().toISOString()
                        });
                      }
                    }
                    task.remarks_history = historyList;

                    // Enrich evidence_history with uploader identity based on remarks_history or fallback
                    (task.evidence_history || []).forEach((ev: any) => {
                      if (ev.uploader_role && ev.uploader_name) {
                        return;
                      }
                      const matched = historyList.find((rh: any) => {
                        if (ev.submitted_at && rh.created_at) {
                          const diff = Math.abs(new Date(ev.submitted_at).getTime() - new Date(rh.created_at).getTime());
                          return diff < 120000;
                        }
                        return false;
                      });

                      if (matched) {
                        ev.uploader_name = matched.username;
                        const r = (matched.role || '').toUpperCase();
                        ev.uploader_role = r === 'CCO' ? 'CCO REVIEWER' : ((r === 'CO' || r === 'REVIEWER') ? 'CO REVIEWER' : 'DEPARTMENT/BRANCH');
                      } else if (ev.remark && (ev.remark.includes('[CO') || ev.remark.toLowerCase().includes('co reviewer'))) {
                        ev.uploader_name = 'CO Reviewer';
                        ev.uploader_role = 'CO REVIEWER';
                      } else if (ev.remark && (ev.remark.includes('[CCO') || ev.remark.toLowerCase().includes('cco reviewer'))) {
                        ev.uploader_name = 'CCO Reviewer';
                        ev.uploader_role = 'CCO REVIEWER';
                      } else {
                        ev.uploader_name = task.sub_dept_name || task.branch_name || 'it_dept';
                        ev.uploader_role = 'DEPARTMENT/BRANCH';
                      }
                    });

                    completedCount++;
                    if (completedCount === mappedTasks.length) {
                      this.tasks.set(mappedTasks);
                      if (mappedTasks.some((t: any) => t.review_status === 'NEEDS_REDO')) {
                        this.subDeptSubmittedSignal.set(false);
                      }
                      this.populateMetadata(mappedTasks);
                      this.groupTasks();
                    }
                  },
                  error: (err: any) => {
                    console.error('Failed to load remarks history for task:', task.assignment_task_id, err);
                    completedCount++;
                    if (completedCount === mappedTasks.length) {
                      this.tasks.set(mappedTasks);
                      if (mappedTasks.some((t: any) => t.review_status === 'NEEDS_REDO')) {
                        this.subDeptSubmittedSignal.set(false);
                      }
                      this.populateMetadata(mappedTasks);
                      this.groupTasks();
                    }
                  }
                });
              });
            },
            error: (err: any) => {
              console.error('Failed to load assignment evidence:', err);
              if (mappedTasks.length === 0) {
                this.loadFallbackFromTaskSet();
              } else {
                this.tasks.set(mappedTasks);
                this.populateMetadata(mappedTasks);
                this.groupTasks();
              }
            }
          });
        },
        error: (err: any) => {
          console.warn('API Error fetching tasks directly, attempting fallback from task set:', err);
          this.loadFallbackFromTaskSet();
        }
      });
    }
  }

  loadFallbackFromTaskSet() {
    if (!this.assignmentId) return;
    const currentId = this.assignmentId;

    this.api.getTaskSet(currentId).subscribe({
      next: (ts) => {
        if (!ts) {
          this.tasks.set([]);
          this.groupTasks();
          return;
        }

        const qpBranchId = this.route.snapshot.queryParamMap.get('branch_id');
        const qpBranchName = this.route.snapshot.queryParamMap.get('branch_name');

        this.api.getBranches().subscribe({
          next: (branchesList) => {
            const targetBranchObj = (branchesList || []).find((b: any) =>
              (qpBranchId && String(b.id) === String(qpBranchId)) ||
              (qpBranchName && (b.name || '').trim().toLowerCase() === qpBranchName.trim().toLowerCase()) ||
              (ts.branch_id && String(b.id) === String(ts.branch_id)) ||
              (ts.branches && ts.branches[0] && String(b.id) === String(ts.branches[0].id)) ||
              (ts.branch_names && (b.name || '').trim().toLowerCase() === ts.branch_names.trim().toLowerCase())
            );

            // If target branch is known, query assignments specifically for that branch
            const targetBranchId = targetBranchObj?.id || ts.branch_id;
            if (targetBranchId) {
              this.api.getAssignments({ branch_id: targetBranchId, limit: 1000 }).subscribe({
                next: (asgRes) => {
                  const found = (asgRes.data || []).find((a: any) => String(a.task_set_id) === String(currentId));
                  if (found && found.id && String(found.id) !== String(currentId)) {
                    this.assignmentId = found.id;
                    this.loadTasks();
                    return;
                  }
                  this.renderTaskSetTasks(ts, branchesList, targetBranchObj);
                },
                error: () => {
                  this.renderTaskSetTasks(ts, branchesList, targetBranchObj);
                }
              });
            } else {
              this.renderTaskSetTasks(ts, branchesList, targetBranchObj);
            }
          },
          error: () => {
            this.renderTaskSetTasks(ts, [], null);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load fallback task set:', err);
        this.tasks.set([]);
        this.groupTasks();
      }
    });
  }

  renderTaskSetTasks(ts: any, branchesList: any[], targetBranchObj: any) {
    if (!ts || !ts.tasks || ts.tasks.length === 0) {
      this.tasks.set([]);
      this.populateMetadata([]);
      this.groupTasks();
      return;
    }
    const qpBranchName = this.route.snapshot.queryParamMap.get('branch_name');
    const targetBranchName = qpBranchName || targetBranchObj?.name || (ts.branches && ts.branches[0]?.name) || ts.branch_names || '';
    const userBId = this.userBranchId();
    const isTargetSubDeptOfUser = targetBranchObj && userBId && String(targetBranchObj.parent_id) === String(userBId);
    const subDeptId = isTargetSubDeptOfUser ? targetBranchObj.id : (ts.sub_dept_id || null);
    const subDeptName = isTargetSubDeptOfUser ? targetBranchObj.name : (ts.sub_dept_name || targetBranchName);

    const fallbackTasks = ts.tasks.map((t: any, idx: number) => {
      const rawDate = t.due_date ? String(t.due_date).split('T')[0] : null;
      const desc = t.description || t.task_description || t.title || 'Compliance Task';
      const compStatus = t.compliance_status && t.compliance_status !== 'PENDING' ? t.compliance_status : (t.remarks ? 'COMPLIED' : 'PENDING');
      const hasEv = !!(t.has_evidence || t.evidence_file_name || t.evidence_url);
      return {
        assignment_task_id: t.id || (idx + 1),
        task_id: t.id,
        description: desc,
        task_description: desc,
        file_url: t.file_url || null,
        file_name: t.file_name || (t.file_url ? t.file_url.split('/').pop() : ''),
        header_name: t.header_name || 'General',
        priority: t.priority || 'Medium',
        due_date: rawDate,
        has_explicit_due_date: !!rawDate,
        proposed_due_date: rawDate,
        compliance_status: compStatus,
        status: t.status || (t.remarks ? 'COMPLETED' : 'PENDING'),
        remarks: t.remarks || '',
        review_status: t.review_status || null,
        review_remark: t.review_remark || '',
        has_evidence: hasEv,
        evidence_file_name: t.evidence_file_name || '',
        evidence_file_url: t.evidence_file_url || t.evidence_url || '',
        sub_dept_id: t.sub_dept_id || subDeptId,
        sub_dept_name: t.sub_dept_name || subDeptName,
        temp_compliance_status: compStatus === 'PENDING' ? 'COMPLIED' : compStatus,
        temp_remarks: t.remarks || '',
        temp_proposed_due_date: rawDate ? String(rawDate).split('T')[0] : '',
        temp_proposed_due_date_obj: rawDate ? new Date(rawDate) : null,
        task_set_name: ts.name,
        task_set_type: ts.type || ts.task_set_type || 'REGULAR',
        type: ts.type || ts.task_set_type || 'REGULAR',
        created_by_role: ts.created_by_role || ts.creator_role || '',
        created_by_username: ts.created_by_username || ts.created_by_name || ts.creator_name || ts.created_by || '',
        created_by_name: ts.created_by_username || ts.created_by_name || ts.creator_name || ts.created_by || '',
        branch_name: targetBranchName || 'Network Department',
        branch_id: targetBranchObj?.id || ts.branch_id,
        frequency: this.frequencyMap[String(ts.frequency)] || ts.frequency || 'Weekly',
        assignment_status: (ts.type || '').toUpperCase() === 'INTERNAL' ? 'In_Progress' : 'Pending_Timeline',
        remarks_history: t.remarks_history || [],
        evidence_history: t.evidence_history || []
      };
    });
    this.tasks.set(fallbackTasks);
    this.populateMetadata(fallbackTasks);
    this.groupTasks();
  }

  populateMetadata(mappedTasks: any[]) {
    if (mappedTasks.length > 0) {
      const first = mappedTasks[0];
      this.assignmentStatus.set(first.assignment_status);
      this.reviewRemark.set(first.assignment_review_remark || '');

      // Populate rich header metadata
      this.branchName.set(first.branch_name || '');
      this.taskSetName.set(first.task_set_name || '');
      this.taskSetType.set(first.task_set_type || first.type || '');
      this.createdByRole.set(first.created_by_role || first.creator_role || first.task_set_created_by_role || first.user_role || '');
      this.createdByName.set(first.created_by_username || first.created_by_name || first.creator_name || first.created_by || '');
      this.proposedTimeline.set(first.proposed_timeline || '');

      if (first.proposed_timeline) {
        this.tempAssignmentTimeline = first.proposed_timeline.split('T')[0];
        this.tempAssignmentTimelineObj = new Date(first.proposed_timeline);
      } else {
        this.tempAssignmentTimelineObj = null;
      }

      const freqVal = first.frequency || '';
      this.frequency.set(this.frequencyMap[freqVal] || freqVal || 'ONCE');
      this.startDate.set(first.start_date || '');
      this.endDate.set(first.endDate || first.end_date || '');
      this.circularReferenceNo.set(first.circular_reference_no || '');
      this.circularTitle.set(first.circular_title || '');
      this.authorityName.set(first.authority_name || '');
      this.loadSubDepartments(first.branch_name || '', first.branch_id || first.branchId);
    } else {
      this.assignmentStatus.set('');
      this.reviewRemark.set('');
      this.branchName.set('');
      this.taskSetName.set('');
      this.taskSetType.set('');
      this.createdByRole.set('');
      this.createdByName.set('');
      this.proposedTimeline.set('');
      this.frequency.set('');
      this.startDate.set('');
      this.endDate.set('');
      this.circularReferenceNo.set('');
      this.circularTitle.set('');
      this.authorityName.set('');
      this.availableSubDepts.set([]);
    }
  }

  loadSubDepartments(branchName: string, branchId?: number | string) {
    this.api.getBranches().subscribe({
      next: (branches) => {
        this.allBranches.set(branches || []);
        const userBId = this.userBranchId();

        const current = branches.find(b =>
          (branchId && String(b.id) === String(branchId)) ||
          ((b.name || '').trim().toLowerCase() === (branchName || '').trim().toLowerCase())
        );

        if (current) {
          // If current target branch is a sub-department of logged-in user's department:
          if (userBId && String(current.parent_id) === String(userBId)) {
            const updatedTasks = this.tasks().map(t => ({
              ...t,
              sub_dept_id: t.sub_dept_id || current.id,
              sub_dept_name: t.sub_dept_name || current.name
            }));
            this.tasks.set(updatedTasks);
            this.groupTasks();
            this.availableSubDepts.set([]);
            return;
          }

          const childDepts = branches.filter(b => String(b.parent_id) === String(current.id));
          if (childDepts.length > 0) {
            const opts = [
              { label: 'Direct (Self-Compliance)', value: null },
              ...childDepts.map(sd => ({ label: sd.name, value: sd.id }))
            ];
            this.availableSubDepts.set(opts);
            return;
          }
        }
        this.availableSubDepts.set([]);
      },
      error: (err) => console.warn('Failed to load sub-departments for delegation:', err)
    });
  }

  onTaskSubDeptChange(task: any, subDeptId: number | null) {
    if (!this.assignmentId || !task.assignment_task_id) return;
    if ((task.remarks?.trim() || task.has_evidence) && subDeptId === null) {
      this.notification.warn('Cannot convert a task with sub-department submissions into a direct task. Sub-department comment and evidence are protected.');
      return;
    }
    this.api.delegateTaskToSubDept(this.assignmentId, task.assignment_task_id, subDeptId).subscribe({
      next: () => {
        task.sub_dept_id = subDeptId;
        const subDeptOpt = this.availableSubDepts().find(o => o.value === subDeptId);
        const name = subDeptOpt ? subDeptOpt.label : 'Direct (Self-Compliance)';
        this.notification.success(`Task assignment updated to: ${name}`);
        this.loadTasks();
      },
      error: (err) => {
        this.notification.error('Failed to delegate task: ' + (err.message || err.statusText));
      }
    });
  }

  bulkAssignAllTasks() {
    if (!this.assignmentId || !this.tasks().length) return;
    const subDeptId = this.bulkSelectedSubDeptId;
    const subDeptOpt = this.availableSubDepts().find(o => o.value === subDeptId);
    const subDeptName = subDeptOpt ? subDeptOpt.label : 'Direct (Self-Compliance)';

    this.bulkAssigning = true;
    const taskIds = this.tasks().map(t => t.assignment_task_id);

    const obs = taskIds.map(taskId => this.api.delegateTaskToSubDept(this.assignmentId!, taskId, subDeptId));

    import('rxjs').then(rxjs => {
      rxjs.forkJoin(obs).subscribe({
        next: () => {
          this.bulkAssigning = false;
          this.notification.success(`All ${taskIds.length} tasks successfully assigned to: ${subDeptName}`);
          this.loadTasks();
        },
        error: (err) => {
          this.bulkAssigning = false;
          this.notification.error('Failed to assign tasks: ' + (err.message || err.statusText));
          this.loadTasks();
        }
      });
    });
  }

  // Head Department Review Actions for Sub-Department Task
  headAcceptSubDeptTask(task: any) {
    if (!this.assignmentId || !task.assignment_task_id) return;
    const remark = (task.head_comment || '').trim() || 'Accepted by Head Department';
    this.api.reviewTaskStatus(this.assignmentId, task.assignment_task_id, 'APPROVED', remark).subscribe({
      next: () => {
        task.review_status = 'APPROVED';
        task.review_remark = remark;
        this.notification.success(`Task accepted by Head Department.`);
        this.loadTasks();
      },
      error: (err) => {
        this.notification.error('Failed to accept task: ' + (err.message || err.statusText));
      }
    });
  }

  openHeadRejectBox(task: any) {
    this.rejectingTaskId.set(task.assignment_task_id);
    this.headRejectionRemark.set((task.head_comment || '').trim());
  }

  cancelHeadRejectBox() {
    this.rejectingTaskId.set(null);
    this.headRejectionRemark.set('');
  }

  headRejectSubDeptTask(task: any) {
    const remark = this.headRejectionRemark().trim() || (task.head_comment || '').trim();
    if (!remark) {
      this.notification.warn('Please provide a reason for rejecting the task.');
      return;
    }
    if (!this.assignmentId || !task.assignment_task_id) return;
    this.api.reviewTaskStatus(this.assignmentId, task.assignment_task_id, 'NEEDS_REDO', remark).subscribe({
      next: () => {
        task.review_status = 'NEEDS_REDO';
        task.review_remark = remark;
        this.rejectingTaskId.set(null);
        this.headRejectionRemark.set('');
        // Update assignment status to PENDING_RECOMPLIANCE so sub-department and branch manager see it as re-compliance
        this.api.updateAssignmentStatus(this.assignmentId!, 'PENDING_RECOMPLIANCE').subscribe({
          next: () => {
            this.assignmentStatus.set('PENDING_RECOMPLIANCE');
            this.notification.warn(`Task rejected & sent back to ${task.sub_dept_name || 'Sub-Department'} for re-compliance.`);
            this.loadTasks();
          },
          error: () => {
            this.assignmentStatus.set('PENDING_RECOMPLIANCE');
            this.notification.warn(`Task rejected & sent back to ${task.sub_dept_name || 'Sub-Department'} for re-compliance.`);
            this.loadTasks();
          }
        });
      },
      error: (err) => {
        this.notification.error('Failed to reject task: ' + (err.message || err.statusText));
      }
    });
  }

  groupTasks() {
    const groupsMap = new Map<string, any[]>();
    const tasksToGroup = this.visibleTasks();

    tasksToGroup.forEach(task => {
      const headerName = task.header_name || 'Uncategorized';
      if (!groupsMap.has(headerName)) {
        groupsMap.set(headerName, []);
      }
      groupsMap.get(headerName)!.push(task);
    });

    const groups = Array.from(groupsMap.entries()).map(([headerName, tasks]) => ({
      headerName,
      tasks
    }));

    groups.sort((a, b) => {
      if (a.headerName === 'Uncategorized') return 1;
      if (b.headerName === 'Uncategorized') return -1;
      return a.headerName.localeCompare(b.headerName);
    });

    this.taskGroups.set(groups);
  }

  trackByTaskId(index: number, item: any): number {
    return item?.assignment_task_id || index;
  }

  hasRemarksHistory(task: any): boolean {
    return this.getVisibleRemarksHistory(task).length > 0;
  }

  getVisibleRemarksHistory(task: any): any[] {
    if (!task || !task.remarks_history) return [];
    return task.remarks_history.filter((h: any) => !this.isRemarkDeleted(h, task.assignment_task_id));
  }

  hasEvidenceHistory(task: any): boolean {
    return !!(task.evidence_history && task.evidence_history.length > 0);
  }

  hasReviewerRemarks(task: any): boolean {
    if (!task.remarks_history || task.remarks_history.length === 0) return false;
    return task.remarks_history.some((h: any) => h.role === 'REVIEWER');
  }

  normalizeDeptName(str: string): string {
    return (str || '')
      .toLowerCase()
      .replace(/department|dept|branch|user|_|-|\s/g, '')
      .trim();
  }

  isHeadEditRemark(h: any, task: any): boolean {
    if (!h) return false;
    const role = (h.role || '').toUpperCase();
    if (role === 'HEAD_EDIT' || role === 'HEAD' || h.is_head_edit) {
      return true;
    }
    if (role === 'CO' || role === 'CCO' || role === 'REVIEWER') {
      return false;
    }
    // If this task is assigned or delegated to a sub-department
    if (task && (task.sub_dept_id || task.sub_dept_name)) {
      const subDeptNormalized = this.normalizeDeptName(task.sub_dept_name);
      const hUserNormalized = this.normalizeDeptName(h.username);

      // If this history entry is from the sub-department, it is NEVER a Head edit
      if (subDeptNormalized && hUserNormalized && (subDeptNormalized === hUserNormalized || subDeptNormalized.includes(hUserNormalized) || hUserNormalized.includes(subDeptNormalized))) {
        return false;
      }

      const history = (task.remarks_history || []).filter((item: any) => {
        const r = (item.role || '').toUpperCase();
        return r !== 'CO' && r !== 'CCO' && r !== 'REVIEWER';
      });

      // The very first department entry is the sub-department's initial submission
      if (history.length > 0 && history[0] === h) {
        return false;
      }

      // Any subsequent non-subdept entry is an edit by Head
      if (history.length > 1 && history[0] !== h) {
        return true;
      }

      // If username does not match the assigned sub-department
      if (subDeptNormalized && hUserNormalized && subDeptNormalized !== hUserNormalized) {
        return true;
      }
    }
    return false;
  }

  isTaskSubDeptRemarkEditedByHead(task: any): boolean {
    if (!task || !task.remarks || !task.remarks.trim()) return false;
    if (!task.sub_dept_id && !task.sub_dept_name) return false;
    const history = task.remarks_history || [];
    if (history.length === 0) return false;

    const deptRemarks = history.filter((h: any) => {
      const r = (h.role || '').toUpperCase();
      return r !== 'CO' && r !== 'CCO' && r !== 'REVIEWER';
    });
    if (deptRemarks.length === 0) return false;

    const latestDeptRemark = deptRemarks[deptRemarks.length - 1];
    return this.isHeadEditRemark(latestDeptRemark, task);
  }

  getHeadEditorName(task: any): string {
    if (!task) return '';
    const history = (task.remarks_history || []).slice().reverse();
    const headEdit = history.find((h: any) => this.isHeadEditRemark(h, task));
    return headEdit?.username || '';
  }

  goBack() {
    this.router.navigate(['/assignments']);
  }

  onFileSelected(event: any, assignmentTaskId: number | null) {
    if (!assignmentTaskId) return;
    const fileList: FileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > MAX_FILE_SIZE) {
        this.notification.warn(`Skipped "${f.name}": exceeds 5MB size limit (${(f.size / (1024 * 1024)).toFixed(1)}MB).`);
        continue;
      }
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
      if (allowedExts.includes(ext) || f.type.startsWith('image/') || f.type === 'application/pdf') {
        validFiles.push(f);
      } else {
        this.notification.warn(`Skipped "${f.name}": only PDF, images (PNG, JPG), Word and Excel files are accepted.`);
      }
    }

    if (validFiles.length === 0) return;

    if (validFiles.length === 1) {
      this.stagedFile = validFiles[0];
      this.originalFileName = validFiles[0].name;
      this.customDocName = validFiles[0].name;
      this.activeEvidenceTaskId = assignmentTaskId;
      this.evidenceSourceStep = 'RENAME_CONFIRM';
      this.displayEvidenceSourceModal = true;
    } else {
      this.addSelectedFiles(assignmentTaskId, validFiles);
      this.notification.success(`${validFiles.length} evidence document(s) attached.`);
      this.displayEvidenceSourceModal = false;
    }
    event.target.value = '';
  }

  resetToOriginalName() {
    if (this.originalFileName) {
      this.customDocName = this.originalFileName;
    }
  }

  confirmAttachStagedFile() {
    if (!this.activeEvidenceTaskId || !this.stagedFile) return;
    const taskId = this.activeEvidenceTaskId;
    let finalName = (this.customDocName || '').trim();
    const origName = this.originalFileName || this.stagedFile.name || 'evidence.pdf';
    const lastDotIdx = origName.lastIndexOf('.');
    const origExt = lastDotIdx !== -1 ? origName.slice(lastDotIdx) : '';

    if (!finalName) {
      finalName = origName;
    } else if (origExt && !finalName.toLowerCase().endsWith(origExt.toLowerCase())) {
      const userDotIdx = finalName.lastIndexOf('.');
      if (userDotIdx === -1) {
        finalName = finalName + origExt;
      }
    }

    const renamedFile = new File([this.stagedFile], finalName, { type: this.stagedFile.type || 'application/octet-stream' });
    this.addSelectedFiles(taskId, [renamedFile]);
    this.notification.success(`Evidence document "${finalName}" attached.`);
    this.stagedFile = null;
    this.displayEvidenceSourceModal = false;
  }

  getSelectedFiles(assignmentTaskId: number): File[] {
    return this.selectedFilesMap()[assignmentTaskId] || [];
  }

  getSelectedFileName(assignmentTaskId: number): string {
    const files = this.getSelectedFiles(assignmentTaskId);
    if (files.length === 0) return '';
    if (files.length === 1) return files[0].name;
    return `${files.length} evidence documents`;
  }

  addSelectedFiles(assignmentTaskId: number, files: File[]) {
    this.selectedFilesMap.update((map: Record<number, File[]>) => {
      const existing = map[assignmentTaskId] || [];
      const newUnique = files.filter(f => !existing.some(e => e.name.toLowerCase() === f.name.toLowerCase() && e.size === f.size));
      return { ...map, [assignmentTaskId]: [...existing, ...newUnique] };
    });
  }

  removeSelectedFile(assignmentTaskId: number, fileIndex?: number) {
    this.selectedFilesMap.update((map: Record<number, File[]>) => {
      const copy = { ...map };
      if (fileIndex === undefined) {
        delete copy[assignmentTaskId];
      } else {
        const list = copy[assignmentTaskId] || [];
        const updated = list.filter((_, idx) => idx !== fileIndex);
        if (updated.length === 0) {
          delete copy[assignmentTaskId];
        } else {
          copy[assignmentTaskId] = updated;
        }
      }
      return copy;
    });
    this.notification.info('Evidence file removed from staged upload list.');
  }

  removeAllSelectedFiles(assignmentTaskId: number) {
    this.selectedFilesMap.update((map: Record<number, File[]>) => {
      const copy = { ...map };
      delete copy[assignmentTaskId];
      return copy;
    });
  }

  previewSelectedFile(file: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  }

  hasSavedEvidence(task: any): boolean {
    if (task.evidence_url) return true;
    if (task.has_evidence && task.evidence_history && task.evidence_history.length > 0) return true;
    return false;
  }

  hasFileToView(task: any): boolean {
    const localFiles = this.getSelectedFiles(task.assignment_task_id);
    if (localFiles && localFiles.length > 0) return true;
    return this.hasSavedEvidence(task);
  }

  previewFile(task: any) {
    const localFiles = this.getSelectedFiles(task.assignment_task_id);
    if (localFiles && localFiles.length > 0) {
      this.previewSelectedFile(localFiles[0]);
      return;
    }
    if (task.evidence_url) {
      this.previewFileUrlDirect(task.evidence_url, task.evidence_file_name);
      return;
    }
    if (task.has_evidence && task.evidence_history && task.evidence_history.length > 0) {
      this.previewFileUrlDirect(task.evidence_history[0].file_url, task.evidence_history[0].file_name);
      return;
    }
  }

  isSubDeptSubmission(ev: any, task: any): boolean {
    if (!task) return false;
    if (task.sub_dept_id) return true;
    if (task.sub_dept_name && task.sub_dept_name.trim().length > 0) return true;
    if (this.isTargetSubDeptOfHead()) return true;
    if (ev && ev.uploader_name && task.sub_dept_name && ev.uploader_name.toLowerCase().includes(task.sub_dept_name.toLowerCase())) {
      return true;
    }
    return false;
  }

  canDeleteEvidence(ev: any, task: any, idx?: number): boolean {
    if (!task || !ev) return false;
    if (this.assignmentStatus() === 'COMPLETED') return false;
    return true;
  }

  isRecentEvidence(ev: any, task: any, idx?: number): boolean {
    if (!task || !task.evidence_history || task.evidence_history.length === 0) return false;
    if (idx === 0) return true;
    if (!ev || !ev.submitted_at) return false;
    const latestTime = new Date(task.evidence_history[0].submitted_at).getTime();
    const evTime = new Date(ev.submitted_at).getTime();
    return Math.abs(latestTime - evTime) < 120000;
  }

  deleteSavedEvidence(ev: any, task: any) {
    if (!ev || !task) return;
    const fileName = ev.file_name || 'Evidence Document.pdf';

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the saved evidence "${fileName}"?`,
      header: 'Confirm Evidence Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary p-button-sm',
      accept: () => {
        const taskId = task.assignment_task_id;
        this.markEvidenceAsDeleted(ev);

        // Instantly update task & selectedTaskForChain objects in memory
        if (task.evidence_history) {
          task.evidence_history = task.evidence_history.filter((e: any) => e.id !== ev.id && e.file_url !== ev.file_url);
          task.has_evidence = task.evidence_history.length > 0;
          task.evidence_url = task.evidence_history[0]?.file_url || null;
        } else {
          task.has_evidence = false;
          task.evidence_url = null;
        }
        if (this.selectedTaskForChain && this.selectedTaskForChain.evidence_history) {
          this.selectedTaskForChain.evidence_history = this.selectedTaskForChain.evidence_history.filter((e: any) => e.id !== ev.id && e.file_url !== ev.file_url);
        }

        if (ev.id && this.assignmentId) {
          this.api.deleteTaskEvidence(this.assignmentId, taskId, ev.id).subscribe({
            next: () => {
              this.notification.success(`Evidence "${fileName}" deleted successfully.`);
              this.loadDepartmentPreviousEvidences();
              this.loadTasks();
            },
            error: () => {
              this.notification.success(`Evidence "${fileName}" deleted successfully.`);
              this.loadDepartmentPreviousEvidences();
              this.loadTasks();
            }
          });
        } else {
          this.notification.success(`Evidence "${fileName}" deleted successfully.`);
          this.loadDepartmentPreviousEvidences();
          this.loadTasks();
        }
      }
    });
  }

  deleteTaskEvidenceDirect(task: any, ev?: any) {
    if (!task) return;
    const targetEv = ev || (task.evidence_history && task.evidence_history[0]) || {
      id: task.evidence_id,
      file_url: task.evidence_url,
      file_name: task.evidence_file_name || this.cleanFileName(task.evidence_url)
    };

    const fileName = targetEv.file_name || this.cleanFileName(targetEv.file_url || 'Evidence Document');

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the evidence "${fileName}"?`,
      header: 'Confirm Evidence Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary p-button-sm',
      accept: () => {
        const taskId = task.assignment_task_id;
        this.markEvidenceAsDeleted(targetEv);

        if (task.evidence_history) {
          task.evidence_history = task.evidence_history.filter((e: any) => e.id !== targetEv.id && e.file_url !== targetEv.file_url);
          task.has_evidence = task.evidence_history.length > 0;
          task.evidence_url = task.evidence_history[0]?.file_url || null;
        } else {
          task.has_evidence = false;
          task.evidence_url = null;
        }

        if (targetEv.id && this.assignmentId) {
          this.api.deleteTaskEvidence(this.assignmentId, taskId, targetEv.id).subscribe({
            next: () => {
              this.notification.success(`Evidence "${fileName}" deleted successfully.`);
              this.loadDepartmentPreviousEvidences();
              this.loadTasks();
            },
            error: () => {
              this.notification.success(`Evidence "${fileName}" deleted successfully.`);
              this.loadDepartmentPreviousEvidences();
              this.loadTasks();
            }
          });
        } else {
          this.notification.success(`Evidence "${fileName}" deleted successfully.`);
          this.loadDepartmentPreviousEvidences();
          this.loadTasks();
        }
      }
    });
  }

  startEditSubDeptRemark(task: any) {
    if (!task || !task.remarks?.trim()) return;
    task.editedRemark = task.remarks || '';
    task.isEditingRemark = true;
  }

  cancelEditSubDeptRemark(task: any) {
    if (!task) return;
    task.editedRemark = task.remarks || '';
    task.isEditingRemark = false;
  }

  saveSubDeptRemark(task: any) {
    if (!task) return;
    if (!this.assignmentId || !task.assignment_task_id) return;
    const taskId = task.assignment_task_id;
    const newRemark = (task.editedRemark ?? '').trim();
    const compStatus = task.compliance_status || 'COMPLIED';

    task.savingRemark = true;
    this.api.completeTaskDirectly(this.assignmentId, taskId, compStatus, newRemark, true).subscribe({
      next: () => {
        task.remarks = newRemark;
        task.temp_remarks = newRemark;
        task.isEditingRemark = false;
        task.savingRemark = false;

        // Optimistically add to remarks_history with HEAD_EDIT role
        const user = this.currentUser() as any;
        const uname = user?.username || this.userBranchName() || 'Head Department';
        if (!task.remarks_history) {
          task.remarks_history = [];
        }
        task.remarks_history.push({
          role: 'HEAD_EDIT',
          username: uname,
          remark: newRemark,
          created_at: new Date().toISOString(),
          is_head_edit: true
        });

        this.notification.success('Sub-department remark updated successfully.');
        this.loadTasks();
      },
      error: (err) => {
        task.savingRemark = false;
        this.notification.error('Failed to update remark: ' + (err.message || 'Error'));
      }
    });
  }

  isLatestRemark(h: any, task: any): boolean {
    if (!h || !task) return false;
    const history = this.getVisibleRemarksHistory(task);
    if (!history || history.length === 0) return false;

    // Check if this is the latest remark overall in the chain
    if (history[history.length - 1] === h) return true;

    // If it is a department-level remark, check if it is the latest department-level remark
    const hRole = (h.role || '').toUpperCase();
    const isDept = !['CO', 'CCO', 'REVIEWER'].includes(hRole);
    if (isDept) {
      const deptItems = history.filter((item: any) => !['CO', 'CCO', 'REVIEWER'].includes((item.role || '').toUpperCase()));
      return deptItems.length > 0 && deptItems[deptItems.length - 1] === h;
    }

    return false;
  }

  canEditRemark(h: any, task: any): boolean {
    if (!h || !task) return false;
    if (!h.remark || !h.remark.trim()) return false;
    if (this.assignmentStatus() === 'COMPLETED') return false;

    // Sub-department user should NEVER see or have edit option like head in the timeline
    if (this.isSubDepartmentUser()) {
      return false;
    }

    // ONLY the latest remark in the chain can be edited (older entries are immutable history snapshots)
    if (!this.isLatestRemark(h, task)) {
      return false;
    }

    // Head Department user can edit the latest remark (head edits or sub-dept remark modification)
    if (this.isHeadDepartmentUser()) {
      return true;
    }

    // Reviewers/CO can edit their own review remarks if it is the latest
    const user = this.currentUser() as any;
    const currentUsername = (user?.username || '').toLowerCase().trim();
    const hUser = (h.username || '').toLowerCase().trim();
    return currentUsername === hUser;
  }

  hasTaskDueDate(task: any): boolean {
    if (!task) return false;
    if (task.has_explicit_due_date === false) return false;
    if (!task.due_date) return false;
    return true;
  }

  startEditTimelineRemark(h: any) {
    if (!h) return;
    h.editedRemark = h.remark || '';
    h.isEditing = true;
  }

  cancelEditTimelineRemark(h: any) {
    if (!h) return;
    h.isEditing = false;
  }

  saveTimelineRemark(h: any, task: any) {
    if (!h || !task || !this.assignmentId) return;
    const taskId = task.assignment_task_id;
    const newRemark = (h.editedRemark ?? '').trim();
    const compStatus = task.compliance_status || 'COMPLIED';
    const isHeadEdit = this.isHeadEditRemark(h, task);

    h.saving = true;
    this.api.completeTaskDirectly(this.assignmentId, taskId, compStatus, newRemark, isHeadEdit).subscribe({
      next: () => {
        h.remark = newRemark;
        h.isEditing = false;
        h.saving = false;

        // Sync with the task remarks if active
        task.remarks = newRemark;
        task.temp_remarks = newRemark;

        this.notification.success('Remark updated successfully.');
        this.loadTasks();
      },
      error: (err) => {
        h.saving = false;
        this.notification.error('Failed to update remark: ' + (err.message || 'Error'));
      }
    });
  }

  async saveSubDeptEvidence(task: any): Promise<boolean> {
    if (!this.assignmentId) return false;
    const taskId = task.assignment_task_id;
    const files = this.getSelectedFiles(taskId);
    if (!files || files.length === 0) {
      this.notification.warn('No evidence files selected to upload.');
      return false;
    }

    this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: true }));

    const formData = new FormData();
    files.forEach((f: File) => {
      formData.append('files', f, f.name);
    });
    formData.append('remark', task.remarks || task.temp_remarks || 'Evidence uploaded');
    formData.append('compliance_status', task.compliance_status || 'COMPLIED');

    return new Promise((resolve) => {
      this.api.uploadTaskEvidence(this.assignmentId!, taskId, formData).subscribe({
        next: () => {
          this.removeAllSelectedFiles(taskId);
          this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: false }));
          this.notification.success('Evidence uploaded successfully!');
          this.loadDepartmentPreviousEvidences();
          this.loadTasks();
          resolve(true);
        },
        error: (err) => {
          this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: false }));
          this.notification.error('Failed to upload evidence: ' + (err.message || 'Error'));
          resolve(false);
        }
      });
    });
  }

  previewFileUrlDirect(url: string | null | undefined, name?: string | null): void {
    if (!url) return;
    const fullUrl = this.api.resolveFileUrl(url);
    if (!fullUrl) return;

    const fileName = name || this.cleanFileName(url);
    this.previewFileName.set(fileName);
    this.previewFileUrl.set(fullUrl);
    this.previewDocxHtml.set(null);
    this.previewTextContent.set(null);

    const lower = (url || '').toLowerCase().split('?')[0];

    if (lower.endsWith('.pdf')) {
      this.previewFileType.set('pdf');
      this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl));
      this.showPreviewModal.set(true);
    } else if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.bmp')
    ) {
      this.previewFileType.set('image');
      this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl));
      this.showPreviewModal.set(true);
    } else if (lower.endsWith('.docx')) {
      this.previewFileType.set('docx');
      this.showPreviewModal.set(true);
      this.loadDocxPreview(fullUrl);
    } else if (lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.json') || lower.endsWith('.sql')) {
      this.previewFileType.set('text');
      this.showPreviewModal.set(true);
      this.loadTextPreview(fullUrl);
    } else {
      this.previewFileType.set('other');
      this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl));
      this.showPreviewModal.set(true);
    }
  }

  openInNewTab(url: string | null): void {
    if (url) window.open(url, '_blank');
  }

  async loadDocxPreview(url: string): Promise<void> {
    this.previewLoading.set(true);
    this.previewDocxHtml.set(null);
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const xmlText = await this.extractDocxXml(buf);
      if (xmlText) {
        const html = this.parseDocxXmlToHtml(xmlText);
        this.previewDocxHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
      } else {
        this.previewDocxHtml.set(null);
      }
    } catch (err) {
      console.warn('Docx preview load failed, falling back:', err);
      this.previewDocxHtml.set(null);
    } finally {
      this.previewLoading.set(false);
    }
  }

  async extractDocxXml(buf: ArrayBuffer): Promise<string | null> {
    try {
      const view = new DataView(buf);
      let offset = 0;
      const len = buf.byteLength;

      while (offset + 30 < len) {
        const sig = view.getUint32(offset, true);
        if (sig !== 0x04034b50) break; // Local file header signature

        const method = view.getUint16(offset + 8, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = new Uint8Array(buf, offset + 30, nameLen);
        const filename = new TextDecoder('utf-8').decode(nameBytes);

        const dataStart = offset + 30 + nameLen + extraLen;
        const dataEnd = dataStart + compressedSize;

        if (filename === 'word/document.xml') {
          const compressedData = new Uint8Array(buf, dataStart, compressedSize);
          if (method === 8) { // Deflate compressed
            if (typeof DecompressionStream !== 'undefined') {
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              writer.write(compressedData);
              writer.close();
              const response = new Response(ds.readable);
              return await response.text();
            }
          } else if (method === 0) { // Uncompressed
            return new TextDecoder('utf-8').decode(compressedData);
          }
        }

        offset = dataEnd;
      }
    } catch (e) {
      console.error('Failed to unpack word/document.xml:', e);
    }
    return null;
  }

  parseDocxXmlToHtml(xmlText: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const body = doc.getElementsByTagName('w:body')[0] || doc.documentElement;
      let html = '<div class="docx-doc-page" style="background:#ffffff; padding:2.5rem 3rem; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,0.08); max-width:850px; margin:0 auto; font-family:\'Segoe UI\', Calibri, Arial, sans-serif; font-size:0.95rem; line-height:1.65; color:#1e293b;">';

      for (let i = 0; i < body.childNodes.length; i++) {
        const node = body.childNodes[i];
        if (node.nodeName === 'w:p') {
          const pText = this.parseDocxParagraph(node);
          if (pText.trim().length > 0) {
            html += `<p style="margin: 0.6rem 0; line-height: 1.6;">${pText}</p>`;
          } else {
            html += `<div style="height: 0.6rem;"></div>`;
          }
        } else if (node.nodeName === 'w:tbl') {
          html += this.parseDocxTable(node);
        }
      }

      html += '</div>';
      return html;
    } catch (e) {
      console.error('Failed to parse docx xml:', e);
      return '<div class="p-4 text-center text-slate-500">Could not render Word Document preview.</div>';
    }
  }

  private parseDocxParagraph(pNode: Node): string {
    let text = '';
    const runs = (pNode as Element).getElementsByTagName('w:r');
    if (runs.length === 0) {
      return pNode.textContent || '';
    }
    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      const isBold = run.getElementsByTagName('w:b').length > 0;
      const isItalic = run.getElementsByTagName('w:i').length > 0;
      const isUnderline = run.getElementsByTagName('w:u').length > 0;

      const tNodes = run.getElementsByTagName('w:t');
      let runText = '';
      for (let t = 0; t < tNodes.length; t++) {
        runText += tNodes[t].textContent || '';
      }

      runText = runText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      if (isBold) runText = `<strong>${runText}</strong>`;
      if (isItalic) runText = `<em>${runText}</em>`;
      if (isUnderline) runText = `<u>${runText}</u>`;

      text += runText;
    }
    return text;
  }

  private parseDocxTable(tblNode: Node): string {
    let tblHtml = '<div style="overflow-x: auto; margin: 1.25rem 0;"><table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; border: 1px solid #cbd5e1;">';
    const rows = (tblNode as Element).getElementsByTagName('w:tr');
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const isHeaderRow = r === 0;
      tblHtml += `<tr style="${isHeaderRow ? 'background: #f8fafc; font-weight: 700;' : ''}">`;
      const cells = row.getElementsByTagName('w:tc');
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c];
        const cellText = cell.textContent || '';
        const tag = isHeaderRow ? 'th' : 'td';
        tblHtml += `<${tag} style="border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top;">${cellText}</${tag}>`;
      }
      tblHtml += '</tr>';
    }
    tblHtml += '</table></div>';
    return tblHtml;
  }

  async loadTextPreview(url: string): Promise<void> {
    this.previewLoading.set(true);
    this.previewTextContent.set(null);
    try {
      const res = await fetch(url);
      const text = await res.text();
      this.previewTextContent.set(text);
    } catch {
      this.previewTextContent.set('Could not load text file content.');
    } finally {
      this.previewLoading.set(false);
    }
  }

  resolveFileUrl(url: string | null | undefined): string | null {
    return this.api.resolveFileUrl(url);
  }

  // Save a single task row declaration and/or upload evidence
  async saveSingleTask(task: any, showNotification: boolean = true): Promise<boolean> {
    if (!this.assignmentId) return false;
    if (!task.temp_remarks?.trim()) {
      this.notification.warn('Remarks / Explanation is required.');
      return false;
    }

    const taskId = task.assignment_task_id;
    this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: true }));

    const clearRejectionIfAny = () => {
      if (task.review_status === 'NEEDS_REDO') {
        this.api.reviewTaskStatus(this.assignmentId!, taskId, null as any, '').subscribe({
          next: () => { },
          error: (err) => console.warn('Could not clear review_status flag:', err)
        });
      }
    };

    return new Promise((resolve) => {
      const files = this.getSelectedFiles(taskId);

      if (files && files.length > 0) {
        // 1. Submit with multiple evidence files upload
        const formData = new FormData();
        files.forEach((f: File) => {
          formData.append('files', f, f.name);
        });
        formData.append('remark', task.temp_remarks);
        formData.append('compliance_status', task.temp_compliance_status || 'COMPLIED');

        this.api.uploadTaskEvidence(this.assignmentId!, taskId, formData)
          .subscribe({
            next: () => {
              clearRejectionIfAny();
              setTimeout(() => {
                this.removeAllSelectedFiles(taskId);
                this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: false }));
                this.loadTasks();
                if (showNotification) {
                  this.notification.success(`${files.length > 1 ? files.length + ' evidence documents' : 'Evidence document'} and compliance saved successfully!`);
                }
                resolve(true);
              });
            },
            error: (err) => {
              console.error(err);
              setTimeout(() => {
                this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: false }));
                this.notification.error('Failed to upload evidence documents: ' + (err.message || err.statusText));
                resolve(false);
              });
            }
          });
      } else {
        // 2. Submit text-only declaration directly
        this.api.completeTaskDirectly(this.assignmentId!, taskId, task.temp_compliance_status, task.temp_remarks)
          .subscribe({
            next: () => {
              clearRejectionIfAny();
              setTimeout(() => {
                this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: false }));
                this.loadTasks();
                if (showNotification) {
                  this.notification.success('Task compliance saved successfully!');
                }
                resolve(true);
              });
            },
            error: (err) => {
              console.error(err);
              setTimeout(() => {
                this.rowSavingMap.update((map: any) => ({ ...map, [taskId]: false }));
                this.notification.error('Failed to save task compliance: ' + (err.message || err.statusText));
                resolve(false);
              });
            }
          });
      }
    });
  }


  // Bulk submit all compliance tasks by Head Department (Direct completion or CO queue)
  async submitAllCompliance(action: 'COMPLETE' | 'SUBMIT_CO' = 'COMPLETE') {
    if (!this.assignmentId) return;

    const allTasks = this.tasks();

    if (this.isDirectSubDeptAssignment()) {
      for (const t of allTasks) {
        if (!t.remarks?.trim() && !t.temp_remarks?.trim() && !t.has_evidence && t.status !== 'COMPLETED') {
          this.notification.warn(`Task "${t.description?.slice(0, 35)}..." is still pending compliance declaration.`);
          return;
        }
      }
    } else {
      // 1. Strict validation: all sub-department tasks must be completed & accepted by Head, direct tasks must be filled
      for (const t of allTasks) {
        if (t.sub_dept_id) {
          if (t.review_status === 'NEEDS_REDO') {
            this.notification.warn(`Task "${t.description?.slice(0, 35)}..." was rejected by Head and is awaiting re-compliance from ${t.sub_dept_name || 'Sub-Department'}.`);
            return;
          }
          if (!t.remarks?.trim() && !t.has_evidence && t.status !== 'COMPLETED') {
            this.notification.warn(`Task "${t.description?.slice(0, 35)}..." is still pending compliance declaration from ${t.sub_dept_name || 'Sub-Department'}.`);
            return;
          }
          if (t.review_status !== 'APPROVED') {
            this.notification.warn(`Please review and accept the compliance submitted by ${t.sub_dept_name || 'Sub-Department'} for task "${t.description?.slice(0, 35)}..." before completing.`);
            return;
          }
        } else {
          if (!t.remarks?.trim() && !t.temp_remarks?.trim()) {
            this.notification.warn(`Direct task "${t.description?.slice(0, 35)}..." requires remarks before completing.`);
            return;
          }
        }
      }
    }

    const tasksToSaveDirectly = allTasks.filter(t => !this.isSubDeptSubmission(null, t) && this.canEditTaskAssignment(t));
    if (tasksToSaveDirectly.length > 0) {
      this.submitting = true;
      this.lastSubmitAction = action;
      const results = await Promise.all(tasksToSaveDirectly.map(t => this.saveSingleTask(t, false)));
      const allSuccessful = results.every(res => res === true);
      if (!allSuccessful) {
        this.submitting = false;
        this.notification.error('Some checklist items failed to save. Please review and try again.');
        return;
      }
    }

    this.submitting = true;
    this.lastSubmitAction = action;
    const targetStatus = action === 'COMPLETE' ? 'COMPLETED' : 'REVIEW_PENDING';

    console.log(`Submitting compliance declarations for assignmentId: ${this.assignmentId} with target status: ${targetStatus}...`);

    this.api.updateAssignmentStatus(this.assignmentId, targetStatus).subscribe({
      next: () => {
        this.submitting = false;
        if (action === 'COMPLETE') {
          this.assignmentStatus.set('COMPLETED');
          this.notification.success('Compliance checklist completed successfully!');
        } else {
          this.assignmentStatus.set('REVIEW_PENDING');
          this.notification.success('Compliance checklist successfully submitted to CO Review Queue!');
        }
        this.loadTasks(); // Reload to refresh status and lock controls
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.notification.error('Failed to update assignment status: ' + (err.message || err.statusText));
      }
    });
  }

  async submitSubDeptComplianceToHead() {
    if (!this.assignmentId) return;

    // Check if any temp remarks need to be saved
    const unsavedTasks = this.visibleTasks().filter(t => t.temp_remarks?.trim() && t.temp_remarks !== t.remarks);
    if (unsavedTasks.length > 0) {
      this.submitting = true;
      const results = await Promise.all(unsavedTasks.map(t => this.saveSingleTask(t, false)));
      const allSaved = results.every(r => r === true);
      if (!allSaved) {
        this.submitting = false;
        this.notification.error('Failed to save some checklist answers. Please check and try again.');
        return;
      }
    }

    this.submitting = true;
    const newStatus = 'REVIEW_PENDING';
    this.api.updateAssignmentStatus(this.assignmentId, newStatus).subscribe({
      next: () => {
        this.submitting = false;
        this.assignmentStatus.set(newStatus);
        this.subDeptSubmittedSignal.set(true);
        this.notification.success('Compliance submitted successfully to Head Department for review and acceptance!');
        this.loadTasks();
      },
      error: () => {
        this.submitting = false;
        this.assignmentStatus.set(newStatus);
        this.subDeptSubmittedSignal.set(true);
        this.notification.success('Compliance submitted successfully to Head Department for review and acceptance!');
        this.loadTasks();
      }
    });
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }

  downloadFile(url: string | null | undefined, name?: string | null): void {
    if (!url) return;
    this.api.downloadFile(url, name);
  }

  getRoleIcon(role: string): string {
    const r = (role || '').toUpperCase();
    if (r.includes('CO') || r.includes('REVIEWER')) return 'pi pi-shield';
    if (r.includes('CCO')) return 'pi pi-verified';
    return 'pi pi-user';
  }

  getRoleBadgeClass(role: string): string {
    const r = (role || '').toUpperCase();
    if (r.includes('CO') || r.includes('REVIEWER')) return 'bg-indigo-100 text-indigo-800';
    if (r.includes('CCO')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  }
}
