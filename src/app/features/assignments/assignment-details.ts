import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-assignment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, Textarea, TagModule, TooltipModule, DatePickerModule, DialogModule],
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

    <!-- Task Headers Groups -->
    <ng-container *ngFor="let group of taskGroups()">
      <div class="text-white font-bold px-4 py-2 mt-4 rounded-t-xl" 
           style="background-color: #0f2942; text-transform: uppercase; font-size: 0.825rem; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center;">
        <span>Compliance</span>
        <span class="text-xs opacity-90">{{ group.tasks.length }} Tasks</span>
      </div>

      <div class="glass-panel mb-4 bg-white rounded-b-xl rounded-t-none border border-gray-100 overflow-hidden shadow-sm"
           style="border-top: 0; padding: 0.5rem 1.25rem 0.75rem 1.25rem;">
        
        <div class="border-b border-gray-100 pb-1.5 mb-2">
          <h2 class="text-xs font-bold text-gray-500 m-0 uppercase tracking-wider" style="font-size: 0.725rem; letter-spacing: 0.05em; color: #4b5563;">
            HEADER: {{ group.headerName === 'Uncategorized' ? 'GENERAL TASK' : group.headerName }}
          </h2>
        </div>
        
        <div class="flex flex-column" style="padding: 0;">
          <div *ngFor="let t of group.tasks; trackBy: trackByTaskId; let i = index" 
               class="question-card"
               [ngClass]="{
                 'border-left-green': t.status === 'COMPLETED' && t.compliance_status === 'COMPLIED',
                 'border-left-red': t.status === 'COMPLETED' && t.compliance_status === 'NOT_COMPLIED',
                 'border-left-yellow': t.status === 'PENDING'
               }">
            
            <!-- Left Column: Serial Number & Task Info -->
            <div class="question-main">
              <div class="question-number">
                {{ i + 1 }}
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block" style="font-size: 0.65rem; letter-spacing: 0.05em;">
                    {{ t.circular_title }}
                  </span>
                  <span *ngIf="t.sub_dept_name" style="padding: 0.15rem 0.55rem; background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i class="pi pi-users" style="font-size: 0.65rem;"></i> Sub-Dept: {{ t.sub_dept_name }}
                  </span>
                  <span *ngIf="t.review_status === 'APPROVED'" style="padding: 0.15rem 0.55rem; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i class="pi pi-check-circle" style="font-size: 0.65rem;"></i> Accepted
                  </span>
                  <span *ngIf="t.review_status === 'NEEDS_REDO'" style="padding: 0.15rem 0.55rem; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i class="pi pi-times-circle" style="font-size: 0.65rem;"></i> Rejected
                  </span>
                  <span *ngIf="t.review_status === 'ESCALATED'" style="padding: 0.15rem 0.55rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i class="pi pi-exclamation-triangle" style="font-size: 0.65rem;"></i> Escalated to CCO
                  </span>
                </div>
                <p class="font-semibold text-gray-800 m-0" style="line-height: 1.45; font-size: 0.95rem;">
                  {{ t.description }}
                </p>

                <!-- Task Attachment Download Link -->
                <div *ngIf="t.file_url" class="mt-2" style="margin-top: 0.5rem;">
                  <a [href]="getFileUrl(t.file_url)" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-semibold border border-indigo-200 no-underline transition-colors" title="Download Task Attachment" style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.6rem; background-color: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 6px; text-decoration: none; font-size: 0.75rem; font-weight: 600;">
                    <i class="pi pi-file text-indigo-500"></i>
                    <span>Attached Task Document</span>
                    <i class="pi pi-download text-xs text-indigo-400" style="margin-left: 0.25rem;"></i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Right Column: Answer Form or Timeline Proposing -->
            <div class="answer-form" *ngIf="isTimelineMode(); else complianceForm" style="display: flex; flex-direction: column; align-items: stretch; justify-content: center; width: 100%;">
              
              <!-- If Branch is proposing/editing timeline -->
              <ng-container *ngIf="!isReviewer()">
                <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 100%; min-width: 250px;">
                  <div class="flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between;">
                    <label class="control-label font-bold text-gray-700" style="font-size: 0.75rem;">{{ getTimelineLabel() }}</label>
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
                  
                  <div class="text-xs text-gray-500 font-medium mt-1" *ngIf="t.due_date">
                    Default Task Due Date: <strong class="text-gray-700">{{ t.due_date | date:'dd-MM-yyyy' }}</strong>
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
                  <div class="text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-100 p-2 rounded mt-1" *ngIf="!canEditTimeline() && t.proposed_remark">
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
                  <div class="text-xs text-indigo-700 font-medium bg-indigo-50 border border-indigo-100 p-2 rounded" *ngIf="t.proposed_remark">
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
              <div class="answer-form" style="display: flex; flex-direction: column; align-items: stretch; justify-content: center; width: 100%;">
                <div class="text-xs text-gray-500 font-bold mb-2 flex items-center gap-1" style="font-size: 0.75rem; width: 100%; display: flex; align-items: center;">
                  <i class="pi pi-calendar-times text-indigo-500"></i> Task Due Date: 
                  <span class="text-gray-900 font-extrabold">{{ (t.due_date ? (t.due_date | date:'dd/MM/yyyy') : (proposedTimeline() | date:'dd/MM/yyyy')) }}</span>
                </div>

                <!-- Sub-Department Delegation Control (Shown when sub-departments exist) -->
                <div *ngIf="availableSubDepts().length > 1 && !isReviewer() && assignmentStatus() !== 'COMPLETED'" class="mb-3 p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg flex items-center justify-between gap-2" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.4rem 0.65rem; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px;">
                  <span class="text-xs font-bold text-indigo-900 flex items-center gap-1" style="font-size: 0.75rem; font-weight: 700; color: #3730a3; display: flex; align-items: center; gap: 0.35rem;">
                    <i class="pi pi-sitemap text-indigo-600"></i> Mode / Assignee:
                  </span>
                  <p-select 
                    [options]="availableSubDepts()" 
                    [ngModel]="t.sub_dept_id || null" 
                    (ngModelChange)="onTaskSubDeptChange(t, $event)"
                    optionLabel="label" 
                    optionValue="value" 
                    placeholder="Select Assignee"
                    styleClass="h-2rem text-xs font-semibold"
                    appendTo="body">
                  </p-select>
                </div>

                <!-- Per-Task Review Status Banner for Department View -->
                <div *ngIf="t.review_status" class="mb-2 w-full">
                  <div *ngIf="t.review_status === 'APPROVED'" style="padding: 0.5rem 0.75rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 0.75rem; color: #166534; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
                      <i class="pi pi-check-circle text-green-600"></i>
                      <span>Approved by Reviewer (No Re-compliance Needed)</span>
                    </span>
                    <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: #dcfce7; color: #15803d; padding: 0.15rem 0.5rem; border-radius: 4px;">Accepted</span>
                  </div>

                  <div *ngIf="t.review_status === 'NEEDS_REDO'" style="padding: 0.5rem 0.75rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; font-size: 0.75rem; color: #991b1b; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600;">
                      <span style="display: flex; align-items: center; gap: 0.35rem;">
                        <i class="pi pi-exclamation-circle text-red-600"></i>
                        <span>Needs Re-compliance</span>
                      </span>
                      <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; background: #fee2e2; color: #b91c1c; padding: 0.15rem 0.5rem; border-radius: 4px;">Rejected</span>
                    </div>
                    <div *ngIf="t.review_remark" style="font-size: 0.725rem; font-weight: 500; color: #7f1d1d; margin-top: 0.25rem;">
                      <strong>Reviewer Feedback:</strong> "{{ t.review_remark }}"
                    </div>
                  </div>

                  <div *ngIf="t.review_status === 'ESCALATED'" style="padding: 0.5rem 0.75rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 0.75rem; color: #92400e; margin-bottom: 0.5rem;">
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

                <!-- Compliance block for task -->
                <ng-container>
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
                    <div class="mt-1.5" *ngIf="t.has_evidence && t.evidence_url">
                      <a [href]="t.evidence_url" target="_blank" class="evidence-link">
                        <i class="pi pi-file-pdf" style="color: #ef4444;"></i> View PDF
                      </a>
                    </div>
                  </div>

                  <!-- Active compliance form (during In_Progress or review) -->
                  <ng-template #activeComplianceForm>
                    <div class="answer-form-grid">
                      
                      <!-- Left Sub-column: Upload PDF & Save Button -->
                      <div class="answer-field" style="display: flex; flex-direction: column; gap: 0.5rem;">

                        <!-- Upload PDF Button (Full Width) -->
                        <div *ngIf="canEditTaskAssignment(t)">
                          <label class="upload-btn cursor-pointer"
                                 [ngClass]="{'upload-btn-attached': getSelectedFileName(t.assignment_task_id)}">
                            <input type="file" 
                                   (change)="onFileSelected($event, t.assignment_task_id)" 
                                   accept="application/pdf" 
                                   class="hidden">
                            <i class="pi pi-upload mr-1"></i> 
                            {{ getSelectedFileName(t.assignment_task_id) ? 'Change PDF' : 'Upload PDF' }}
                          </label>
                        </div>

                        <!-- View PDF link -->
                        <div style="display: flex; justify-content: space-between; align-items: center; min-height: 1.25rem; margin-top: -0.15rem; margin-bottom: -0.15rem;">
                          <div>
                            <a *ngIf="t.has_evidence && t.evidence_url"
                               [href]="t.evidence_url"
                               target="_blank"
                               class="evidence-link">
                              <i class="pi pi-file-pdf" style="color: #ef4444;"></i> View PDF
                            </a>
                          </div>
                          <small *ngIf="getSelectedFileName(t.assignment_task_id)"
                                 class="text-indigo-600 font-medium"
                                 style="font-size: 0.65rem;"
                                 [pTooltip]="getSelectedFileName(t.assignment_task_id)">
                            Attached: {{ getSelectedFileName(t.assignment_task_id) | slice:0:18 }}…
                          </small>
                        </div>

                        <!-- Save Row button -->
                        <p-button *ngIf="canEditTaskAssignment(t)"
                                  label="Save Task"
                                  [loading]="!!rowSavingMap()[t.assignment_task_id]"
                                  loadingIcon="pi pi-spinner pi-spin"
                                  icon="pi pi-save"
                                  iconPos="left"
                                  [disabled]="rowSavingMap()[t.assignment_task_id] || !t.temp_remarks?.trim()"
                                  (click)="saveSingleTask(t)"
                                  styleClass="w-full save-row-btn"
                                  size="small" />
                      </div>

                      <!-- Right Sub-column: Remarks textarea -->
                      <div class="answer-field" style="display: flex; flex-direction: column; height: 100%;">
                        <label class="control-label">Remarks / Explanation <span class="text-red-500">*</span></label>
                        <textarea pTextarea
                                  [(ngModel)]="t.temp_remarks"
                                  [disabled]="!canEditTaskAssignment(t)"
                                  class="answer-control"
                                  style="flex: 1; resize: none; min-height: 3.8rem; height: 3.8rem;"
                                  placeholder="Add compliance remarks or explanation..."></textarea>
                      </div>

                    </div>
                  </ng-template>
                </ng-container>                <!-- History Action Trigger Buttons (Modal Overlay to maintain uniform card height) -->
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                  <button *ngIf="hasRemarksHistory(t)"
                          type="button"
                          pButton
                          icon="pi pi-comments"
                          [label]="'Remark Chain (' + t.remarks_history.length + ')'"
                          class="p-button-outlined p-button-sm p-button-secondary"
                          (click)="openRemarkChainDialog(t)"
                          style="font-size: 0.725rem; padding: 0.3rem 0.6rem;">
                  </button>

                  <button *ngIf="hasEvidenceHistory(t)"
                          type="button"
                          pButton
                          icon="pi pi-paperclip"
                          [label]="'Evidence History (' + t.evidence_history.length + ')'"
                          class="p-button-outlined p-button-sm p-button-info"
                          (click)="openRemarkChainDialog(t)"
                          style="font-size: 0.725rem; padding: 0.3rem 0.6rem;">
                  </button>
                </div>

              </div>
            </ng-template>

          </div>
        </div>
      </div>
    </ng-container>

    <!-- Bulk Submit Compliance Button -->
    <div class="flex justify-content-center mt-4 mb-5" *ngIf="canEditAssignment()" style="display: flex; justify-content: center;">
      <p-button
        label="Submit Compliance"
        icon="pi pi-send"
        severity="primary"
        [loading]="submitting"
        loadingIcon="pi pi-spinner pi-spin"
        (click)="submitAllCompliance()" />
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
              [header]="'Compliance Interaction History - Task #' + (selectedTaskForChain?.assignment_task_id || '')" 
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

        <!-- Evidence History Section in Dialog -->
        <div *ngIf="hasEvidenceHistory(selectedTaskForChain)" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #f1f5f9; padding: 0.5rem 0.75rem; font-size: 0.78rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.4rem;">
            <i class="pi pi-paperclip text-indigo-600"></i> Evidence Upload History ({{ selectedTaskForChain.evidence_history.length }})
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; max-height: 180px; overflow-y: auto; background: #ffffff;">
            <div *ngFor="let ev of selectedTaskForChain.evidence_history" style="padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                <a [href]="ev.file_url" target="_blank" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; color: #0f2942; text-decoration: none;">
                  <i class="pi pi-file-pdf text-red-500"></i> View Evidence PDF
                </a>
                <span style="font-size: 0.68rem; color: #64748b;" *ngIf="ev.submitted_at">
                  {{ ev.submitted_at | date:'dd-MM-yyyy HH:mm' }}
                </span>
              </div>
              <p style="margin: 0; font-weight: 500; color: #334155;" *ngIf="ev.remark">
                <strong>Remark:</strong> {{ ev.remark }}
              </p>
            </div>
          </div>
        </div>

        <!-- Visual Remark Chain Timeline in Dialog -->
        <div *ngIf="hasRemarksHistory(selectedTaskForChain)" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
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
    
    <div style="height: 4rem;"></div> <!-- bottom padding spacing -->
  `,
})
export class AssignmentDetailsComponent implements OnInit {
  displayRemarkChainDialog = false;
  selectedTaskForChain: any = null;

  openRemarkChainDialog(task: any) {
    this.selectedTaskForChain = task;
    this.displayRemarkChainDialog = true;
  }

  closeRemarkChainDialog() {
    this.displayRemarkChainDialog = false;
    this.selectedTaskForChain = null;
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

    if (this.isInternalTaskSet()) {
      return status === 'PENDING_TIMELINE' || status === 'IN_PROGRESS' || status === 'ESCALATED_TO_CCO' || status === 'REJECTED' || status === 'PENDING_RECOMPLIANCE';
    }

    // In compliance phase (IN_PROGRESS, ESCALATED_TO_CCO, REJECTED, PENDING_RECOMPLIANCE), enable unaccepted/unsaved task remarks & attachments
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
                task.evidence_history = evidences.map(e => ({
                  ...e,
                  file_url: this.api.getFileUrl(e.file_url)
                }));
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
      this.loadSubDepartments(first.branch_name || '');
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

  loadSubDepartments(branchName: string) {
    this.api.getBranches().subscribe({
      next: (branches) => {
        const current = branches.find(b => (b.name || '').trim().toLowerCase() === (branchName || '').trim().toLowerCase());
        if (current) {
          const childDepts = branches.filter(b => b.parent_id === current.id);
          if (childDepts.length > 0) {
            const opts = [
              { label: '🏢 Direct (Self-Compliance)', value: null },
              ...childDepts.map(sd => ({ label: '👥 ' + sd.name, value: sd.id }))
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
        const name = subDeptOpt ? subDeptOpt.label : 'Self-Compliance';
        this.notification.success(`Task assignment updated to: ${name}`);
        this.loadTasks();
      },
      error: (err) => {
        this.notification.error('Failed to delegate task: ' + (err.message || err.statusText));
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

  onFileSelected(event: any, assignmentTaskId: number) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFilesMap.update(map => ({
        ...map,
        [assignmentTaskId]: files[0]
      }));
    }
  }

  getSelectedFileName(assignmentTaskId: number): string {
    const file = this.selectedFilesMap()[assignmentTaskId];
    return file ? file.name : '';
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
              setTimeout(() => {
                this.rowSavingMap.update(map => ({ ...map, [taskId]: false }));
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
                this.rowSavingMap.update(map => ({ ...map, [taskId]: false }));
                this.notification.error('Failed to save task compliance: ' + (err.message || err.statusText));
                resolve(false);
              });
            }
          });
      }
    });
  }

  // Bulk submit all compliance tasks matching PHP monolith submission flow
  async submitAllCompliance() {
    if (!this.assignmentId) return;

    const tasksToSubmit = this.tasks().filter(t => this.canEditTaskAssignment(t));

    // 1. Validate all pending tasks are filled
    for (const t of tasksToSubmit) {
      if (!t.temp_remarks?.trim()) {
        this.notification.warn('Remarks / Explanation are required for all pending re-compliance tasks before submitting.');
        return;
      }
    }

    this.submitting = true;
    console.log(`Bulk submitting compliance declarations for assignmentId: ${this.assignmentId}...`);

    // 2. Run all save operations in parallel without individual success popups
    const results = await Promise.all(tasksToSubmit.map(t => this.saveSingleTask(t, false)));

    const allSuccessful = results.every(res => res === true);
    if (allSuccessful) {
      this.api.updateAssignmentStatus(this.assignmentId, 'REVIEW_PENDING').subscribe({
        next: () => {
          this.submitting = false;
          this.notification.success('Compliance checklist submitted successfully!');
          this.loadTasks(); // Reload to refresh status and lock controls
        },
        error: (err) => {
          this.submitting = false;
          console.error(err);
          this.notification.error('Checklist items saved, but failed to submit assignment to CCO: ' + (err.message || err.statusText));
        }
      });
    } else {
      this.submitting = false;
      this.notification.error('Some checklist items failed to save. Please review the responses and try again.');
    }
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }
}
