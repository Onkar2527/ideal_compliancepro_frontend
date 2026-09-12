import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-assignment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, Textarea, TagModule, TooltipModule, DatePickerModule, DialogModule, InputTextModule],
  styleUrls: ['../../shared/styles/checklist-shared.css'],
  template: `
    <!-- Compact Premium Dashboard Header -->
    <div class="glass-panel mb-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4" 
         style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem;">
      
      <!-- Left: Scope & Period -->
      <div class="flex-column gap-1" style="flex: 1.2; min-width: 250px;">
        <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
            {{ branchName() }}
          </span>
          <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
            Freq: {{ frequency() || 'ONCE' }}
          </span>
        </div>
        <h1 class="text-lg font-bold text-gray-900 m-0 mt-1" style="margin-top: 0.15rem;">{{ taskSetName() }}</h1>
        <span class="text-xs text-gray-500 font-medium" *ngIf="startDate() && endDate()">
          Period: {{ startDate() | date:'dd/MM/yyyy' }} to {{ endDate() | date:'dd/MM/yyyy' }}
        </span>
      </div>

      <!-- Middle: Circular Ref & Due Date -->
      <div class="flex-column gap-1" style="flex: 1.5; min-width: 280px; border-left: 1px solid #f3f4f6; padding-left: 1rem;">
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block" style="font-size: 0.75rem;">Circular Details</span>
        <p class="text-sm font-bold text-gray-900 m-0 truncate max-w-md" [title]="circularTitle()" style="font-size: 0.95rem; line-height: 1.35;">
          {{ circularTitle() }}
        </p>
        <div class="flex items-center gap-2 mt-1" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
          <span class="text-xs font-semibold text-gray-700 bg-gray-50 border px-2 py-0.5 rounded" style="font-size: 0.8rem;">
            Ref: {{ circularReferenceNo() || 'N/A' }}
          </span>
          <span class="text-xs font-semibold text-gray-700 bg-gray-50 border px-2 py-0.5 rounded" style="font-size: 0.8rem;">
            Auth: {{ authorityName() || 'N/A' }}
          </span>
          
          <!-- Editable main assignment due date in planning phase -->
          <div *ngIf="canEditTimeline(); else viewDueDate" class="flex items-center gap-1">
            <span class="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded" style="font-size: 0.8rem;">
              <i class="pi pi-calendar"></i> Suggest Assignment Due:
            </span>
            <p-datepicker [(ngModel)]="tempAssignmentTimelineObj" (ngModelChange)="tempAssignmentTimeline = formatDateForBackend($event)" dateFormat="dd-mm-yy" appendTo="body" styleClass="w-32" [inputStyleClass]="'p-1 border rounded text-xs font-semibold'"></p-datepicker>
          </div>
          <ng-template #viewDueDate>
            <span class="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1" style="font-size: 0.8rem;">
              <i class="pi pi-calendar-times"></i> Due: {{ proposedTimeline() | date:'dd-MM-yyyy' }}
            </span>
          </ng-template>
        </div>
      </div>

      <!-- Right: Progress, Status & Back Button -->
      <div class="flex items-center justify-content-between gap-4" style="display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-width: 320px; border-left: 1px solid #f3f4f6; padding-left: 1.5rem; flex: 1.2;">
        <div class="flex-column items-start" style="display: flex; flex-direction: column; align-items: flex-start; flex: 1;">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-0.5" style="font-size: 0.75rem;">Status & Progress</span>
          <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                  [ngClass]="{
                    'bg-yellow-100 text-yellow-800': assignmentStatus().toUpperCase() === 'PENDING_TIMELINE' || assignmentStatus().toUpperCase() === 'TIMELINE_REVIEW',
                    'bg-indigo-100 text-indigo-800': assignmentStatus().toUpperCase() === 'IN_PROGRESS' || assignmentStatus().toUpperCase() === 'PENDING_RECOMPLIANCE',
                    'bg-orange-100 text-orange-800': assignmentStatus().toUpperCase() === 'REVIEW_PENDING' || assignmentStatus().toUpperCase() === 'ESCALATED_TO_CCO',
                    'bg-green-100 text-green-800': assignmentStatus().toUpperCase() === 'COMPLETED',
                    'bg-red-100 text-red-800': assignmentStatus().toUpperCase() === 'REJECTED'
                  }" style="font-size: 0.8rem; padding: 0.15rem 0.5rem;">
              {{ assignmentStatus() }}
            </span>
            <span class="text-xs font-bold text-indigo-600">
              {{ completedCount() }}/{{ tasks().length }}
              {{ (assignmentStatus().toUpperCase() === 'PENDING_TIMELINE' || assignmentStatus().toUpperCase() === 'TIMELINE_REVIEW') ? 'Dates Set' : 'Done' }}
            </span>
          </div>
          <div class="w-24 bg-gray-100 rounded-full h-1 overflow-hidden mt-1" style="width: 5rem; margin-top: 0.25rem;">
            <div class="bg-indigo-600 h-1 rounded-full transition-all duration-300" [style.width.%]="progressPercentage()"></div>
          </div>
        </div>
        
        <button pButton type="button" icon="pi pi-arrow-left" label="Back" severity="secondary" outlined size="small" class="p-button-sm no-print" (click)="goBack()"></button>
      </div>
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

    <!-- Bulk Assign All Tasks Bar (Visible to Head Department) -->
    <div *ngIf="availableSubDepts().length > 1 && isHeadDepartmentUser() && !isReviewer() && assignmentStatus() !== 'COMPLETED'" 
         style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #0f2942; border-radius: 10px; margin-top: 0.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(15,41,66,0.04);">
      
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 2.25rem; height: 2.25rem; border-radius: 8px; background: #0f2942; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 1px 3px rgba(15,41,66,0.25);">
          <i class="pi pi-sitemap"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 0.9rem; font-weight: 800; color: #0f2942;">Bulk Assign All Tasks</h3>
          <span style="font-size: 0.725rem; color: #64748b; font-weight: 500;">Assign all {{ tasks().length }} tasks in this checklist to a sub-department or self-compliance in one click</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="font-size: 0.75rem; font-weight: 700; color: #0f2942;">Assign All To:</span>
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
        <!-- Group Header Banner (Light Dark Slate Navy) -->
        <div class="task-group-header-bar" style="background: linear-gradient(90deg, #1e3a5f 0%, #2c4f7c 100%); color: white; padding: 0.45rem 1rem; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
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

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 1rem 1rem 0.5rem 1rem; display: flex; flex-direction: column; gap: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div *ngFor="let t of group.tasks; trackBy: trackByTaskId; let i = index" 
               class="question-card"
               [ngClass]="{
                 'border-left-green': t.status === 'COMPLETED' && t.compliance_status === 'COMPLIED',
                 'border-left-red': t.status === 'COMPLETED' && t.compliance_status === 'NOT_COMPLIED',
                 'border-left-yellow': t.status === 'PENDING'
               }"
               style="margin-bottom: 0.75rem;">
            
            <!-- Left Column: Serial Number & Task Info -->
            <div class="question-main" style="padding: 1.1rem; border-right: 1px solid #f1f5f9; display: flex; gap: 0.85rem; align-items: flex-start;">
              <div class="question-number">
                {{ i + 1 }}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem;">
                
                <!-- Top Tags Bar -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block" style="font-size: 0.65rem; letter-spacing: 0.05em;" *ngIf="t.circular_title">
                      {{ t.circular_title }}
                    </span>
                    <span *ngIf="t.review_status === 'APPROVED'" style="padding: 0.15rem 0.55rem; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                      <i class="pi pi-check-circle" style="font-size: 0.65rem; color: #047857;"></i> Accepted
                    </span>
                    <span *ngIf="t.review_status === 'NEEDS_REDO'" style="padding: 0.15rem 0.55rem; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                      <i class="pi pi-times-circle" style="font-size: 0.65rem;"></i> Rejected
                    </span>
                    <span *ngIf="t.review_status === 'ESCALATED'" style="padding: 0.15rem 0.55rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                      <i class="pi pi-exclamation-triangle" style="font-size: 0.65rem;"></i> Escalated to CCO
                    </span>
                  </div>
                </div>

                <!-- Task Description -->
                <p class="font-semibold text-gray-800 m-0" style="line-height: 1.45; font-size: 0.92rem; color: #0f172a; margin-top: 0.2rem;">
                  {{ t.description }}
                </p>

                <!-- Task Attachment Download Link -->
                <div *ngIf="t.file_url" style="margin-top: 0.35rem;">
                  <a [href]="getFileUrl(t.file_url)" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-md text-xs font-semibold border border-slate-300 no-underline transition-colors" title="Download Task Attachment" style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.6rem; background-color: #f1f5f9; color: #0f2942; border: 1px solid #cbd5e1; border-radius: 6px; text-decoration: none; font-size: 0.75rem; font-weight: 700;">
                    <i class="pi pi-file text-slate-600"></i>
                    <span>Attached Task Document</span>
                    <i class="pi pi-download text-xs text-slate-500" style="margin-left: 0.25rem;"></i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Right Column: Answer Form or Timeline Proposing -->
            <div class="answer-form" *ngIf="isTimelineMode(); else complianceForm" style="display: flex; flex-direction: column; align-items: stretch; justify-content: center; width: 100%; padding: 0.9rem 1rem; box-sizing: border-box;">
              
              <!-- If Branch is proposing/editing timeline -->
              <ng-container *ngIf="!isReviewer()">
                <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; min-width: 0; box-sizing: border-box;">
                  
                  <!-- Timeline Header with Mode / Assignee (Single Line matching Topbar) -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%; padding-bottom: 0.45rem; border-bottom: 1px solid #e2e8f0; box-sizing: border-box; min-width: 0;">
                    <label class="control-label font-bold text-gray-700 m-0" style="font-size: 0.72rem; white-space: nowrap; flex-shrink: 0;">{{ getTimelineLabel() }}</label>

                    <!-- Sub-Department Delegation Control (Shown ONLY to Head Department / Admin) -->
                    <div *ngIf="availableSubDepts().length > 1 && isHeadDepartmentUser() && !isReviewer() && assignmentStatus() !== 'COMPLETED'" 
                         style="display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 0; justify-content: flex-end;">
                      <span style="font-size: 0.7rem; font-weight: 700; color: #475569; display: inline-flex; align-items: center; gap: 0.2rem; white-space: nowrap; flex-shrink: 0;">
                        <i class="pi pi-sitemap" style="color: #0f2942; font-size: 0.72rem;"></i> Assignee:
                      </span>
                      <div style="flex: 1; min-width: 0; max-width: 200px;">
                        <p-select 
                          [options]="availableSubDepts()" 
                          [ngModel]="t.sub_dept_id || null" 
                          (ngModelChange)="onTaskSubDeptChange(t, $event)"
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
                      <span style="padding: 0.2rem 0.5rem; background: #f8fafc; color: #0f2942; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                        <i class="pi pi-users" style="color: #0f2942;"></i> Assigned: {{ t.sub_dept_name }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between;">
                    <span class="text-xs text-gray-500 font-medium" *ngIf="t.due_date">Default Due Date: <strong class="text-gray-700">{{ t.due_date | date:'dd-MM-yyyy' }}</strong></span>
                    <span class="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full" *ngIf="t.review_status === 'REJECTED'">
                      Rejected
                    </span>
                    <span class="text-xs text-green-600 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full" *ngIf="t.review_status === 'APPROVED'">
                      Approved
                    </span>
                  </div>

                  <!-- Reviewer's Feedback (Show to Branch if rejected/approved) -->
                  <div class="text-xs text-red-700 font-medium bg-red-50 border border-red-200 p-2 rounded mb-2" *ngIf="t.review_status === 'REJECTED' && t.timeline_review_remark">
                    <strong>Reviewer Feedback:</strong> "{{ t.timeline_review_remark }}"
                  </div>
                  <div class="text-xs text-green-700 font-medium bg-green-50 border border-green-200 p-2 rounded mb-2" *ngIf="t.review_status === 'APPROVED' && t.timeline_review_remark">
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
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%; padding-bottom: 0.45rem; border-bottom: 1px solid #e2e8f0; box-sizing: border-box; min-width: 0;">
                  <!-- Due Date Badge -->
                  <div style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; color: #1e293b; background: #f8fafc; border: 1px solid #cbd5e1; padding: 0.2rem 0.5rem; border-radius: 6px; white-space: nowrap; flex-shrink: 0;">
                    <i class="pi pi-calendar" style="color: #0f2942; font-size: 0.75rem;"></i>
                    <span style="color: #64748b; font-weight: 600;">Due:</span>
                    <span style="color: #0f2942; font-weight: 800;">{{ (t.due_date ? (t.due_date | date:'dd/MM/yyyy') : (proposedTimeline() | date:'dd/MM/yyyy')) }}</span>
                  </div>

                  <!-- Sub-Department Delegation Control (Shown ONLY to Head Department / Admin) -->
                  <div *ngIf="availableSubDepts().length > 1 && isHeadDepartmentUser() && !isReviewer() && assignmentStatus() !== 'COMPLETED'" 
                       style="display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 0; justify-content: flex-end;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: #475569; display: inline-flex; align-items: center; gap: 0.2rem; white-space: nowrap; flex-shrink: 0;">
                      <i class="pi pi-sitemap" style="color: #0f2942; font-size: 0.72rem;"></i> Assignee:
                    </span>
                    <div style="flex: 1; min-width: 0; max-width: 200px;">
                      <p-select 
                        [options]="availableSubDepts()" 
                        [ngModel]="t.sub_dept_id || null" 
                        (ngModelChange)="onTaskSubDeptChange(t, $event)" 
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
                    <span style="padding: 0.2rem 0.5rem; background: #f8fafc; color: #0f2942; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                      <i class="pi pi-users" style="color: #0f2942;"></i> Assigned: {{ t.sub_dept_name }}
                    </span>
                  </div>
                </div>

                <!-- Per-Task Review Status Banner -->
                <div *ngIf="t.review_status" class="w-full">
                  <div *ngIf="t.review_status === 'APPROVED'" style="padding: 0.45rem 0.75rem; background: #f0fdf4; border: 1px solid #a7f3d0; border-left: 3px solid #047857; border-radius: 6px; font-size: 0.75rem; color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                    <span style="display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
                      <i class="pi pi-check-circle" style="color: #047857;"></i>
                      <span>Approved {{ isHeadDepartmentUser() ? 'by Head Department' : 'by Reviewer' }}</span>
                    </span>
                    <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 0.15rem 0.5rem; border-radius: 4px;">Accepted</span>
                  </div>

                  <div *ngIf="t.review_status === 'NEEDS_REDO'" style="padding: 0.45rem 0.75rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; font-size: 0.75rem; color: #991b1b;">
                    <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600;">
                      <span style="display: flex; align-items: center; gap: 0.35rem;">
                        <i class="pi pi-exclamation-circle text-red-600"></i>
                        <span>Needs Re-compliance</span>
                      </span>
                      <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: #fee2e2; color: #b91c1c; padding: 0.15rem 0.5rem; border-radius: 4px;">Rejected</span>
                    </div>
                    <div *ngIf="t.review_remark" style="font-size: 0.725rem; font-weight: 500; color: #7f1d1d; margin-top: 0.25rem;">
                      <strong>Feedback:</strong> "{{ t.review_remark }}"
                    </div>
                  </div>

                  <div *ngIf="t.review_status === 'ESCALATED'" style="padding: 0.45rem 0.75rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 0.75rem; color: #92400e;">
                    <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600;">
                      <span style="display: flex; align-items: center; gap: 0.35rem;">
                        <i class="pi pi-exclamation-triangle text-amber-600"></i>
                        <span>Escalated to CCO for Final Review</span>
                      </span>
                      <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: #fef3c7; color: #b45309; padding: 0.15rem 0.5rem; border-radius: 4px;">Escalated to CCO</span>
                    </div>
                    <div *ngIf="t.review_remark" style="font-size: 0.725rem; font-weight: 500; color: #78350f; margin-top: 0.25rem;">
                      <strong>CO Remarks:</strong> "{{ t.review_remark }}"
                    </div>
                  </div>
                </div>

                <!-- ══ CASE 1: HEAD DEPARTMENT VIEWING DELEGATED SUB-DEPT TASK ══ -->
                <ng-container *ngIf="isHeadDepartmentUser() && t.sub_dept_id && !isReviewer()">
                  <!-- If Sub-Dept has filled compliance -->
                  <div *ngIf="t.remarks || t.has_evidence || t.status === 'COMPLETED'; else subDeptPendingBlock" 
                       class="p-3 border rounded-lg w-full flex flex-column gap-2"
                       style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: #f8fafc; border: 1px solid #cbd5e1; border-left: 3px solid #0f2942; border-radius: 8px;">
                    
                    <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between;">
                      <span class="text-xs font-bold flex items-center gap-1" style="font-size: 0.75rem; font-weight: 700; color: #0f2942;">
                        <i class="pi pi-users" style="color: #0f2942;"></i> {{ t.sub_dept_name || 'Sub-Department' }} Submission:
                      </span>
                      <span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider" 
                            [ngClass]="t.compliance_status === 'COMPLIED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                            style="font-size: 0.65rem;">
                        {{ t.compliance_status || 'COMPLIED' }}
                      </span>
                    </div>

                    <div class="text-xs text-gray-800 font-medium" *ngIf="t.remarks" style="font-size: 0.8rem; color: #1f2937; line-height: 1.4;">
                      <strong>Sub-Dept Remarks:</strong> "{{ t.remarks }}"
                    </div>

                    <div *ngIf="t.has_evidence && t.evidence_url" style="margin-top: 0.15rem;">
                      <a [href]="t.evidence_url" target="_blank" class="evidence-link" style="font-size: 0.75rem; font-weight: 700; color: #dc2626; display: inline-flex; align-items: center; gap: 0.25rem; text-decoration: none;">
                        <i class="pi pi-file-pdf"></i> View Sub-Dept Evidence PDF
                      </a>
                    </div>

                    <!-- Head Decision Action Bar (Only in Hierarchical Mode) -->
                    <div *ngIf="!isDirectSubDeptAssignment() && isHeadDepartmentUser() && assignmentStatus() !== 'COMPLETED' && !isReviewer()" class="mt-2 pt-2 border-t border-gray-200" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
                      
                      <!-- If Head is writing rejection feedback -->
                      <div *ngIf="rejectingTaskId() === t.assignment_task_id" style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <label class="text-xs font-bold text-red-700 block" style="font-size: 0.725rem;">Rejection Reason for {{ t.sub_dept_name || 'Sub-Dept' }} *</label>
                        <textarea pTextarea 
                                  [(ngModel)]="headRejectionRemark"
                                  class="w-full p-2 border rounded text-xs" 
                                  style="resize: none; height: 3rem; font-size: 0.75rem;"
                                  placeholder="Explain why this is rejected and what needs to be fixed..."></textarea>
                        <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                          <p-button label="Cancel" severity="secondary" [outlined]="true" size="small" (click)="cancelHeadRejectBox()"></p-button>
                          <p-button label="Confirm Rejection & Send to Sub-Dept" severity="danger" icon="pi pi-times" size="small" (click)="headRejectSubDeptTask(t)"></p-button>
                        </div>
                      </div>

                      <!-- Accept / Reject Buttons for Head -->
                      <div *ngIf="rejectingTaskId() !== t.assignment_task_id" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                        <div *ngIf="t.review_status === 'APPROVED'" class="text-xs font-bold text-green-700 flex items-center gap-1">
                          <i class="pi pi-check-circle text-green-600"></i> Accepted by Head Department
                        </div>
                        <div *ngIf="t.review_status === 'NEEDS_REDO'" class="text-xs font-bold text-red-700 flex items-center gap-1">
                          <i class="pi pi-times-circle text-red-600"></i> Re-compliance Requested
                        </div>
                        <div *ngIf="!t.review_status" class="text-xs font-semibold text-gray-500">
                          Head Decision:
                        </div>

                        <div style="display: flex; gap: 0.35rem;">
                          <p-button *ngIf="t.review_status !== 'APPROVED'"
                                    label="Accept" 
                                    icon="pi pi-check" 
                                    severity="success" 
                                    size="small" 
                                    (click)="headAcceptSubDeptTask(t)"></p-button>
                          <p-button *ngIf="t.review_status !== 'NEEDS_REDO'"
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
                    <div class="p-3 border rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2"
                         style="padding: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #64748b; border-radius: 8px; color: #334155; display: flex; align-items: center; gap: 0.5rem;">
                      <i class="pi pi-clock" style="color: #0f2942;"></i>
                      <span>Awaiting compliance declaration & documents from <strong>{{ t.sub_dept_name || 'Sub-Department' }}</strong></span>
                    </div>
                  </ng-template>
                </ng-container>

                <!-- ══ CASE 2: DIRECT TASKS OR SUB-DEPT USER VIEWING THEIR TASK ══ -->
                <ng-container *ngIf="!isHeadDepartmentUser() || !t.sub_dept_id || isReviewer()">
                  <!-- If assignment is completed, hide form inputs and show read-only details -->
                  <div *ngIf="assignmentStatus() === 'COMPLETED'; else activeComplianceForm" class="flex flex-column gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg w-full">
                    <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                      <span class="text-xs font-bold text-gray-500">Compliance Status:</span>
                      <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800" *ngIf="t.compliance_status === 'COMPLIED'">
                        Complied
                      </span>
                      <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800" *ngIf="t.compliance_status === 'NOT_COMPLIED'">
                        Not Complied
                      </span>
                      <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800" *ngIf="t.compliance_status !== 'COMPLIED' && t.compliance_status !== 'NOT_COMPLIED'">
                        {{ t.compliance_status || 'Pending Declaration' }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-700 font-medium mt-1" *ngIf="t.remarks">
                      <strong>Remarks / Explanation:</strong> "{{ t.remarks }}"
                    </div>
                    <!-- View PDF link -->
                    <div class="mt-1.5" *ngIf="hasFileToView(t)">
                      <button type="button" (click)="previewFile(t)" class="evidence-link border-none bg-transparent cursor-pointer p-0 font-bold" style="color: #dc2626; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                        <i class="pi pi-file-pdf" style="color: #ef4444;"></i> View PDF
                      </button>
                    </div>
                  </div>

                  <!-- Active compliance form (during In_Progress or review) -->
                  <ng-template #activeComplianceForm>
                    <div *ngIf="canEditTaskAssignment(t); else readOnlyTaskBlock" style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                      
                      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <label class="control-label font-bold text-gray-700 m-0" style="font-size: 0.725rem;">
                            Remarks / Explanation <span class="text-red-500">*</span>
                          </label>
                        </div>
                        <textarea pTextarea
                                  [(ngModel)]="t.temp_remarks"
                                  class="answer-control w-full"
                                  style="resize: none; min-height: 3.4rem; height: 3.4rem; font-size: 0.8rem; padding: 0.45rem 0.6rem;"
                                  placeholder="Add compliance remarks or explanation..."></textarea>
                      </div>

                      <!-- Bottom Actions Row -->
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.15rem;">
                        
                        <!-- Upload PDF + Attached File Preview -->
                        <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                          <button type="button"
                                  (click)="openEvidencePicker(t)"
                                  style="padding: 0.25rem 0.65rem; height: 1.95rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; font-weight: 600; border: 1px dashed #6366f1; background: #eef2ff; color: #4338ca; margin: 0; cursor: pointer;">
                            <i class="pi pi-upload" style="font-size: 0.72rem;"></i> 
                            {{ getSelectedFileName(t.assignment_task_id) ? 'Change Evidence' : 'Upload Evidence' }}
                          </button>

                          <div *ngIf="getSelectedFileName(t.assignment_task_id)"
                               style="display: inline-flex; align-items: center; gap: 0.35rem; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 0.2rem 0.55rem; height: 1.95rem; font-size: 0.72rem; color: #166534;">
                            <i class="pi pi-file-pdf" style="color: #dc2626; font-size: 0.82rem;"></i>
                            <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;" [title]="getSelectedFileName(t.assignment_task_id)">
                              {{ getSelectedFileName(t.assignment_task_id) }}
                            </span>
                            <button type="button" 
                                    (click)="previewFile(t)" 
                                    title="Preview PDF"
                                    style="background: #ffffff; border: 1px solid #86efac; border-radius: 4px; padding: 0.15rem 0.4rem; cursor: pointer; color: #15803d; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700;">
                              <i class="pi pi-eye" style="font-size: 0.7rem;"></i> Preview
                            </button>
                            <button type="button" 
                                    (click)="removeSelectedFile(t.assignment_task_id)" 
                                    title="Remove file"
                                    style="background: none; border: none; padding: 0.1rem; cursor: pointer; color: #dc2626; display: inline-flex; align-items: center;">
                              <i class="pi pi-times" style="font-size: 0.75rem;"></i>
                            </button>
                          </div>

                          <button *ngIf="!getSelectedFileName(t.assignment_task_id) && hasFileToView(t)"
                                  type="button"
                                  (click)="previewFile(t)"
                                  class="p-button p-button-sm p-button-outlined p-button-danger"
                                  style="height: 1.95rem; font-size: 0.72rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <i class="pi pi-file-pdf"></i> View PDF
                          </button>
                        </div>

                        <!-- Save Task Button -->
                        <p-button label="Save Task"
                                  [loading]="!!rowSavingMap()[t.assignment_task_id]"
                                  loadingIcon="pi pi-spinner pi-spin"
                                  icon="pi pi-save"
                                  iconPos="left"
                                  [disabled]="rowSavingMap()[t.assignment_task_id] || !t.temp_remarks?.trim()"
                                  (click)="saveSingleTask(t)"
                                  severity="primary"
                                  styleClass="h-2rem text-xs font-semibold px-3"
                                  size="small" />
                      </div>

                    </div>

                    <ng-template #readOnlyTaskBlock>
                      <div class="flex flex-column gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg w-full">
                        <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                          <span class="text-xs font-bold text-gray-500">Compliance Status:</span>
                          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800" *ngIf="t.compliance_status === 'COMPLIED'">
                            Complied
                          </span>
                          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800" *ngIf="t.compliance_status === 'NOT_COMPLIED'">
                            Not Complied
                          </span>
                          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800" *ngIf="t.compliance_status !== 'COMPLIED' && t.compliance_status !== 'NOT_COMPLIED'">
                            {{ t.compliance_status || 'Pending Declaration' }}
                          </span>
                        </div>
                        <div class="text-xs text-gray-700 font-medium mt-1" *ngIf="t.remarks">
                          <strong>Remarks / Explanation:</strong> "{{ t.remarks }}"
                        </div>
                        <div class="mt-1.5" *ngIf="hasFileToView(t)">
                          <button type="button" (click)="previewFile(t)" class="evidence-link border-none bg-transparent cursor-pointer p-0 font-bold" style="color: #dc2626; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                            <i class="pi pi-file-pdf" style="color: #ef4444;"></i> View PDF
                          </button>
                        </div>
                      </div>
                    </ng-template>

                  </ng-template>
                </ng-container>

                <!-- History Action Trigger Buttons Footer -->
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding-top: 0.4rem; border-top: 1px solid #f1f5f9; margin-top: 0.2rem;">
                  <button *ngIf="hasRemarksHistory(t)"
                          type="button"
                          pButton
                          icon="pi pi-comments"
                          [label]="'Remark Chain (' + t.remarks_history.length + ')'"
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

    <!-- Bulk Submit Compliance Section: ONLY in Hierarchical Mode when Head Department User must submit to CO -->
    <div class="mt-4 mb-5" *ngIf="!isDirectSubDeptAssignment() && isHeadDepartmentUser() && assignmentStatus() !== 'COMPLETED' && assignmentStatus() !== 'REVIEW_PENDING' && !isReviewer()" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
      
      <!-- Rejection / Pending Guidance Alert Banner for Head -->
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
              You have rejected {{ rejectedSubDeptTasksCount() }} task(s). The Sub-Department must re-submit their compliance and you must accept it before you can submit the assignment to CO.
            </ng-container>
            <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() > 0">
              Please review each task card above and click <strong>"Accept"</strong> (or "Reject" if changes are needed). All delegated tasks must be accepted by Head Department before submitting to CO.
            </ng-container>
            <ng-container *ngIf="rejectedSubDeptTasksCount() === 0 && pendingHeadAcceptanceCount() === 0">
              Ensure all direct and delegated checklist items are completed before submitting to CO.
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Submit Compliance Button -->
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <p-button
          label="Submit Compliance"
          icon="pi pi-send"
          severity="primary"
          [disabled]="!allTasksApprovedByHead() || submitting"
          [pTooltip]="!allTasksApprovedByHead() ? 'Cannot submit to CO until all tasks are completed and accepted by Head Department' : 'Submit completed compliance to CO'"
          [loading]="submitting"
          loadingIcon="pi pi-spinner pi-spin"
          (click)="submitAllCompliance()" />
      </div>
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

    <div *ngIf="taskGroups().length === 0" class="glass-panel text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">
      No compliance tasks found for this assignment.
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
            <div *ngFor="let ev of selectedTaskForChain.evidence_history" 
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
                  <i class="pi pi-file-pdf" style="font-size: 0.95rem;"></i> 
                  <span>{{ ev.file_name || 'View Evidence PDF' }}</span>
                </a>
                
                <a [href]="ev.file_url" target="_blank" 
                   class="p-button p-button-sm p-button-outlined p-button-danger"
                   style="text-decoration: none; padding: 0.2rem 0.55rem; font-size: 0.7rem; height: 1.65rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i class="pi pi-external-link"></i> Open PDF
                </a>
              </div>

            </div>
          </div>
        </div>

        <!-- Visual Remark Chain Timeline in Dialog (shown only in REMARK mode) -->
        <div *ngIf="historyDialogMode === 'REMARK' && hasRemarksHistory(selectedTaskForChain)" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #f1f5f9; padding: 0.5rem 0.75rem; font-size: 0.78rem; font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between;">
            <span style="display: flex; align-items: center; gap: 0.4rem;">
              <i class="pi pi-comments text-indigo-600"></i> Remark Chain Timeline ({{ selectedTaskForChain.remarks_history.length }})
            </span>
            <span style="font-size: 0.68rem; color: #6b7280; font-weight: 500;">Role Chain: Department &rarr; CO &rarr; CCO</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; max-height: 320px; overflow-y: auto; background: #fafafa;">
            <div *ngFor="let h of selectedTaskForChain.remarks_history; let last = last" 
                 style="position: relative; padding-left: 1.75rem; text-align: left;">
                 
              <!-- Vertical Connector Line -->
              <div *ngIf="!last" style="position: absolute; left: 0.5rem; top: 1.25rem; bottom: -0.75rem; width: 2px; background: #cbd5e1;"></div>
              
              <!-- Node Icon Bullet -->
              <div [ngClass]="{
                     'bg-purple-600 text-white': (h.role || '').toUpperCase() === 'CCO',
                     'bg-amber-500 text-white': (h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER',
                     'bg-indigo-600 text-white': (h.role || '').toUpperCase() === 'COMPLIER' || (h.role || '').toUpperCase() === 'DEPARTMENT' || (h.role || '').toUpperCase() === 'BRANCH'
                   }" 
                   style="position: absolute; left: 0; top: 0.15rem; width: 1.1rem; height: 1.1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                <i [class]="(h.role || '').toUpperCase() === 'CCO' ? 'pi pi-verified' : ((h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER' ? 'pi pi-shield' : 'pi pi-user')"></i>
              </div>

              <!-- Node Content Card -->
              <div [ngClass]="{
                     'bg-purple-50/70 border-purple-200': (h.role || '').toUpperCase() === 'CCO',
                     'bg-amber-50/70 border-amber-200': (h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER',
                     'bg-indigo-50/70 border-indigo-200': (h.role || '').toUpperCase() === 'COMPLIER' || (h.role || '').toUpperCase() === 'DEPARTMENT' || (h.role || '').toUpperCase() === 'BRANCH'
                   }"
                   style="padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid; font-size: 0.78rem;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.25rem;">
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: #111827;">{{ h.username }}</span>
                    <span [ngClass]="{
                            'bg-purple-200 text-purple-800': (h.role || '').toUpperCase() === 'CCO',
                            'bg-amber-200 text-amber-800': (h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER',
                            'bg-indigo-200 text-indigo-800': (h.role || '').toUpperCase() === 'COMPLIER' || (h.role || '').toUpperCase() === 'DEPARTMENT' || (h.role || '').toUpperCase() === 'BRANCH'
                          }"
                          style="font-size: 0.65rem; padding: 0.1rem 0.45rem; border-radius: 9999px; font-weight: 700; text-transform: uppercase;">
                      {{ (h.role || '').toUpperCase() === 'CCO' ? 'CCO' : ((h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER' ? 'CO Reviewer' : 'Department/Branch') }}
                    </span>
                  </div>
                  
                  <span style="font-size: 0.68rem; color: #6b7280; font-weight: 500;">
                    <i class="pi pi-clock" style="font-size: 0.65rem; margin-right: 0.15rem;"></i> {{ h.created_at | date:'dd-MM-yyyy HH:mm' }}
                  </span>
                </div>

                <p style="margin: 0; font-weight: 500; line-height: 1.4; color: #1f2937;">
                  {{ h.remark }}
                </p>
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
            <input type="file" (change)="onFileSelected($event, activeEvidenceTaskId)" accept="application/pdf" style="display: none;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
              <i class="pi pi-desktop"></i>
            </div>
            <span style="font-size: 0.95rem; font-weight: 700; color: #1e1b4b;">Upload from PC</span>
            <span style="font-size: 0.75rem; color: #64748b; line-height: 1.4;">Browse and upload a new PDF file from your local storage</span>
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
              <i class="pi pi-building" style="font-size: 0.7rem;"></i> {{ branchName() || 'Department' }} Evidences
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
          <p style="font-size: 0.75rem; color: #64748b; margin: 0 0 0.75rem 0;">You can upload a fresh PDF from your computer.</p>
          <button pButton label="Back to Source Selection" icon="pi pi-arrow-left" size="small" [outlined]="true" (click)="evidenceSourceStep = 'CHOOSE_SOURCE'"></button>
        </div>

        <!-- List of Previous Evidence Items -->
        <div *ngIf="!loadingDeptEvidences && filteredDeptEvidences.length > 0" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 340px; overflow-y: auto; padding-right: 0.25rem;">
          <div *ngFor="let item of filteredDeptEvidences" 
               style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.85rem; transition: all 0.15s;">
            <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
              <i class="pi pi-file-pdf" style="font-size: 1.35rem; color: #dc2626; flex-shrink: 0;"></i>
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
              <a *ngIf="item.url" [href]="item.url" target="_blank" 
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
            <i class="pi pi-file-pdf" style="font-size: 2rem; color: #dc2626;"></i>
            <div style="display: flex; flex-direction: column; gap: 0.15rem;">
              <span style="font-size: 0.82rem; font-weight: 700; color: #1e293b;">Selected File: {{ originalFileName }}</span>
              <span style="font-size: 0.72rem; color: #64748b;" *ngIf="stagedFile">
                Size: {{ (stagedFile.size / 1024).toFixed(1) }} KB &bull; PDF Document
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
    
    <div style="height: 4rem;"></div> <!-- bottom padding spacing -->
  `,
})
export class AssignmentDetailsComponent implements OnInit {
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

  loadDepartmentPreviousEvidences() {
    const currentBranchName = (this.branchName() || '').toLowerCase().trim();
    
    this.loadingDeptEvidences = true;
    
    // Collect from current loaded tasks history
    const taskEvidences: any[] = [];
    (this.tasks() || []).forEach(t => {
      if (t.evidence_history && Array.isArray(t.evidence_history)) {
        t.evidence_history.forEach((eh: any) => {
          if (eh.file_url) {
            taskEvidences.push({
              name: eh.file_name || eh.filename || 'Task Evidence Document.pdf',
              url: eh.file_url,
              date: eh.uploaded_at || eh.created_at,
              source: `Task: ${t.task_title ? (t.task_title.substring(0, 45) + '...') : 'Compliance Task'}`,
              type: 'TASK_EVIDENCE'
            });
          }
        });
      } else if (t.evidence_url) {
        taskEvidences.push({
          name: t.evidence_file_name || 'Task Evidence Document.pdf',
          url: t.evidence_url,
          date: t.updated_at || t.created_at,
          source: `Task: ${t.task_title ? (t.task_title.substring(0, 45) + '...') : 'Compliance Task'}`,
          type: 'TASK_EVIDENCE'
        });
      }
    });

    // Also fetch from Document Master for this department
    this.api.getDocuments().subscribe({
      next: (docs) => {
        const deptDocs = (docs || [])
          .filter(d => {
            if (!d.file_url) return false;
            if (currentBranchName && d.department_name && d.department_name.toLowerCase().trim() === currentBranchName) return true;
            return false;
          })
          .map(d => ({
            name: d.file_name || d.document_name,
            url: d.file_url,
            date: d.created_at || d.issue_date,
            source: `Document Master (${d.document_name})`,
            type: 'DOC_MASTER'
          }));

        // Deduplicate by URL
        const combined = [...taskEvidences, ...deptDocs];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
        this.deptPreviousEvidences.set(unique);
        this.loadingDeptEvidences = false;
      },
      error: () => {
        this.deptPreviousEvidences.set(taskEvidences);
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

    fetch(item.url)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], item.name, { type: blob.type || 'application/pdf' });
        this.selectedFilesMap.update(map => ({ ...map, [taskId]: file }));
        this.notification.success(`Attached "${item.name}" from department evidence repository.`);
        this.displayEvidenceSourceModal = false;
      })
      .catch(() => {
        const file = new File([new Blob()], item.name, { type: 'application/pdf' });
        this.selectedFilesMap.update(map => ({ ...map, [taskId]: file }));
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
  isInternalTaskSet = computed(() => (this.taskSetType() || '').toUpperCase() === 'INTERNAL');
  proposedTimeline = signal<string>('');
  frequency = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  circularReferenceNo = signal<string>('');
  circularTitle = signal<string>('');
  authorityName = signal<string>('');

  readonly frequencyMap: Record<string, string> = {
    '1': 'Fortnight',
    '2': 'Monthly',
    '3': 'Quarterly',
    '4': 'Semi-Annually',
    '5': 'Yearly',
    '6': '1 Time Use'
  };

  submitting = false;

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
  selectedFilesMap = signal<Record<number, File>>({});
  rowSavingMap = signal<Record<number, boolean>>({});
  headerSavingMap = new Map<string, boolean>();

  // Sub-departments available for delegation
  availableSubDepts = signal<{ label: string, value: number | null }[]>([]);
  bulkSelectedSubDeptId: number | null = null;
  bulkAssigning: boolean = false;

  auth = inject(AuthService);
  currentUser = computed(() => this.auth.currentUser());
  userBranchId = computed(() => {
    const u = this.currentUser();
    return u?.branch_id ?? u?.branchId ?? null;
  });
  isSubDepartmentUser = signal<boolean>(false);
  isHeadDepartmentUser = computed(() => {
    const role = (this.userRole() || '').toLowerCase();
    if (role === 'admin') return true;
    if (role === 'co' || role === 'cco') return false;
    return !this.isSubDepartmentUser();
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
  pendingHeadAcceptanceCount = computed(() => this.tasks().filter(t => !!t.sub_dept_id && (t.remarks?.trim() || t.has_evidence || t.status === 'COMPLETED') && t.review_status !== 'APPROVED' && t.review_status !== 'NEEDS_REDO').length);

  isTimelineMode(): boolean {
    if (this.isInternalTaskSet()) {
      return false; // Direct compliance mode for Internal task sets
    }
    const status = this.assignmentStatus();
    return status === 'Pending_Timeline' || status === 'Timeline_Review';
  }

  completedCount = computed(() => {
    if (this.isTimelineMode()) {
      return this.tasks().filter(t => t.proposed_due_date !== null && t.proposed_due_date !== undefined && t.proposed_due_date !== '').length;
    }
    return this.tasks().filter(t => t.compliance_status === 'COMPLIED' || t.compliance_status === 'NOT_COMPLIED').length;
  });
  progressPercentage = computed(() => this.tasks().length ? Math.round((this.completedCount() / this.tasks().length) * 100) : 0);

  canEditAssignment(): boolean {
    const status = this.assignmentStatus().toUpperCase();
    if (status === 'REVIEW_PENDING' || status === 'COMPLETED') {
      return false;
    }
    if (this.isInternalTaskSet()) {
      return status === 'PENDING_TIMELINE' || status === 'IN_PROGRESS' || status === 'REJECTED' || status === 'PENDING_RECOMPLIANCE' || status === 'ESCALATED_TO_CCO';
    }
    const hasNeedsRedoTask = this.tasks().some(t => t.review_status === 'NEEDS_REDO');
    return status === 'IN_PROGRESS' || status === 'REJECTED' || status === 'PENDING_RECOMPLIANCE' || status === 'ESCALATED_TO_CCO' || hasNeedsRedoTask;
  }

  canEditTaskAssignment(task: any): boolean {
    const status = this.assignmentStatus().toUpperCase();

    // When submitted for review or completed, lock all tasks
    if (status === 'REVIEW_PENDING' || status === 'COMPLETED') {
      return false;
    }

    // If reviewer explicitly accepted or escalated this single task point, hide Save Task button & lock inputs for this task
    if (task?.review_status === 'APPROVED' || task?.review_status === 'ESCALATED') {
      return false;
    }

    // If user is a Sub-Department user, they can only edit tasks assigned to their sub-department
    if (this.isSubDepartmentUser()) {
      return String(task?.sub_dept_id) === String(this.userBranchId());
    }

    // If user is a Head Department user, they only edit direct tasks (sub_dept_id === null)
    if (task?.sub_dept_id) {
      return false; // Delegated tasks are completed by sub-department and approved/rejected by head
    }

    if (this.isInternalTaskSet()) {
      return status === 'PENDING_TIMELINE' || status === 'IN_PROGRESS' || status === 'ESCALATED_TO_CCO' || status === 'REJECTED' || status === 'PENDING_RECOMPLIANCE';
    }

    // In compliance phase, enable unaccepted/unsaved task remarks & attachments
    return status === 'IN_PROGRESS' || status === 'ESCALATED_TO_CCO' || status === 'REJECTED' || status === 'PENDING_RECOMPLIANCE';
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
      this.api.getAssignmentTasks(this.assignmentId).subscribe({
        next: (data) => {
          console.log('API Response data received:', data);

          // Map backend tasks to hold temporary form values while preserving unsaved user input
          const currentTasksMap = new Map<number, any>();
          (this.tasks() || []).forEach(ct => {
            if (ct && ct.assignment_task_id) {
              currentTasksMap.set(ct.assignment_task_id, ct);
            }
          });

          const mappedTasks = data.map(t => {
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

            return {
              ...t,
              temp_compliance_status: preservedComplianceStatus,
              temp_remarks: preservedRemarks,
              temp_proposed_due_date: preservedProposedDate,
              temp_proposed_due_date_obj: preservedProposedDateObj,
              temp_proposed_remark: preservedProposedRemark,
              temp_timeline_review_remark: preservedTimelineReviewRemark,
              has_evidence: false,
              evidence_url: '',
              remarks_history: []
            };
          });

          // Fetch evidence urls linked to this assignment
          this.api.getAssignmentEvidence(this.assignmentId!).subscribe({
            next: (evidenceList) => {
              mappedTasks.forEach(task => {
                const evidences = evidenceList.filter(e => e.assignment_task_id === task.assignment_task_id || e.task_id === task.task_id);
                task.evidence_history = evidences.map(e => {
                  let fileName = 'Evidence Document.pdf';
                  if (e.file_url) {
                    const parts = e.file_url.split('/');
                    const lastPart = parts[parts.length - 1];
                    fileName = decodeURIComponent(lastPart.split('?')[0]);
                    fileName = fileName.replace(/^\d{10,14}-/, '');
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

              // Fetch remarks history in parallel
              let completedCount = 0;
              if (mappedTasks.length === 0) {
                this.tasks.set(mappedTasks);
                this.groupTasks();
                return;
              }

              mappedTasks.forEach(task => {
                this.api.getTaskRemarksHistory(this.assignmentId!, task.assignment_task_id).subscribe({
                  next: (history) => {
                    const historyList = history || [];
                    const reviewRemarkText = task.assignment_review_remark || task.review_remark;
                    if (reviewRemarkText && reviewRemarkText.trim()) {
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
                      this.populateMetadata(mappedTasks);
                      this.groupTasks();
                    }
                  },
                  error: (err) => {
                    console.error('Failed to load remarks history for task:', task.assignment_task_id, err);
                    completedCount++;
                    if (completedCount === mappedTasks.length) {
                      this.tasks.set(mappedTasks);
                      this.populateMetadata(mappedTasks);
                      this.groupTasks();
                    }
                  }
                });
              });
            },
            error: (err) => {
              console.error('Failed to load assignment evidence:', err);
              this.tasks.set(mappedTasks);
              this.populateMetadata(mappedTasks);
              this.groupTasks();
            }
          });
        },
        error: (err) => {
          console.error('API Error fetching tasks:', err);
          this.notification.error('Failed to load assignment tasks: ' + (err.message || err.statusText));
        }
      });
    }
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
        const userBId = this.userBranchId();
        if (userBId) {
          const userBranch = branches.find(b => String(b.id) === String(userBId));
          if (userBranch && userBranch.parent_id) {
            this.isSubDepartmentUser.set(true);
          } else {
            this.isSubDepartmentUser.set(false);
          }
        } else {
          this.isSubDepartmentUser.set(false);
        }

        const current = branches.find(b => 
          (branchId && String(b.id) === String(branchId)) ||
          ((b.name || '').trim().toLowerCase() === (branchName || '').trim().toLowerCase())
        );
        if (current) {
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
    this.api.reviewTaskStatus(this.assignmentId, task.assignment_task_id, 'APPROVED', '').subscribe({
      next: () => {
        task.review_status = 'APPROVED';
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
    this.headRejectionRemark.set('');
  }

  cancelHeadRejectBox() {
    this.rejectingTaskId.set(null);
    this.headRejectionRemark.set('');
  }

  headRejectSubDeptTask(task: any) {
    const remark = this.headRejectionRemark().trim();
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
        // Ensure assignment status is set back to IN_PROGRESS so sub-department can re-comply
        this.api.updateAssignmentStatus(this.assignmentId!, 'IN_PROGRESS').subscribe({
          next: () => {
            this.assignmentStatus.set('IN_PROGRESS');
            this.notification.warn(`Task rejected & sent back to ${task.sub_dept_name || 'Sub-Department'} for re-compliance.`);
            this.loadTasks();
          },
          error: () => {
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

    this.tasks().forEach(task => {
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
    return !!(task.remarks_history && task.remarks_history.length > 0);
  }

  hasEvidenceHistory(task: any): boolean {
    return !!(task.evidence_history && task.evidence_history.length > 0);
  }

  hasReviewerRemarks(task: any): boolean {
    if (!task.remarks_history || task.remarks_history.length === 0) return false;
    return task.remarks_history.some((h: any) => h.role === 'REVIEWER');
  }

  goBack() {
    this.router.navigate(['/assignments']);
  }

  onFileSelected(event: any, assignmentTaskId: number | null) {
    if (!assignmentTaskId) return;
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        this.notification.warn('Only PDF files are accepted as compliance evidence.');
        return;
      }
      this.stagedFile = file;
      this.originalFileName = file.name;
      this.customDocName = file.name;
      this.activeEvidenceTaskId = assignmentTaskId;
      this.evidenceSourceStep = 'RENAME_CONFIRM';
      this.displayEvidenceSourceModal = true;
      event.target.value = '';
    }
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
    if (!finalName) {
      finalName = this.originalFileName || 'evidence.pdf';
    }
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName = finalName + '.pdf';
    }

    const renamedFile = new File([this.stagedFile], finalName, { type: this.stagedFile.type || 'application/pdf' });
    this.selectedFilesMap.update(map => ({ ...map, [taskId]: renamedFile }));
    this.notification.success(`Evidence PDF "${finalName}" selected.`);
    this.stagedFile = null;
    this.displayEvidenceSourceModal = false;
  }

  getSelectedFileName(assignmentTaskId: number): string {
    const file = this.selectedFilesMap()[assignmentTaskId];
    return file ? file.name : '';
  }

  removeSelectedFile(assignmentTaskId: number) {
    this.selectedFilesMap.update(map => {
      const copy = { ...map };
      delete copy[assignmentTaskId];
      return copy;
    });
  }

  hasFileToView(task: any): boolean {
    const localFile = this.selectedFilesMap()[task.assignment_task_id];
    if (localFile) return true;
    if (task.evidence_url) return true;
    if (task.has_evidence && task.evidence_history && task.evidence_history.length > 0) return true;
    return false;
  }

  previewFile(task: any) {
    const localFile = this.selectedFilesMap()[task.assignment_task_id];
    if (localFile) {
      const url = URL.createObjectURL(localFile);
      window.open(url, '_blank');
      return;
    }
    if (task.evidence_url) {
      const fullUrl = this.api.resolveFileUrl(task.evidence_url);
      if (fullUrl) window.open(fullUrl, '_blank');
      return;
    }
    if (task.has_evidence && task.evidence_history && task.evidence_history.length > 0) {
      const fullUrl = this.api.resolveFileUrl(task.evidence_history[0].file_url);
      if (fullUrl) window.open(fullUrl, '_blank');
      return;
    }
  }

  // Save a single task row declaration and/or upload evidence
  async saveSingleTask(task: any, showNotification: boolean = true): Promise<boolean> {
    if (!this.assignmentId) return false;
    if (!task.temp_remarks?.trim()) {
      this.notification.warn('Remarks / Explanation is required.');
      return false;
    }

    const taskId = task.assignment_task_id;
    this.rowSavingMap.update(map => ({ ...map, [taskId]: true }));

    const clearRejectionIfAny = () => {
      if (task.review_status === 'NEEDS_REDO') {
        this.api.reviewTaskStatus(this.assignmentId!, taskId, null as any, '').subscribe({
          next: () => {},
          error: (err) => console.warn('Could not clear review_status flag:', err)
        });
      }
    };

    const checkDirectAutoSubmit = () => {
      if (this.isDirectSubDeptAssignment() && this.assignmentId) {
        const currentTasks = this.tasks();
        const otherIncomplete = currentTasks.filter(t => t.assignment_task_id !== taskId && !t.remarks?.trim() && !t.has_evidence && t.status !== 'COMPLETED');
        if (otherIncomplete.length === 0) {
          this.api.updateAssignmentStatus(this.assignmentId, 'REVIEW_PENDING').subscribe({
            next: () => {
              this.notification.success('All department tasks completed! Submissions routed directly to CO Review Queue.');
              this.loadTasks();
            },
            error: (err) => console.warn('Could not auto-submit assignment to review:', err)
          });
        }
      }
    };

    return new Promise((resolve) => {
      const file = this.selectedFilesMap()[taskId];

      if (file) {
        // 1. Submit with evidence file upload
        const formData = new FormData();
        formData.append('files', file);
        formData.append('remark', task.temp_remarks);
        formData.append('compliance_status', task.temp_compliance_status || 'COMPLIED');

        this.api.uploadTaskEvidence(this.assignmentId!, taskId, formData)
          .subscribe({
            next: () => {
              clearRejectionIfAny();
              setTimeout(() => {
                this.selectedFilesMap.update(map => {
                  const copy = { ...map };
                  delete copy[taskId];
                  return copy;
                });
                this.rowSavingMap.update(map => ({ ...map, [taskId]: false }));
                this.loadTasks();
                if (showNotification) {
                  this.notification.success('Task compliance and evidence saved successfully!');
                }
                checkDirectAutoSubmit();
                resolve(true);
              });
            },
            error: (err) => {
              console.error(err);
              setTimeout(() => {
                this.rowSavingMap.update(map => ({ ...map, [taskId]: false }));
                this.notification.error('Failed to upload evidence document: ' + (err.message || err.statusText));
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
                this.rowSavingMap.update(map => ({ ...map, [taskId]: false }));
                this.loadTasks();
                if (showNotification) {
                  this.notification.success('Task compliance saved successfully!');
                }
                checkDirectAutoSubmit();
                resolve(true);
              });
            },
            error: (err) => {
              console.error(err);
              setTimeout(() => {
                this.rowSavingMap.update(map => ({ ...map, [taskId]: false }));
                this.notification.error('Failed to save task compliance: ' + (err.message || err.statusText));
                resolve(false);
              });
            }
          });
      }
    });
  }

  // Bulk submit all compliance tasks by Head Department to CO
  async submitAllCompliance() {
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
            this.notification.warn(`Please review and accept the compliance submitted by ${t.sub_dept_name || 'Sub-Department'} for task "${t.description?.slice(0, 35)}..." before submitting to CO.`);
            return;
          }
        } else {
          if (!t.remarks?.trim() && !t.temp_remarks?.trim()) {
            this.notification.warn(`Direct task "${t.description?.slice(0, 35)}..." requires remarks before submitting.`);
            return;
          }
        }
      }
    }

    const tasksToSaveDirectly = allTasks.filter(t => !t.sub_dept_id && this.canEditTaskAssignment(t));
    if (tasksToSaveDirectly.length > 0) {
      this.submitting = true;
      const results = await Promise.all(tasksToSaveDirectly.map(t => this.saveSingleTask(t, false)));
      const allSuccessful = results.every(res => res === true);
      if (!allSuccessful) {
        this.submitting = false;
        this.notification.error('Some checklist items failed to save. Please review and try again.');
        return;
      }
    }

    this.submitting = true;
    console.log(`Submitting compliance declarations for assignmentId: ${this.assignmentId} to CO...`);

    this.api.updateAssignmentStatus(this.assignmentId, 'REVIEW_PENDING').subscribe({
      next: () => {
        this.submitting = false;
        this.notification.success('Compliance checklist successfully submitted to CO Review Queue!');
        this.loadTasks(); // Reload to refresh status and lock controls
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.notification.error('Failed to submit assignment to CO: ' + (err.message || err.statusText));
      }
    });
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
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
