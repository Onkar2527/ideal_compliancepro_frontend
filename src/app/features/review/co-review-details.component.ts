import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ComplianceApiService } from "../../core/services/api/compliance-api.service";
import { NotificationService } from "../../core/services/notification/notification.service";
import { ButtonModule } from "primeng/button";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { TooltipModule } from "primeng/tooltip";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";

@Component({
  selector: "app-co-review-details",
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, TextareaModule, TooltipModule, DialogModule, InputTextModule],
  templateUrl: "./co-review-details.component.html",
  styleUrls: ["../../shared/styles/checklist-shared.css", "./co-review-details.component.css"]
})
export class CoReviewDetailsComponent implements OnInit {
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
    const currentBranchId = this.assignmentMeta()?.branch_id || this.assignmentMeta()?.department_id;
    const currentBranchName = (this.assignmentMeta()?.branch_name || '').toLowerCase().trim();
    
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
            if (currentBranchId && d.department_id && Number(d.department_id) === Number(currentBranchId)) return true;
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
  taskGroups = signal<{ headerName: string; tasks: any[] }[]>([]);
  overallRemark = "";
  submitting = false;
  lastAction: string = "";
  savingTaskId = signal<number | null>(null);
  pendingStatus: string = ""; // tracks which button triggered the loading spinner
  activeFilter = signal<string>(""); // APPROVED | NEEDS_REDO | UNREVIEWED | ''
  selectedFilesMap = signal<{ [key: number]: File }>({});

  assignmentMeta = computed(() => this.tasks()[0] ?? null);
  compliedCount = computed(() => this.tasks().filter(t => t.compliance_status === "COMPLIED").length);
  notCompliedCount = computed(() => this.tasks().filter(t => t.compliance_status === "NOT_COMPLIED").length);
  approvedCount = computed(() => this.tasks().filter(t => t.review_status === "APPROVED").length);
  needsRedoCount = computed(() => this.tasks().filter(t => t.review_status === "NEEDS_REDO").length);
  unreviewedCount = computed(() => this.tasks().filter(t => !t.review_status).length);

  isReviewActive(): boolean {
    const status = this.assignmentMeta()?.assignment_status?.toUpperCase();
    return status === 'REVIEW_PENDING' || status === 'TIMELINE_REVIEW';
  }

  getFormattedStatus(): string {
    const status = this.assignmentMeta()?.assignment_status;
    if (!status) return '—';
    return status.replace(/_/g, ' ').toUpperCase();
  }

  getStatusSeverity(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const status = this.assignmentMeta()?.assignment_status;
    switch (status) {
      case 'Pending_Timeline':
      case 'Timeline_Review':
        return 'info';
      case 'In_Progress':
      case 'PENDING_RECOMPLIANCE':
        return 'secondary';
      case 'REVIEW_PENDING':
      case 'ESCALATED_TO_CCO':
        return 'warn';
      case 'COMPLETED':
        return 'success';
      case 'REJECTED':
      case 'Overdue':
      case 'OVERDUE':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  // Filtered view for decision-summary and header chip clicks
  filteredTaskGroups = computed(() => {
    const filter = this.activeFilter();
    if (!filter) return this.taskGroups();
    return this.taskGroups().map(g => ({
      ...g,
      tasks: g.tasks.filter(t => {
        if (filter === 'COMPLIED')     return t.compliance_status === 'COMPLIED';
        if (filter === 'NOT_COMPLIED') return t.compliance_status === 'NOT_COMPLIED';
        if (filter === 'APPROVED')     return t.review_status === 'APPROVED';
        if (filter === 'NEEDS_REDO')   return t.review_status === 'NEEDS_REDO';
        if (filter === 'UNREVIEWED')   return !t.review_status;
        return true;
      })
    })).filter(g => g.tasks.length > 0);
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public api: ComplianceApiService,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get("id");
      if (id) {
        this.assignmentId = parseInt(id, 10);
        this.loadTasks();
      }
    });
  }

  loadTasks() {
    if (!this.assignmentId) return;
    this.api.getAssignmentTasks(this.assignmentId).subscribe({
      next: (data) => {
        const currentTasksMap = new Map<number, any>();
        (this.tasks() || []).forEach(ct => {
          if (ct && ct.assignment_task_id) {
            currentTasksMap.set(ct.assignment_task_id, ct);
          }
        });

        const enriched = data.map(t => {
          const existing = currentTasksMap.get(t.assignment_task_id);

          // Preserve unsaved draft review status if user changed it locally
          let preservedReviewStatus = t.review_status || null;
          if (existing && existing.review_status !== undefined && existing.review_status !== (existing.saved_review_status || null)) {
            preservedReviewStatus = existing.review_status;
          }

          // Strip system '[Accepted by Head Department]' from CO review remark box
          let cleanReviewRemark = (t.review_remark || "").trim();
          if (cleanReviewRemark === '[Accepted by Head Department]') {
            cleanReviewRemark = "";
          }

          // Preserve unsaved draft review remark if user typed it locally
          let preservedReviewRemark = cleanReviewRemark;
          if (existing && existing.review_remark !== undefined) {
            const savedRemark = existing.saved_review_remark || cleanReviewRemark;
            if (existing.review_remark !== savedRemark && existing.review_remark !== "") {
              preservedReviewRemark = existing.review_remark;
            }
          }

          return {
            ...t,
            review_status: preservedReviewStatus,
            saved_review_status: t.review_status || null,
            review_remark: preservedReviewRemark,
            saved_review_remark: cleanReviewRemark,
            evidence_url: t.evidence_url ? this.api.getFileUrl(t.evidence_url) : null,
            remarks_history: [],
            evidence_history: []
          };
        });

        this.api.getAssignmentEvidence(this.assignmentId!).subscribe({
          next: (evidenceList) => {
            enriched.forEach(task => {
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
              if (task.evidence_history.length > 0 && !task.evidence_url) {
                task.evidence_url = task.evidence_history[0].file_url;
                task.has_evidence = true;
              }
            });

            let completedCount = 0;
            if (enriched.length === 0) {
              this.tasks.set(enriched);
              this.groupTasks(enriched);
              return;
            }

            enriched.forEach(task => {
              this.api.getTaskRemarksHistory(this.assignmentId!, task.assignment_task_id).subscribe({
                next: (history) => {
                  const historyList = history || [];
                  const reviewRemarkText = task.assignment_review_remark || task.review_remark;
                  if (reviewRemarkText && reviewRemarkText.trim()) {
                    const exists = historyList.some((h: any) => (h.role || '').toUpperCase() === 'CO' || (h.role || '').toUpperCase() === 'REVIEWER');
                    if (!exists) {
                      historyList.push({
                        role: 'CO',
                        username: 'CO Reviewer',
                        remark: task.review_status === 'APPROVED' ? reviewRemarkText : (reviewRemarkText.toLowerCase().includes('re-compliance') ? reviewRemarkText : `[Re-compliance Requested] ${reviewRemarkText}`),
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
                      ev.uploader_role = (r === 'CO' || r === 'REVIEWER') ? 'CO REVIEWER' : (r === 'CCO' ? 'CCO REVIEWER' : 'DEPARTMENT/BRANCH');
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
                  if (completedCount === enriched.length) {
                    this.tasks.set(enriched);
                    this.groupTasks(enriched);
                  }
                },
                error: (err) => {
                  console.error("Failed to load remarks history for task:", task.assignment_task_id, err);
                  completedCount++;
                  if (completedCount === enriched.length) {
                    this.tasks.set(enriched);
                    this.groupTasks(enriched);
                  }
                }
              });
            });
          },
          error: (err) => {
            console.error("Failed to load evidence list:", err);
            this.tasks.set(enriched);
            this.groupTasks(enriched);
          }
        });
      },
      error: (err) => this.notification.error("Failed to load tasks: " + (err.message || err.statusText))
    });
  }

  groupTasks(tasks: any[]) {
    const filter = this.activeFilter();
    let filteredTasks = tasks;
    if (filter === 'APPROVED') {
      filteredTasks = tasks.filter(t => t.review_status === 'APPROVED');
    } else if (filter === 'NEEDS_REDO') {
      filteredTasks = tasks.filter(t => t.review_status === 'NEEDS_REDO');
    } else if (filter === 'UNREVIEWED') {
      filteredTasks = tasks.filter(t => !t.review_status);
    }

    const groupsMap = new Map<string, any[]>();
    for (const t of filteredTasks) {
      const key = t.header_name || "General Task";
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(t);
    }
    this.taskGroups.set(Array.from(groupsMap.entries()).map(([headerName, tasks]) => ({ headerName, tasks })));
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

  isTaskSavedByDept(task: any): boolean {
    if (!task) return false;
    return task.compliance_status === 'COMPLIED' ||
           task.compliance_status === 'NOT_COMPLIED' ||
           (task.remarks && task.remarks.trim().length > 0) ||
           task.has_evidence ||
           task.status === 'COMPLETED';
  }

  onFileSelected(event: any, taskId: number | null) {
    if (!taskId) return;
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        this.notification.warn('Only PDF files are accepted as compliance evidence.');
        return;
      }
      this.stagedFile = file;
      this.originalFileName = file.name;
      this.customDocName = file.name;
      this.activeEvidenceTaskId = taskId;
      this.evidenceSourceStep = 'RENAME_CONFIRM';
      this.displayEvidenceSourceModal = true;
      // Reset input value so re-selecting same file triggers change event
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

  getSelectedFileName(taskId: number): string | null {
    return this.selectedFilesMap()[taskId]?.name || null;
  }

  removeSelectedFile(taskId: number) {
    this.selectedFilesMap.update(map => {
      const copy = { ...map };
      delete copy[taskId];
      return copy;
    });
  }

  previewFile(task: any) {
    const file = this.selectedFilesMap()[task.assignment_task_id];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      window.open(blobUrl, '_blank');
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

  hasFileToView(task: any): boolean {
    if (this.selectedFilesMap()[task.assignment_task_id]) return true;
    if (task.evidence_url) return true;
    if (task.has_evidence && task.evidence_history && task.evidence_history.length > 0) return true;
    return false;
  }

  uploadEvidenceOnly(task: any) {
    if (!this.assignmentId) return;
    const file = this.selectedFilesMap()[task.assignment_task_id];
    if (!file) {
      this.notification.warn('Please select a PDF file first.');
      return;
    }

    this.savingTaskId.set(task.assignment_task_id);
    const formData = new FormData();
    formData.append('files', file);
    formData.append('remark', task.review_remark || '[CO] Evidence document uploaded');
    formData.append('compliance_status', task.compliance_status || 'COMPLIED');

    this.api.uploadTaskEvidence(this.assignmentId, task.assignment_task_id, formData).subscribe({
      next: () => {
        this.removeSelectedFile(task.assignment_task_id);
        this.savingTaskId.set(null);
        this.notification.success('Evidence PDF uploaded successfully!');
        this.loadTasks();
      },
      error: (err) => {
        this.savingTaskId.set(null);
        this.notification.error('Failed to upload evidence: ' + (err.message || err.statusText));
      }
    });
  }

  setTaskReviewStatus(task: any, status: "APPROVED" | "NEEDS_REDO" | "ESCALATED") {
    if (!this.assignmentId) return;

    if ((status === "NEEDS_REDO" || status === "ESCALATED") && (!task.review_remark || !task.review_remark.trim())) {
      const actionName = status === "NEEDS_REDO" ? "Reject" : "Escalate";
      this.notification.warn(`Please enter Reviewer Remarks / Feedback before clicking ${actionName}.`);
      return;
    }

    this.pendingStatus = status;
    this.savingTaskId.set(task.assignment_task_id);

    task.review_status = status;
    this.tasks.update(ts => ts.map(t => t.assignment_task_id === task.assignment_task_id ? { ...t, review_status: status } : t));
    this.groupTasks(this.tasks());

    const file = this.selectedFilesMap()[task.assignment_task_id];
    if (file) {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('remark', task.review_remark || `[CO ${status}] Evidence attached`);
      formData.append('compliance_status', task.compliance_status || 'COMPLIED');

      this.api.uploadTaskEvidence(this.assignmentId, task.assignment_task_id, formData).subscribe({
        next: () => {
          this.removeSelectedFile(task.assignment_task_id);
          this.executeReviewStatusUpdate(task, status);
        },
        error: (err) => {
          console.warn('Evidence upload failed, proceeding with review status update:', err);
          this.executeReviewStatusUpdate(task, status);
        }
      });
    } else {
      this.executeReviewStatusUpdate(task, status);
    }
  }

  private executeReviewStatusUpdate(task: any, status: "APPROVED" | "NEEDS_REDO" | "ESCALATED") {
    this.api.reviewTaskStatus(this.assignmentId!, task.assignment_task_id, status, task.review_remark || "").subscribe({
      next: () => {
        this.savingTaskId.set(null);
        this.pendingStatus = "";
        const label = status === 'APPROVED' ? 'Accepted' : status === 'NEEDS_REDO' ? 'Rejected' : 'Escalated to CCO';
        this.notification.success(`Task marked as ${label}`);
        this.loadTasks();
      },
      error: (err) => {
        this.savingTaskId.set(null);
        this.pendingStatus = "";
        this.notification.error("Failed to save review: " + (err.message || err.statusText));
      }
    });
  }

  openEvidence(url: string) { window.open(url, "_blank"); }

  markAllApproved() {
    if (!this.assignmentId) return;
    this.tasks().forEach(t => { t.review_status = "APPROVED"; });
    this.groupTasks(this.tasks());
    this.submitting = true;
    const obs = this.tasks().map(t => this.api.reviewTaskStatus(this.assignmentId!, t.assignment_task_id, "APPROVED", t.review_remark));
    import('rxjs').then(rxjs => {
      rxjs.forkJoin(obs).subscribe({
        next: () => {
          this.submitting = false;
          this.notification.success("All tasks marked as Accepted!");
          this.loadTasks();
        },
        error: (err) => {
          this.submitting = false;
          this.notification.error("Failed to save tasks: " + (err.message || err.statusText));
        }
      });
    });
  }

  markAllNeedsRedo() {
    if (!this.assignmentId) return;
    this.tasks().forEach(t => { t.review_status = "NEEDS_REDO"; });
    this.groupTasks(this.tasks());
    this.submitting = true;
    const obs = this.tasks().map(t => this.api.reviewTaskStatus(this.assignmentId!, t.assignment_task_id, "NEEDS_REDO", t.review_remark));
    import('rxjs').then(rxjs => {
      rxjs.forkJoin(obs).subscribe({
        next: () => {
          this.submitting = false;
          this.notification.warn("All tasks marked as Rejected!");
          this.loadTasks();
        },
        error: (err) => {
          this.submitting = false;
          this.notification.error("Failed to save tasks: " + (err.message || err.statusText));
        }
      });
    });
  }

  submitReview(action: "ACCEPT" | "REJECT" | "ESCALATE") {
    if (!this.assignmentId) return;

    if (action !== "ESCALATE" && this.unreviewedCount() > 0) {
      this.notification.warn(`Cannot proceed: There are ${this.unreviewedCount()} unreviewed task(s) remaining. Please review all tasks (Accept or Reject) before submitting.`);
      return;
    }

    if (action === "ACCEPT" && this.needsRedoCount() > 0) {
      this.notification.warn("Cannot 'Accept & Complete' when tasks are marked as Rejected. Please click 'Reject & Request Re-compliance' instead.");
      return;
    }

    if (!this.overallRemark || !this.overallRemark.trim()) {
      this.notification.warn("Please provide Overall Review Remarks before submitting.");
      return;
    }
    this.submitting = true;
    this.lastAction = action;
    this.api.reviewAssignment(this.assignmentId, action, this.overallRemark).subscribe({
      next: () => {
        this.submitting = false;
        if (action === "ACCEPT") this.notification.success("Compliance review submitted successfully!");
        if (action === "REJECT") this.notification.warn("Assignment rejected. Department will be notified for re-compliance.");
        if (action === "ESCALATE") this.notification.info("Assignment escalated to CCO for final review.");
        this.goBack();
      },
      error: (err) => { this.submitting = false; this.notification.error("Failed to submit review: " + (err.message || err.statusText)); }
    });
  }

  toggleFilter(status: string) {
    this.activeFilter.set(this.activeFilter() === status ? "" : status);
    this.groupTasks(this.tasks());
  }

  clearFilter() {
    this.activeFilter.set("");
    this.groupTasks(this.tasks());
  }

  goBack() { 
    const type = this.route.snapshot.queryParamMap.get('type');
    this.router.navigate(["/co-review"], { queryParams: type ? { type } : {} }); 
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

