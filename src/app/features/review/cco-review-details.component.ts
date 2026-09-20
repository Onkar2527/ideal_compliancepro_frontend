import { Component, OnInit, inject, signal, computed } from "@angular/core";
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
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService } from "primeng/api";

@Component({
  selector: "app-cco-review-details",
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, TextareaModule, TooltipModule, DialogModule, InputTextModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: "./cco-review-details.component.html",
  styleUrls: ["../../shared/styles/checklist-shared.css", "./cco-review-details.component.css"]
})
export class CcoReviewDetailsComponent implements OnInit {
  private confirmationService = inject(ConfirmationService);
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

  cleanFileName(rawName: string): string {
    if (!rawName) return 'Evidence Document.pdf';
    let name = decodeURIComponent(rawName.trim().split('?')[0]);
    // Remove leading timestamp e.g. 1726483920192-file.pdf
    name = name.replace(/^\d{10,14}[-_]/, '');
    // Remove trailing hex hash, uuid, or timestamp before .pdf extension
    name = name.replace(/[-_]([0-9a-fA-F]{8,36}|\d{10,14}|[0-9a-fA-F]{4,8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?=\.pdf$|$)/i, '');
    if (!name.toLowerCase().endsWith('.pdf') && rawName.toLowerCase().includes('.pdf')) {
      name = name + '.pdf';
    }
    return name || 'Evidence Document.pdf';
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

  loadDepartmentPreviousEvidences() {
    const currentBranchId = this.assignmentMeta()?.branch_id || this.assignmentMeta()?.department_id;
    const currentBranchName = (this.assignmentMeta()?.branch_name || '').toLowerCase().trim();

    this.loadingDeptEvidences = true;

    // Helper for robust deduplication by unique evidence name/url (avoids repetitive duplicates)
    const deduplicateEvidences = (list: any[]) => {
      const seen = new Map<string, any>();
      list.forEach(item => {
        if (!item) return;
        let name = (item.name || '').trim();
        if ((!name || name === 'Task Evidence Document.pdf') && item.url) {
          const extracted = item.url.split('/').pop()?.split('?')[0];
          if (extracted && extracted.toLowerCase().endsWith('.pdf')) {
            name = decodeURIComponent(extracted);
          }
        }
        name = this.cleanFileName(name);
        item.name = name;
        const url = (item.url || '').trim();
        if (!name && !url) return;

        // Key by unique cleaned document name so repeated documents don't show multiple times
        const key = name.toLowerCase() || url.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, item);
        } else {
          const existing = seen.get(key);
          if ((!existing.url && url) || (item.date && (!existing.date || new Date(item.date) > new Date(existing.date)))) {
            seen.set(key, { ...existing, ...item, name });
          }
        }
      });
      return Array.from(seen.values());
    };

    // Collect from current loaded tasks history
    const taskEvidences: any[] = [];
    (this.tasks() || []).forEach(t => {
      if (t.evidence_history && Array.isArray(t.evidence_history)) {
        t.evidence_history.forEach((eh: any) => {
          if (this.isEvidenceDeleted(eh)) return;
          if (eh.file_url) {
            let fname = eh.file_name || eh.filename;
            if (!fname && eh.file_url) {
              fname = eh.file_url.split('/').pop()?.split('?')[0];
            }
            taskEvidences.push({
              name: this.cleanFileName(fname || 'Task Evidence Document.pdf'),
              url: eh.file_url,
              date: eh.uploaded_at || eh.created_at,
              source: `Task: ${t.task_title ? (t.task_title.substring(0, 45) + '...') : 'Compliance Task'}`,
              type: 'TASK_EVIDENCE'
            });
          }
        });
      } else if (t.evidence_url && !this.isEvidenceDeleted(t)) {
        let fname = t.evidence_file_name;
        if (!fname && t.evidence_url) {
          fname = t.evidence_url.split('/').pop()?.split('?')[0];
        }
        taskEvidences.push({
          name: this.cleanFileName(fname || 'Task Evidence Document.pdf'),
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
            if (!d.file_url || this.isEvidenceDeleted(d)) return false;
            // 1. Company-wide / All Branches public documents
            if (d.department_id === null || d.department_id === undefined) return true;
            // 2. Matching department ID or name
            if (currentBranchId && d.department_id && Number(d.department_id) === Number(currentBranchId)) return true;
            if (currentBranchName && d.department_name && d.department_name.toLowerCase().trim() === currentBranchName) return true;
            return false;
          })
          .map(d => ({
            name: this.cleanFileName(d.file_name || d.document_name),
            url: d.file_url,
            date: d.created_at || d.issue_date,
            source: `Asset Management (${d.document_name})`,
            type: 'DOC_MASTER'
          }));

        const combined = [...taskEvidences, ...deptDocs];
        this.deptPreviousEvidences.set(deduplicateEvidences(combined));
        this.loadingDeptEvidences = false;
      },
      error: () => {
        this.deptPreviousEvidences.set(deduplicateEvidences(taskEvidences));
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
        this.addSelectedFiles(taskId, [file]);
        this.notification.success(`Attached "${item.name}" from department evidence repository.`);
        this.displayEvidenceSourceModal = false;
      })
      .catch(() => {
        const file = new File([new Blob()], item.name, { type: 'application/pdf' });
        this.addSelectedFiles(taskId, [file]);
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
  selectedFilesMap = signal<Record<number, File[]>>({});

  assignmentMeta = computed(() => this.tasks()[0] ?? null);
  assignmentStatus = computed(() => this.assignmentMeta()?.status || this.assignmentMeta()?.assignment_status || '');
  compliedCount = computed(() => this.tasks().filter(t => t.compliance_status === "COMPLIED").length);
  notCompliedCount = computed(() => this.tasks().filter(t => t.compliance_status === "NOT_COMPLIED").length);
  approvedCount = computed(() => this.tasks().filter(t => t.review_status === "APPROVED").length);
  needsRedoCount = computed(() => this.tasks().filter(t => t.review_status === "NEEDS_REDO").length);
  escalatedCount = computed(() => this.tasks().filter(t => t.review_status === "ESCALATED").length);
  unreviewedCount = computed(() => this.tasks().filter(t => !t.review_status || t.review_status === "ESCALATED").length);
  isInternalTaskSet = computed(() => {
    const meta = this.assignmentMeta();
    if (!meta) return false;
    const type = (meta.task_set_type || meta.type || '').toUpperCase().trim();
    if (type === 'INTERNAL') return true;
    if (type === 'REGULAR') return false;
    if (meta.circular_id || meta.circular_title || meta.circular_reference_no) return false;
    return false;
  });

  isBranchCreated = computed(() => {
    const meta = this.assignmentMeta();
    if (!meta) return false;
    if (meta.is_branch_created !== undefined) return !!meta.is_branch_created;
    const role = (
      meta.created_by_role ||
      meta.creator_role ||
      meta.task_set_created_by_role ||
      meta.user_role ||
      ''
    ).toUpperCase().trim();
    if (['CO', 'CCO', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CHIEF_COMPLIANCE_OFFICER'].includes(role)) {
      return false;
    }
    if (['BRANCH_USER', 'BRANCH', 'DEPARTMENT', 'DEPARTMENT_USER', 'SUB_DEPARTMENT', 'USER', 'STAFF', 'BRANCH USER'].includes(role)) {
      return true;
    }
    const name = String(
      meta.created_by_username ||
      meta.created_by_name ||
      meta.creator_name ||
      meta.created_by ||
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
    return false;
  });

  isReviewActive(): boolean {
    if (this.isBranchCreated()) return false;
    const status = this.assignmentMeta()?.assignment_status?.toUpperCase();
    return status === 'ESCALATED_TO_CCO' || status === 'TIMELINE_REVIEW';
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
        if (filter === 'COMPLIED') return t.compliance_status === 'COMPLIED';
        if (filter === 'NOT_COMPLIED') return t.compliance_status === 'NOT_COMPLIED';
        if (filter === 'APPROVED') return t.review_status === 'APPROVED';
        if (filter === 'NEEDS_REDO') return t.review_status === 'NEEDS_REDO';
        if (filter === 'ESCALATED') return t.review_status === 'ESCALATED';
        if (filter === 'UNREVIEWED') return !t.review_status || t.review_status === 'ESCALATED';
        return true;
      })
    })).filter(g => g.tasks.length > 0);
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public api: ComplianceApiService,
    private notification: NotificationService
  ) { }

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
    import('rxjs').then(({ forkJoin, of, catchError }) => {
      forkJoin({
        data: this.api.getAssignmentTasks(this.assignmentId!),
        taskSets: this.api.getTaskSets().pipe(catchError(() => of([]))),
        branches: this.api.getBranches().pipe(catchError(() => of([])))
      }).subscribe({
        next: ({ data, taskSets, branches }: any) => {
          const currentTasksMap = new Map<number, any>();
          (this.tasks() || []).forEach(ct => {
            if (ct && ct.assignment_task_id) {
              currentTasksMap.set(ct.assignment_task_id, ct);
            }
          });

          const branchList = branches || [];
          const taskSetList = taskSets || [];

          const enriched = (data || []).map((t: any) => {
            const existing = currentTasksMap.get(t.assignment_task_id);

            const matchedBranch = branchList.find((b: any) => 
              (t.branch_id && Number(b.id) === Number(t.branch_id)) ||
              (t.branch_name && (b.name || '').toLowerCase().trim() === (t.branch_name || '').toLowerCase().trim())
            );
            const isSubDept = !!(matchedBranch && matchedBranch.parent_id);

            const matchedTs = taskSetList.find((s: any) => 
              (t.task_set_id && Number(s.id) === Number(t.task_set_id)) ||
              (t.task_set_name && (s.name || '').toLowerCase().trim() === (t.task_set_name || '').toLowerCase().trim())
            );

            const creatorRole = (
              t.created_by_role || 
              t.creator_role || 
              matchedTs?.created_by_role || 
              matchedTs?.creator_role || 
              ''
            ).toUpperCase().trim();

            const isCOOrAdmin = ['CO', 'CCO', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CHIEF_COMPLIANCE_OFFICER'].includes(creatorRole);

            const creatorName = String(
              t.created_by_name ||
              t.created_by_username ||
              t.creator_name ||
              matchedTs?.created_by_name ||
              matchedTs?.created_by_username ||
              matchedTs?.created_by ||
              ''
            ).toLowerCase().trim();

            const isCOUserByName = (
              creatorName.startsWith('co_') ||
              creatorName.startsWith('cco_') ||
              creatorName.startsWith('co ') ||
              creatorName.startsWith('cco ') ||
              creatorName === 'co' ||
              creatorName === 'cco' ||
              creatorName === 'admin' ||
              creatorName.includes('(co)') ||
              creatorName.includes('(cco)') ||
              creatorName.includes('compliance')
            );

            const isBranch = !isCOOrAdmin && !isCOUserByName && (
              creatorRole === 'BRANCH' ||
              creatorRole === 'BRANCH_USER' ||
              creatorRole === 'DEPARTMENT' ||
              creatorRole === 'SUB_DEPARTMENT' ||
              creatorRole === 'BRANCH USER' ||
              creatorName.includes('branch') ||
              creatorName.includes('dept')
            );

            // Preserve unsaved draft review status if user changed it locally
            let preservedReviewStatus = t.review_status || null;
            if (existing && existing.review_status !== undefined && existing.review_status !== (existing.saved_review_status || null)) {
              preservedReviewStatus = existing.review_status;
            }

            // Strip system '[Accepted by Head Department]'
            let rawReviewRemark = (t.review_remark || "").trim();
            if (rawReviewRemark === '[Accepted by Head Department]') {
              rawReviewRemark = "";
            }

            // In CCO Review, previous CO remark is shown as co_remark; CCO input box starts blank
            let coRemark = existing?.co_remark || rawReviewRemark;
            let ccoRemark = existing ? (existing.review_remark || "") : "";

            return {
              ...t,
              branch_parent_id: matchedBranch?.parent_id,
              created_by_role: creatorRole,
              created_by_name: matchedTs?.created_by_name || t.created_by_name,
              is_branch_created: isBranch,
              co_remark: coRemark,
              review_status: preservedReviewStatus,
              saved_review_status: t.review_status || null,
              review_remark: ccoRemark,
              saved_review_remark: ccoRemark,
              evidence_url: t.evidence_url ? this.api.getFileUrl(t.evidence_url) : null,
              remarks_history: [],
              evidence_history: []
            };
          });

          this.api.getAssignmentEvidence(this.assignmentId!).subscribe({
            next: (evidenceList) => {
              const activeEvidenceList = (evidenceList || []).filter((e: any) => !this.isEvidenceDeleted(e));
              enriched.forEach((task: any) => {
                const evidences = activeEvidenceList.filter(e => e.assignment_task_id === task.assignment_task_id || e.task_id === task.task_id);
                task.evidence_history = evidences.map(e => {
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
              if (task.evidence_history.length > 0 && !task.evidence_url) {
                task.evidence_url = task.evidence_history[0].file_url;
                task.has_evidence = true;
              }
            });

            // Save mapped evidence items into shared repository
            const asgBranchId = this.assignmentMeta()?.branch_id || this.assignmentMeta()?.department_id;
            const asgBranchName = this.assignmentMeta()?.branch_name;
            const asgName = this.assignmentMeta()?.task_set_name || 'Compliance Task';

            const evDocsToSave: any[] = [];
            enriched.forEach((task: any) => {
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
                    start_date: null,
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
                    source_type: 'TASK_EVIDENCE'
                  });
                });
              }
            });
            if (evDocsToSave.length > 0) {
              this.api.saveEvidenceDocuments(evDocsToSave);
            }

            let completedCount = 0;
            if (enriched.length === 0) {
              this.tasks.set(enriched);
              this.groupTasks(enriched);
              return;
            }

            enriched.forEach((task: any) => {
              this.api.getTaskRemarksHistory(this.assignmentId!, task.assignment_task_id).subscribe({
                next: (history) => {
                  const historyList = history || [];
                  const reviewRemarkText = task.assignment_review_remark || task.review_remark;
                  if (reviewRemarkText && reviewRemarkText.trim()) {
                    const exists = historyList.some((h: any) => (h.role || '').toUpperCase() === 'CCO');
                    if (!exists) {
                      historyList.push({
                        role: 'CCO',
                        username: 'CCO Reviewer',
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
                      ev.uploader_role = r === 'CCO' ? 'CCO REVIEWER' : ((r === 'CO' || r === 'REVIEWER') ? 'CO REVIEWER' : 'DEPARTMENT/BRANCH');
                    } else if (ev.remark && (ev.remark.includes('[CCO') || ev.remark.toLowerCase().includes('cco reviewer'))) {
                      ev.uploader_name = 'CCO Reviewer';
                      ev.uploader_role = 'CCO REVIEWER';
                    } else if (ev.remark && (ev.remark.includes('[CO') || ev.remark.toLowerCase().includes('co reviewer'))) {
                      ev.uploader_name = 'CO Reviewer';
                      ev.uploader_role = 'CO REVIEWER';
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
  });
}

  groupTasks(tasks?: any[]) {
    const list = tasks || this.tasks();
    const filter = this.activeFilter();
    let filteredTasks = list;
    if (filter === 'APPROVED') {
      filteredTasks = list.filter((t: any) => t.review_status === 'APPROVED');
    } else if (filter === 'NEEDS_REDO') {
      filteredTasks = list.filter((t: any) => t.review_status === 'NEEDS_REDO');
    } else if (filter === 'ESCALATED') {
      filteredTasks = list.filter((t: any) => t.review_status === 'ESCALATED');
    } else if (filter === 'UNREVIEWED') {
      filteredTasks = list.filter((t: any) => !t.review_status || t.review_status === 'ESCALATED');
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
    const fileList: FileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        validFiles.push(f);
      } else {
        this.notification.warn(`Skipped "${f.name}": only PDF files are accepted.`);
      }
    }

    if (validFiles.length === 0) return;

    if (validFiles.length === 1) {
      this.stagedFile = validFiles[0];
      this.originalFileName = validFiles[0].name;
      this.customDocName = validFiles[0].name;
      this.activeEvidenceTaskId = taskId;
      this.evidenceSourceStep = 'RENAME_CONFIRM';
      this.displayEvidenceSourceModal = true;
    } else {
      this.addSelectedFiles(taskId, validFiles);
      this.notification.success(`${validFiles.length} evidence PDF documents attached.`);
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
    if (!finalName) {
      finalName = this.originalFileName || 'evidence.pdf';
    }
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName = finalName + '.pdf';
    }

    const renamedFile = new File([this.stagedFile], finalName, { type: this.stagedFile.type || 'application/pdf' });
    this.addSelectedFiles(taskId, [renamedFile]);
    this.notification.success(`Evidence PDF "${finalName}" attached.`);
    this.stagedFile = null;
    this.displayEvidenceSourceModal = false;
  }

  getSelectedFiles(taskId: number): File[] {
    return this.selectedFilesMap()[taskId] || [];
  }

  getSelectedFileName(taskId: number): string | null {
    const files = this.getSelectedFiles(taskId);
    if (files.length === 0) return null;
    if (files.length === 1) return files[0].name;
    return `${files.length} evidence documents`;
  }

  addSelectedFiles(taskId: number, files: File[]) {
    this.selectedFilesMap.update(map => {
      const existing = map[taskId] || [];
      const newUnique = files.filter(f => !existing.some(e => e.name.toLowerCase() === f.name.toLowerCase() && e.size === f.size));
      return { ...map, [taskId]: [...existing, ...newUnique] };
    });
  }

  removeSelectedFile(taskId: number, fileIndex?: number) {
    this.selectedFilesMap.update(map => {
      const copy = { ...map };
      if (fileIndex === undefined) {
        delete copy[taskId];
      } else {
        const list = copy[taskId] || [];
        const updated = list.filter((_, idx) => idx !== fileIndex);
        if (updated.length === 0) {
          delete copy[taskId];
        } else {
          copy[taskId] = updated;
        }
      }
      return copy;
    });
    this.notification.info('Evidence file removed from staged upload list.');
  }

  removeAllSelectedFiles(taskId: number) {
    this.selectedFilesMap.update(map => {
      const copy = { ...map };
      delete copy[taskId];
      return copy;
    });
  }

  previewSelectedFile(file: File) {
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    window.open(blobUrl, '_blank');
  }

  hasSavedEvidence(task: any): boolean {
    if (task.evidence_url) return true;
    if (task.has_evidence && task.evidence_history && task.evidence_history.length > 0) return true;
    return false;
  }

  previewFile(task: any) {
    const files = this.getSelectedFiles(task.assignment_task_id);
    if (files.length > 0) {
      this.previewSelectedFile(files[0]);
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

  canDeleteEvidence(ev: any, task: any, idx?: number): boolean {
    if (!task || !ev) return false;
    if (this.assignmentStatus() === 'COMPLETED') return false;
    const role = (ev.uploader_role || '').toUpperCase();
    if (!role.includes('CCO')) {
      return false; // Department & CO evidence are protected audit records for CCO
    }
    return this.isRecentEvidence(ev, task, idx);
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
        }
      }
    });
  }

  hasFileToView(task: any): boolean {
    if (this.getSelectedFiles(task.assignment_task_id).length > 0) return true;
    return this.hasSavedEvidence(task);
  }

  uploadEvidenceOnly(task: any) {
    if (!this.assignmentId) return;
    const files = this.getSelectedFiles(task.assignment_task_id);
    if (!files || files.length === 0) {
      this.notification.warn('Please select at least one PDF file first.');
      return;
    }

    this.savingTaskId.set(task.assignment_task_id);
    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f, f.name);
    });
    formData.append('remark', task.review_remark || '[CCO] Evidence document uploaded');
    formData.append('compliance_status', task.compliance_status || 'COMPLIED');

    this.api.uploadTaskEvidence(this.assignmentId, task.assignment_task_id, formData).subscribe({
      next: () => {
        this.removeAllSelectedFiles(task.assignment_task_id);
        this.savingTaskId.set(null);
        this.notification.success(`${files.length > 1 ? files.length + ' evidence PDFs' : 'Evidence PDF'} uploaded successfully!`);
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

    if (status === "NEEDS_REDO" && (!task.review_remark || !task.review_remark.trim())) {
      this.notification.warn("Please enter CCO Reviewer Remarks / Feedback before clicking Reject.");
      return;
    }

    this.pendingStatus = status;
    this.savingTaskId.set(task.assignment_task_id);

    task.review_status = status;
    this.tasks.update(ts => ts.map(t => t.assignment_task_id === task.assignment_task_id ? { ...t, review_status: status } : t));
    this.groupTasks(this.tasks());

    const files = this.getSelectedFiles(task.assignment_task_id);
    if (files && files.length > 0) {
      const formData = new FormData();
      files.forEach(f => {
        formData.append('files', f, f.name);
      });
      formData.append('remark', task.review_remark || `[CCO ${status}] Evidence attached`);
      formData.append('compliance_status', task.compliance_status || 'COMPLIED');

      this.api.uploadTaskEvidence(this.assignmentId, task.assignment_task_id, formData).subscribe({
        next: () => {
          this.removeAllSelectedFiles(task.assignment_task_id);
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
        const label = status === 'APPROVED' ? 'Accepted' : status === 'NEEDS_REDO' ? 'Rejected' : 'Escalated';
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
    this.tasks().forEach((t: any) => { t.review_status = "APPROVED"; });
    this.groupTasks(this.tasks());
    this.submitting = true;
    const obs = this.tasks().map((t: any) => this.api.reviewTaskStatus(this.assignmentId!, t.assignment_task_id, "APPROVED", t.review_remark));
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
    this.tasks().forEach((t: any) => { t.review_status = "NEEDS_REDO"; });
    this.groupTasks(this.tasks());
    this.submitting = true;
    const obs = this.tasks().map((t: any) => this.api.reviewTaskStatus(this.assignmentId!, t.assignment_task_id, "NEEDS_REDO", t.review_remark));
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

    if (this.unreviewedCount() > 0) {
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
        if (action === "ACCEPT") this.notification.success("Assignment accepted and marked as Completed!");
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
    this.router.navigate(["/cco-review"], { queryParams: type ? { type } : {} });
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


