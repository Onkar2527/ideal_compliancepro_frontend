import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { RippleModule } from 'primeng/ripple';
import { ComplianceApiService, ComplianceDocument } from '../../core/services/api/compliance-api.service';
import { ExportService } from '../../core/services/export/export.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { getCompliancePeriodInfo } from '../../shared/utils/compliance-period.util';

export interface SummaryEvidenceItem {
  id?: number | string;
  file_name: string;
  file_url: string;
  uploader_name?: string;
  uploader_role?: string;
  uploaded_at?: string;
  description?: string;
}

export interface SummaryRemarkItem {
  role: string;
  username: string;
  remark: string;
  created_at?: string;
}

export interface SummaryRow {
  id: string;
  task_set_id: number;
  task_set_name: string;
  task_set_type: string;
  circular_id?: number | null;
  circular_reference_no?: string | null;
  circular_title?: string | null;

  frequency: string;
  frequency_raw: string | number;
  frequency_badge_class: string;

  cycle_label: string;
  period_label?: string;
  due_date?: string | null;

  assignment_id?: number | null;
  branch_id?: number | null;
  branch_name: string;
  department_name: string;

  task_id: number;
  assignment_task_id?: number | null;
  task_title: string;
  task_header?: string;

  compliance_status: 'COMPLIED' | 'NOT_COMPLIED' | 'PENDING' | 'APPROVED' | 'NEEDS_REDO';
  status_badge_class: string;

  maker_remarks?: string | null;
  reviewer_remarks?: string | null;
  timeline_remarks?: string | null;
  remarks_history: SummaryRemarkItem[];
  total_comments_count: number;

  evidence_list: SummaryEvidenceItem[];
  evidence_count: number;
  has_evidence: boolean;
  details_loaded?: boolean;
}

@Component({
  selector: 'app-compliance-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    SelectModule,
    InputTextModule,
    DialogModule,
    ProgressBarModule,
    RippleModule
  ],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit {
  private api = inject(ComplianceApiService);
  private exportService = inject(ExportService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  loading = signal<boolean>(true);
  enrichingDetails = signal<boolean>(false);
  enrichmentProgress = signal<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  dialogLoading = signal<boolean>(false);
  allRows = signal<SummaryRow[]>([]);
  private totalAsgToEnrich = 0;

  // Filter signals
  selectedTaskId = signal<number | null>(null);
  selectedFrequency = signal<string | null>(null);
  selectedCycle = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);
  selectedEvidenceFilter = signal<string | null>(null);
  searchText = signal<string>('');

  // Dialog signals
  showRemarksDialog = signal<boolean>(false);
  activeRemarksRow = signal<SummaryRow | null>(null);

  showEvidenceDialog = signal<boolean>(false);
  activeEvidenceRow = signal<SummaryRow | null>(null);

  // File Preview modal
  showPreviewModal = signal<boolean>(false);
  previewFileUrl = signal<string | null>(null);
  previewSafeUrl = signal<SafeResourceUrl | null>(null);
  previewFileName = signal<string>('');
  previewFileType = signal<'pdf' | 'image' | 'other'>('other');

  readonly frequencyLabelMap: Record<string, string> = {
    '0': 'Daily',
    'DAILY': 'Daily',
    '7': 'Weekly',
    'WEEKLY': 'Weekly',
    '1': 'Fortnight',
    'FORTNIGHT': 'Fortnight',
    '2': 'Monthly',
    'MONTHLY': 'Monthly',
    '3': 'Quarterly',
    'QUARTERLY': 'Quarterly',
    '4': 'Semi-Annually',
    'SEMIANNUALLY': 'Semi-Annually',
    'SEMI-ANNUALLY': 'Semi-Annually',
    '5': 'Yearly',
    'YEARLY': 'Yearly',
    '6': 'One-Time',
    'ONCE': 'One-Time',
    'ONE_TIME': 'One-Time',
    '1 TIME USE': 'One-Time'
  };

  statusOptions: { label: string; value: string | null }[] = [
    { label: 'All Statuses', value: null },
    { label: 'Complied', value: 'COMPLIED' },
    { label: 'Not Complied', value: 'NOT_COMPLIED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Needs Redo', value: 'NEEDS_REDO' }
  ];

  evidenceFilterOptions: { label: string; value: string | null }[] = [
    { label: 'All Evidence', value: null },
    { label: 'With Evidence Uploaded', value: 'WITH_EVIDENCE' },
    { label: 'Missing / No Evidence', value: 'NO_EVIDENCE' }
  ];

  // Frequency Dropdown Options
  frequencyOptions = computed(() => {
    const rows = this.allRows();
    const set = new Set<string>();
    rows.forEach(r => {
      if (r.frequency) set.add(r.frequency);
    });
    const opts: { label: string; value: string | null }[] = [{ label: 'All Frequencies', value: null }];
    ['Daily', 'Weekly', 'Fortnight', 'Monthly', 'Quarterly', 'Semi-Annually', 'Yearly', 'One-Time'].forEach(f => {
      if (set.has(f)) {
        opts.push({ label: f, value: f });
      }
    });
    // Add any remaining
    set.forEach(f => {
      if (!opts.some(o => o.value === f)) {
        opts.push({ label: f, value: f });
      }
    });
    return opts;
  });

  // Task Dropdown Options
  taskOptions = computed(() => {
    const rows = this.allRows();
    const chosenFreq = this.selectedFrequency();
    const map = new Map<number, { label: string; value: number }>();

    rows.forEach(r => {
      if (chosenFreq !== null && r.frequency !== chosenFreq) return;

      const tid = Number(r.task_id);
      if (tid > 0 && r.task_title && r.task_title !== 'All Assigned Tasks') {
        if (!map.has(tid)) {
          const title = r.task_title.trim();
          const shortTitle = title.length > 65 ? title.substring(0, 65) + '...' : title;

          let displayLabel = shortTitle;
          if (r.task_header && r.task_header !== 'General' && r.task_header !== title && !r.task_set_name.toLowerCase().includes(r.task_header.toLowerCase())) {
            displayLabel = `${r.task_header} - ${shortTitle}`;
          }
          if (r.task_set_name) {
            displayLabel += ` (${r.task_set_name})`;
          }

          map.set(tid, { label: displayLabel, value: tid });
        }
      }
    });

    const opts: { label: string; value: number | null }[] = [{ label: 'All Tasks', value: null }];
    const sorted = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    sorted.forEach(opt => opts.push(opt));
    return opts;
  });

  // Cycle Dropdown Options (dynamically extracted from available cycle labels)
  cycleOptions = computed(() => {
    const rows = this.allRows();
    const chosenTaskId = this.selectedTaskId();
    const chosenFreq = this.selectedFrequency();
    const set = new Set<string>();

    rows.forEach(r => {
      const matchTask = chosenTaskId === null || Number(r.task_id) === Number(chosenTaskId);
      const matchFreq = chosenFreq === null || r.frequency === chosenFreq;
      if (matchTask && matchFreq && r.cycle_label) {
        set.add(r.cycle_label);
      }
    });

    const opts: { label: string; value: string | null }[] = [{ label: 'All Cycles', value: null }];
    Array.from(set).sort().forEach(cycle => {
      opts.push({ label: cycle, value: cycle });
    });
    return opts;
  });

  // Filtered rows
  filteredRows = computed(() => {
    const rows = this.allRows();
    const tId = this.selectedTaskId();
    const freq = this.selectedFrequency();
    const cycle = this.selectedCycle();
    const status = this.selectedStatus();
    const evFilter = this.selectedEvidenceFilter();
    const search = this.searchText().trim().toLowerCase();

    return rows.filter(r => {
      if (tId !== null && Number(r.task_id) !== Number(tId)) return false;
      if (freq !== null && r.frequency !== freq) return false;
      if (cycle !== null && r.cycle_label !== cycle) return false;
      if (status !== null && r.compliance_status !== status) return false;

      if (evFilter === 'WITH_EVIDENCE' && !r.has_evidence) return false;
      if (evFilter === 'NO_EVIDENCE' && r.has_evidence) return false;

      if (search) {
        const matches =
          (r.task_set_name && r.task_set_name.toLowerCase().includes(search)) ||
          (r.task_title && r.task_title.toLowerCase().includes(search)) ||
          (r.task_header && r.task_header.toLowerCase().includes(search)) ||
          (r.branch_name && r.branch_name.toLowerCase().includes(search)) ||
          (r.cycle_label && r.cycle_label.toLowerCase().includes(search)) ||
          (r.maker_remarks && r.maker_remarks.toLowerCase().includes(search)) ||
          (r.reviewer_remarks && r.reviewer_remarks.toLowerCase().includes(search)) ||
          (r.evidence_list || []).some(e => e.file_name && e.file_name.toLowerCase().includes(search));
        if (!matches) return false;
      }

      return true;
    });
  });

  // KPI Statistics
  stats = computed(() => {
    const rows = this.filteredRows();
    const totalTasks = rows.length;
    const taskSetSet = new Set<number>();
    const cycleSet = new Set<string>();

    let complied = 0;
    let notComplied = 0;
    let pending = 0;
    let totalEvidenceFiles = 0;
    let tasksWithEvidence = 0;

    rows.forEach(r => {
      if (r.task_set_id) taskSetSet.add(r.task_set_id);
      if (r.cycle_label) cycleSet.add(`${r.task_set_id}_${r.cycle_label}`);
      if (r.compliance_status === 'COMPLIED' || r.compliance_status === 'APPROVED') complied++;
      else if (r.compliance_status === 'NOT_COMPLIED' || r.compliance_status === 'NEEDS_REDO') notComplied++;
      else pending++;

      totalEvidenceFiles += r.evidence_count;
      if (r.has_evidence) tasksWithEvidence++;
    });

    const rate = totalTasks > 0 ? Math.round((complied / totalTasks) * 100) : 0;

    return {
      totalTaskSets: taskSetSet.size,
      totalCycles: cycleSet.size,
      totalTasks,
      complied,
      notComplied,
      pending,
      complianceRate: rate,
      totalEvidenceFiles,
      tasksWithEvidence
    };
  });

  ngOnInit(): void {
    this.loadSummaryData();
  }

  loadSummaryData(): void {
    this.loading.set(true);
    this.enrichingDetails.set(false);

    forkJoin({
      taskSets: this.api.getTaskSets().pipe(catchError(() => of([]))),
      assignmentsRes: this.api.getAssignments({ limit: 1000 }).pipe(catchError(() => of({ data: [] }))),
      branches: this.api.getBranches().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ taskSets, assignmentsRes, branches }) => {
        const tsList: any[] = Array.isArray(taskSets) ? taskSets : [];
        const asgList: any[] = (assignmentsRes && assignmentsRes.data) ? assignmentsRes.data : (Array.isArray(assignmentsRes) ? assignmentsRes : []);
        const branchList: any[] = Array.isArray(branches) ? branches : [];

        // Build branch map
        const branchMap = new Map<number, any>();
        branchList.forEach(b => {
          if (b.id) branchMap.set(Number(b.id), b);
        });

        // Load cached uploaded evidence documents
        const cachedEvidences = this.api.getEvidenceDocuments() || [];

        // 1. STAGE 1: Instant First Paint - Map all rows immediately from taskSets + assignments!
        const initialRows = this.buildInitialSummaryRows(asgList, tsList, branchMap, cachedEvidences);
        this.allRows.set(initialRows);
        this.loading.set(false); // UI renders in < 200ms!

        // 2. STAGE 2: Progressive background enrichment in small non-blocking chunks
        const asgIds = Array.from(new Set(asgList.map((a: any) => Number(a.id)).filter(Boolean)));
        this.totalAsgToEnrich = asgIds.length;
        if (asgIds.length > 0) {
          this.enrichingDetails.set(true);
          this.enrichmentProgress.set({ loaded: 0, total: asgIds.length });
          this.enrichAssignmentsInChunks(asgIds, 8);
        }
      },
      error: (err) => {
        console.error('Failed to load summary master data:', err);
        this.loading.set(false);
        this.enrichingDetails.set(false);
        this.notification.error('Failed to load compliance summary. Please try again.');
      }
    });
  }

  /**
   * Fast Stage 1 mapper: Immediately generates summary rows from taskSets, assignments, and local evidence
   */
  private buildInitialSummaryRows(
    asgList: any[],
    taskSets: any[],
    branchMap: Map<number, any>,
    cachedEvidences: ComplianceDocument[]
  ): SummaryRow[] {
    const rows: SummaryRow[] = [];
    const processedTaskSetIds = new Set<number>();
    const tsMap = new Map<number, any>();
    taskSets.forEach(ts => {
      if (ts.id) tsMap.set(Number(ts.id), ts);
    });

    // 1. Map Assignments (Active Cycles)
    asgList.forEach((asg: any, index: number) => {
      const tsId = Number(asg.task_set_id);
      if (tsId) processedTaskSetIds.add(tsId);

      const matchedTs = tsMap.get(tsId);
      const rawFreq = asg.frequency ?? matchedTs?.frequency ?? '0';
      const normalizedFreq = this.frequencyLabelMap[String(rawFreq).toUpperCase().trim()] || String(rawFreq) || 'Daily';

      const sDate = asg.start_date || matchedTs?.start_date;
      const eDate = asg.end_date || matchedTs?.end_date;
      const pTimeline = asg.proposed_timeline || matchedTs?.default_due_date;
      const createdAt = asg.created_at || matchedTs?.created_at;

      const cycleInfo = getCompliancePeriodInfo({
        frequency: rawFreq,
        startDate: sDate,
        endDate: eDate,
        proposedTimeline: pTimeline,
        createdAt
      });

      const branchObj = branchMap.get(Number(asg.branch_id));
      const bName = asg.branch_name || branchObj?.name || 'All Branches';
      const deptName = branchObj?.parent_name || branchObj?.name || bName;

      const asgTaskList: any[] = (Array.isArray(asg.tasks) && asg.tasks.length > 0) ? asg.tasks : (matchedTs?.tasks || []);

      if (asgTaskList.length === 0) {
        rows.push({
          id: `asg_${asg.id}_${index}`,
          task_set_id: tsId || asg.id,
          task_set_name: asg.task_set_name || matchedTs?.name || 'Task Set',
          task_set_type: asg.task_set_type || matchedTs?.type || 'REGULAR',
          circular_id: asg.circular_id || matchedTs?.circular_id,
          circular_reference_no: matchedTs?.reference_no || matchedTs?.circular_reference_no,
          circular_title: matchedTs?.circular_title,
          frequency: normalizedFreq,
          frequency_raw: rawFreq,
          frequency_badge_class: this.getFrequencyBadgeClass(normalizedFreq),
          cycle_label: cycleInfo.cycleLabel,
          period_label: cycleInfo.periodRangeLabel,
          due_date: pTimeline || eDate,
          assignment_id: asg.id,
          branch_id: asg.branch_id,
          branch_name: bName,
          department_name: deptName,
          task_id: 0,
          assignment_task_id: null,
          task_title: 'All Assigned Tasks',
          task_header: 'General',
          compliance_status: asg.status === 'COMPLETED' ? 'COMPLIED' : 'PENDING',
          status_badge_class: asg.status === 'COMPLETED' ? 'badge-complied' : 'badge-pending',
          maker_remarks: null,
          reviewer_remarks: null,
          timeline_remarks: null,
          remarks_history: [],
          total_comments_count: 0,
          evidence_list: [],
          evidence_count: 0,
          has_evidence: false,
          details_loaded: false
        });
        return;
      }

      asgTaskList.forEach((t: any, tIdx: number) => {
        const taskId = Number(t.task_id || t.id || tIdx + 1);
        const asgTaskId = t.assignment_task_id ? Number(t.assignment_task_id) : null;
        const taskTitle = t.description || t.task_description || t.title || `Task #${taskId}`;
        const headerName = t.header_name || t.header || 'General';

        let status: 'COMPLIED' | 'NOT_COMPLIED' | 'PENDING' | 'APPROVED' | 'NEEDS_REDO' = 'PENDING';
        const rawStatus = String(t.compliance_status || t.review_status || t.status || (asg.status === 'COMPLETED' ? 'COMPLIED' : '')).toUpperCase();
        if (rawStatus === 'COMPLIED') status = 'COMPLIED';
        else if (rawStatus === 'NOT_COMPLIED') status = 'NOT_COMPLIED';
        else if (rawStatus === 'APPROVED') status = 'APPROVED';
        else if (rawStatus === 'NEEDS_REDO' || rawStatus === 'REJECTED') status = 'NEEDS_REDO';
        else status = 'PENDING';

        const makerRemark = t.remarks || t.compliance_remark || null;
        const reviewerRemark = t.review_remark || t.assignment_review_remark || null;
        const timelineRemark = t.timeline_review_remark || t.proposed_remark || null;

        const remHistory: SummaryRemarkItem[] = [];
        if (makerRemark) {
          remHistory.push({
            role: 'BRANCH/DEPARTMENT',
            username: t.sub_dept_name || bName || 'Department User',
            remark: makerRemark,
            created_at: t.completed_at || t.updated_at
          });
        }
        if (reviewerRemark) {
          remHistory.push({
            role: 'CO REVIEWER',
            username: 'CO Reviewer',
            remark: reviewerRemark,
            created_at: t.reviewed_at
          });
        }

        // Preload any cached evidence items for this task set
        const evList: SummaryEvidenceItem[] = [];
        cachedEvidences.forEach(doc => {
          if (doc.task_set_id && Number(doc.task_set_id) === tsId && doc.file_url) {
            evList.push({
              id: doc.id,
              file_name: doc.file_name || doc.document_name,
              file_url: this.api.getFileUrl(doc.file_url),
              uploader_name: doc.user_name || 'Branch Member',
              uploader_role: 'DEPARTMENT',
              uploaded_at: doc.created_at || doc.issue_date || undefined,
              description: doc.description || undefined
            });
          }
        });

        rows.push({
          id: `${asg.id}_${taskId}_${tIdx}`,
          task_set_id: tsId,
          task_set_name: asg.task_set_name || matchedTs?.name || 'Task Set',
          task_set_type: asg.task_set_type || matchedTs?.type || 'REGULAR',
          circular_id: asg.circular_id || matchedTs?.circular_id,
          circular_reference_no: matchedTs?.reference_no || matchedTs?.circular_reference_no,
          circular_title: matchedTs?.circular_title,
          frequency: normalizedFreq,
          frequency_raw: rawFreq,
          frequency_badge_class: this.getFrequencyBadgeClass(normalizedFreq),
          cycle_label: cycleInfo.cycleLabel,
          period_label: cycleInfo.periodRangeLabel,
          due_date: t.proposed_due_date || t.due_date || pTimeline,
          assignment_id: asg.id,
          branch_id: asg.branch_id,
          branch_name: bName,
          department_name: deptName,
          task_id: taskId,
          assignment_task_id: asgTaskId,
          task_title: taskTitle,
          task_header: headerName,
          compliance_status: status,
          status_badge_class: this.getStatusBadgeClass(status),
          maker_remarks: makerRemark,
          reviewer_remarks: reviewerRemark,
          timeline_remarks: timelineRemark,
          remarks_history: remHistory,
          total_comments_count: remHistory.length,
          evidence_list: evList,
          evidence_count: evList.length,
          has_evidence: evList.length > 0,
          details_loaded: false
        });
      });
    });

    // 2. Map Unassigned Task Sets (Baseline / Planned Tasks)
    taskSets.forEach(ts => {
      const tsId = Number(ts.id);
      if (processedTaskSetIds.has(tsId)) return;

      const rawFreq = ts.frequency ?? '0';
      const normalizedFreq = this.frequencyLabelMap[String(rawFreq).toUpperCase().trim()] || String(rawFreq) || 'Daily';
      const cycleInfo = getCompliancePeriodInfo({
        frequency: rawFreq,
        startDate: ts.start_date,
        endDate: ts.end_date,
        proposedTimeline: ts.default_due_date,
        createdAt: ts.created_at
      });

      const tasks = Array.isArray(ts.tasks) && ts.tasks.length > 0
        ? ts.tasks
        : [{ id: 900000 + tsId, description: ts.name ? `${ts.name} Checklist` : 'Master Task Checklist' }];

      tasks.forEach((t: any, idx: number) => {
        const taskId = Number(t.id || (900000 + tsId + idx));
        const taskTitle = t.description || t.task_description || t.title || `Task #${taskId}`;
        const headerName = t.header_name || t.header || 'General';

        const evList: SummaryEvidenceItem[] = [];
        cachedEvidences.forEach(doc => {
          if (doc.task_set_id && Number(doc.task_set_id) === tsId && doc.file_url) {
            evList.push({
              id: doc.id,
              file_name: doc.file_name || doc.document_name,
              file_url: this.api.getFileUrl(doc.file_url),
              uploader_name: doc.user_name || 'Compliance User',
              uploader_role: 'ADMIN',
              uploaded_at: doc.created_at || doc.issue_date || undefined,
              description: doc.description || undefined
            });
          }
        });

        rows.push({
          id: `ts_${tsId}_${taskId}_${idx}`,
          task_set_id: tsId,
          task_set_name: ts.name,
          task_set_type: ts.type || 'INTERNAL',
          circular_id: ts.circular_id,
          circular_reference_no: ts.reference_no || ts.circular_reference_no,
          circular_title: ts.circular_title,
          frequency: normalizedFreq,
          frequency_raw: rawFreq,
          frequency_badge_class: this.getFrequencyBadgeClass(normalizedFreq),
          cycle_label: cycleInfo.cycleLabel || 'Standard Cycle',
          period_label: cycleInfo.periodRangeLabel,
          due_date: ts.default_due_date || ts.end_date,
          assignment_id: null,
          branch_id: null,
          branch_name: ts.branch_names || 'All Branches',
          department_name: 'All Departments',
          task_id: taskId,
          assignment_task_id: null,
          task_title: taskTitle,
          task_header: headerName,
          compliance_status: 'PENDING',
          status_badge_class: 'badge-pending',
          maker_remarks: null,
          reviewer_remarks: null,
          timeline_remarks: null,
          remarks_history: [],
          total_comments_count: 0,
          evidence_list: evList,
          evidence_count: evList.length,
          has_evidence: evList.length > 0,
          details_loaded: true
        });
      });
    });

    return rows;
  }

  /**
   * Stage 2: Background Progressive Chunk Loader
   * Enriches assignments in small chunks of 8 without freezing the UI!
   */
  private enrichAssignmentsInChunks(asgIds: number[], chunkSize: number = 8): void {
    if (asgIds.length === 0) {
      this.enrichingDetails.set(false);
      return;
    }

    const chunk = asgIds.slice(0, chunkSize);
    const remaining = asgIds.slice(chunkSize);

    const chunkRequests = chunk.map(asgId => {
      return forkJoin({
        asgId: of(asgId),
        tasks: this.api.getAssignmentTasks(asgId).pipe(catchError(() => of([]))),
        evidence: this.api.getAssignmentEvidence(asgId).pipe(catchError(() => of([])))
      });
    });

    forkJoin(chunkRequests).subscribe({
      next: (results) => {
        this.applyEnrichmentBatch(results);

        const loadedSoFar = this.totalAsgToEnrich - remaining.length;
        this.enrichmentProgress.set({
          loaded: loadedSoFar,
          total: this.totalAsgToEnrich
        });

        if (remaining.length > 0) {
          setTimeout(() => this.enrichAssignmentsInChunks(remaining, chunkSize), 25);
        } else {
          this.enrichingDetails.set(false);
        }
      },
      error: () => {
        if (remaining.length > 0) {
          this.enrichAssignmentsInChunks(remaining, chunkSize);
        } else {
          this.enrichingDetails.set(false);
        }
      }
    });
  }

  /**
   * Merges a batch of enriched child tasks, comments, and proof files into allRows
   */
  private applyEnrichmentBatch(
    batch: Array<{ asgId: number; tasks: any[]; evidence: any[] }>
  ): void {
    const currentRows = [...this.allRows()];
    let updatedAny = false;

    batch.forEach(({ asgId, tasks, evidence }) => {
      // Find the first index of row for this assignment
      const firstRowIdx = currentRows.findIndex(r => r.assignment_id === asgId);
      if (firstRowIdx === -1) return;

      const baseRow = currentRows[firstRowIdx];

      if (!Array.isArray(tasks) || tasks.length === 0) {
        baseRow.details_loaded = true;
        updatedAny = true;
        return;
      }

      // Map EVERY task returned by backend into a SummaryRow
      const newRowsForAsg: SummaryRow[] = tasks.map((t: any, tIdx: number) => {
        const taskId = Number(t.task_id || t.id || (tIdx + 1));
        const asgTaskId = t.assignment_task_id ? Number(t.assignment_task_id) : null;
        const taskTitle = t.description || t.task_description || t.title || `Task #${taskId}`;
        const headerName = t.header_name || t.header || baseRow.task_header || 'General';

        let status: 'COMPLIED' | 'NOT_COMPLIED' | 'PENDING' | 'APPROVED' | 'NEEDS_REDO' = 'PENDING';
        const rawStatus = String(t.compliance_status || t.review_status || t.status || '').toUpperCase();
        if (rawStatus === 'COMPLIED') status = 'COMPLIED';
        else if (rawStatus === 'NOT_COMPLIED') status = 'NOT_COMPLIED';
        else if (rawStatus === 'APPROVED') status = 'APPROVED';
        else if (rawStatus === 'NEEDS_REDO' || rawStatus === 'REJECTED') status = 'NEEDS_REDO';
        else status = 'PENDING';

        const makerRemark = t.remarks || t.compliance_remark || null;
        const reviewerRemark = t.review_remark || t.assignment_review_remark || null;
        const timelineRemark = t.timeline_review_remark || t.proposed_remark || null;

        const remHistory: SummaryRemarkItem[] = [];
        if (makerRemark) {
          remHistory.push({
            role: 'BRANCH/DEPARTMENT',
            username: t.sub_dept_name || baseRow.branch_name || 'Department User',
            remark: makerRemark,
            created_at: t.completed_at || t.updated_at
          });
        }
        if (reviewerRemark) {
          remHistory.push({
            role: 'CO REVIEWER',
            username: 'CO Reviewer',
            remark: reviewerRemark,
            created_at: t.reviewed_at
          });
        }
        if (timelineRemark) {
          remHistory.push({
            role: 'TIMELINE REVIEW',
            username: 'System / Reviewer',
            remark: timelineRemark
          });
        }

        const evList: SummaryEvidenceItem[] = [];

        // 1. Evidence history on task item
        (t.evidence_history || []).forEach((ev: any) => {
          if (ev.file_url) {
            const cleanUrl = this.api.getFileUrl(ev.file_url);
            if (!evList.some(e => e.file_url === cleanUrl)) {
              evList.push({
                id: ev.id,
                file_name: this.cleanFileName(ev.file_name || ev.filename || ev.file_url),
                file_url: cleanUrl,
                uploader_name: ev.uploader_name || 'Branch Member',
                uploader_role: ev.uploader_role || 'DEPARTMENT',
                uploaded_at: ev.uploaded_at || ev.created_at || ev.submitted_at,
                description: ev.remark
              });
            }
          }
        });

        // 2. Direct evidence url on task
        if (t.evidence_url) {
          const cleanUrl = this.api.getFileUrl(t.evidence_url);
          if (!evList.some(e => e.file_url === cleanUrl)) {
            evList.push({
              id: asgTaskId || taskId,
              file_name: this.cleanFileName(t.evidence_url),
              file_url: cleanUrl,
              uploader_name: t.sub_dept_name || baseRow.branch_name || 'Branch Member',
              uploader_role: 'DEPARTMENT',
              description: t.evidence_remark
            });
          }
        }

        // 3. Evidence from assignment evidence endpoint
        (evidence || []).forEach((ev: any) => {
          if (ev.assignment_task_id === asgTaskId || ev.task_id === taskId) {
            const cleanUrl = this.api.getFileUrl(ev.file_url);
            if (!evList.some(e => e.file_url === cleanUrl)) {
              evList.push({
                id: ev.id,
                file_name: this.cleanFileName(ev.file_name || ev.filename || ev.file_url),
                file_url: cleanUrl,
                uploader_name: ev.uploader_name || 'Branch Member',
                uploader_role: ev.uploader_role || 'DEPARTMENT',
                uploaded_at: ev.uploaded_at || ev.created_at,
                description: ev.remark
              });
            }
          }
        });

        // 4. Preloaded cached task set evidence
        (baseRow.evidence_list || []).forEach(ev => {
          if (!evList.some(e => e.file_url === ev.file_url)) {
            evList.push(ev);
          }
        });

        return {
          ...baseRow,
          id: `asg_${asgId}_${asgTaskId || taskId}_${tIdx}`,
          task_id: taskId,
          assignment_task_id: asgTaskId,
          task_title: taskTitle,
          task_header: headerName,
          due_date: t.proposed_due_date || t.due_date || baseRow.due_date,
          compliance_status: status,
          status_badge_class: this.getStatusBadgeClass(status),
          maker_remarks: makerRemark,
          reviewer_remarks: reviewerRemark,
          timeline_remarks: timelineRemark,
          remarks_history: remHistory,
          total_comments_count: remHistory.length,
          evidence_list: evList,
          evidence_count: evList.length,
          has_evidence: evList.length > 0,
          details_loaded: true
        };
      });

      // Safely replace the placeholder or previous rows for this assignment in-place
      const before = currentRows.slice(0, firstRowIdx);
      const after = currentRows.slice(firstRowIdx).filter(r => r.assignment_id !== asgId);
      currentRows.splice(0, currentRows.length, ...before, ...newRowsForAsg, ...after);
      updatedAny = true;
    });

    if (updatedAny) {
      this.allRows.set(currentRows);
    }
  }

  // Filter Reset
  resetFilters(): void {
    this.selectedTaskId.set(null);
    this.selectedFrequency.set(null);
    this.selectedCycle.set(null);
    this.selectedStatus.set(null);
    this.selectedEvidenceFilter.set(null);
    this.searchText.set('');
  }

  // Dialog actions
  openRemarksDialog(row: SummaryRow): void {
    this.activeRemarksRow.set(row);
    this.showRemarksDialog.set(true);

    if (!row.details_loaded && row.assignment_id && row.assignment_task_id) {
      this.dialogLoading.set(true);
      this.api.getTaskRemarksHistory(row.assignment_id, row.assignment_task_id).subscribe({
        next: (history) => {
          this.dialogLoading.set(false);
          if (history && history.length > 0) {
            const remHistory = history.map((h: any) => ({
              role: h.role || 'USER',
              username: h.username || 'System',
              remark: h.remark,
              created_at: h.created_at
            }));
            row.remarks_history = remHistory;
            row.total_comments_count = remHistory.length;
            this.activeRemarksRow.set({ ...row });
          }
        },
        error: () => this.dialogLoading.set(false)
      });
    }
  }

  openEvidenceDialog(row: SummaryRow): void {
    this.activeEvidenceRow.set(row);
    this.showEvidenceDialog.set(true);

    if (!row.details_loaded && row.assignment_id) {
      this.dialogLoading.set(true);
      this.api.getAssignmentEvidence(row.assignment_id).subscribe({
        next: (evs) => {
          this.dialogLoading.set(false);
          if (evs && evs.length > 0) {
            const list = evs
              .filter((e: any) => !row.task_id || e.task_id === row.task_id || e.assignment_task_id === row.assignment_task_id)
              .map((e: any) => ({
                id: e.id,
                file_name: this.cleanFileName(e.file_name || e.filename || e.file_url),
                file_url: this.api.getFileUrl(e.file_url),
                uploader_name: e.uploader_name || 'Branch Member',
                uploader_role: e.uploader_role || 'DEPARTMENT',
                uploaded_at: e.uploaded_at || e.submitted_at || e.created_at,
                description: e.remark
              }));
            if (list.length > 0) {
              row.evidence_list = list;
              row.evidence_count = list.length;
              row.has_evidence = true;
              this.activeEvidenceRow.set({ ...row });
            }
          }
        },
        error: () => this.dialogLoading.set(false)
      });
    }
  }

  previewFile(file: SummaryEvidenceItem): void {
    if (!file.file_url) return;
    const url = file.file_url;
    const lower = url.toLowerCase();
    this.previewFileName.set(file.file_name);
    this.previewFileUrl.set(url);

    if (lower.endsWith('.pdf')) {
      this.previewFileType.set('pdf');
      this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.showPreviewModal.set(true);
    } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      this.previewFileType.set('image');
      this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.showPreviewModal.set(true);
    } else {
      // Direct download / new window for DOC, XLSX, etc.
      window.open(url, '_blank');
    }
  }

  downloadFile(file: SummaryEvidenceItem): void {
    if (!file.file_url) return;
    const link = document.createElement('a');
    link.href = file.file_url;
    link.download = file.file_name || 'evidence_document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  navigateToAssignment(assignmentId: number | null | undefined): void {
    if (!assignmentId) return;
    this.router.navigate(['/assignments', assignmentId]);
  }

  // ================= Exports =================

  exportExcel(): void {
    const rows = this.filteredRows();
    if (!rows.length) {
      this.notification.warn('No records available to export.');
      return;
    }

    const exportData = rows.map((r, i) => ({
      sr_no: i + 1,
      task_set_name: r.task_set_name,
      frequency: r.frequency,
      cycle_label: r.cycle_label,
      due_date: r.due_date ? new Date(r.due_date).toLocaleDateString('en-GB') : '—',
      branch_name: r.branch_name,
      task_title: r.task_title,
      header: r.task_header || 'General',
      compliance_status: r.compliance_status,
      maker_remarks: r.maker_remarks || '—',
      reviewer_remarks: r.reviewer_remarks || '—',
      evidence_count: r.evidence_count,
      evidence_files: (r.evidence_list || []).map(e => e.file_name).join('; ') || 'None'
    }));

    const columns = [
      { field: 'sr_no', header: 'Sr. No.' },
      { field: 'task_set_name', header: 'Task Set' },
      { field: 'frequency', header: 'Frequency' },
      { field: 'cycle_label', header: 'Cycle' },
      { field: 'due_date', header: 'Due Date' },
      { field: 'branch_name', header: 'Branch / Dept' },
      { field: 'task_title', header: 'Task Description' },
      { field: 'header', header: 'Header' },
      { field: 'compliance_status', header: 'Compliance Status' },
      { field: 'maker_remarks', header: 'Department Remarks' },
      { field: 'reviewer_remarks', header: 'Reviewer Comments' },
      { field: 'evidence_count', header: 'Evidence Count' },
      { field: 'evidence_files', header: 'Uploaded Evidence Files' }
    ];

    const filterInfo: string[] = [
      `Compliance Summary Report`,
      `Total Tasks: ${rows.length} | Compliance Rate: ${this.stats().complianceRate}%`,
      `Exported on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
    ];

    this.exportService.exportToExcel(
      exportData,
      columns,
      'compliance_summary_report',
      filterInfo
    );
    this.notification.success('Excel summary export generated successfully.');
  }

  exportWord(): void {
    const rows = this.filteredRows();
    if (!rows.length) {
      this.notification.warn('No records available to export.');
      return;
    }

    const exportData = rows.map((r, i) => ({
      sr_no: i + 1,
      task_set_name: r.task_set_name,
      frequency: r.frequency,
      cycle_label: r.cycle_label,
      task_title: r.task_title,
      branch_name: r.branch_name,
      compliance_status: r.compliance_status,
      maker_remarks: r.maker_remarks || '—',
      reviewer_remarks: r.reviewer_remarks || '—',
      evidence_files: (r.evidence_list || []).map(e => e.file_name).join(', ') || 'None'
    }));

    const columns = [
      { field: 'sr_no', header: '#' },
      { field: 'task_set_name', header: 'Task Set' },
      { field: 'frequency', header: 'Frequency' },
      { field: 'cycle_label', header: 'Cycle' },
      { field: 'task_title', header: 'Task Title' },
      { field: 'branch_name', header: 'Branch' },
      { field: 'compliance_status', header: 'Status' },
      { field: 'maker_remarks', header: 'Maker Remarks' },
      { field: 'reviewer_remarks', header: 'Reviewer Comments' },
      { field: 'evidence_files', header: 'Evidence' }
    ];

    const meta = [
      `Total Tasks Tracked: ${rows.length}`,
      `Complied: ${this.stats().complied} | Pending: ${this.stats().pending} | Non-Complied: ${this.stats().notComplied}`,
      `Compliance Rate: ${this.stats().complianceRate}%`,
      `Total Evidence Files: ${this.stats().totalEvidenceFiles}`
    ];

    this.exportService.exportToWord(
      exportData,
      columns,
      'compliance_summary_report',
      'CompliancePro - Task Set & Cycle Compliance Summary',
      meta
    );
    this.notification.success('Word (.doc) summary export generated successfully.');
  }

  exportPdf(): void {
    const rows = this.filteredRows();
    if (!rows.length) {
      this.notification.warn('No records available to export.');
      return;
    }

    const exportData = rows.map((r, i) => ({
      sr_no: i + 1,
      task_set_name: r.task_set_name,
      frequency: r.frequency,
      cycle_label: r.cycle_label,
      task_title: r.task_title,
      branch_name: r.branch_name,
      compliance_status: r.compliance_status,
      comments: [r.maker_remarks ? `Dept: ${r.maker_remarks}` : '', r.reviewer_remarks ? `Reviewer: ${r.reviewer_remarks}` : ''].filter(Boolean).join(' | ') || '—',
      evidence: (r.evidence_list || []).map(e => e.file_name).join(', ') || 'None'
    }));

    const columns = [
      { field: 'sr_no', header: '#' },
      { field: 'task_set_name', header: 'Task Set' },
      { field: 'frequency', header: 'Frequency' },
      { field: 'cycle_label', header: 'Cycle' },
      { field: 'task_title', header: 'Task' },
      { field: 'branch_name', header: 'Branch/Dept' },
      { field: 'compliance_status', header: 'Status' },
      { field: 'comments', header: 'Comments / Remarks' },
      { field: 'evidence', header: 'Evidence Files' }
    ];

    const meta = [
      `Total Tasks: ${rows.length} | Compliance Rate: ${this.stats().complianceRate}%`,
      `Complied: ${this.stats().complied} | Pending: ${this.stats().pending} | Not Complied: ${this.stats().notComplied}`,
      `Evidence Uploaded: ${this.stats().totalEvidenceFiles} files`
    ];

    this.exportService.exportToPdf(
      exportData,
      columns,
      'compliance_summary_report',
      'CompliancePro - Enterprise Task & Cycle Compliance Summary',
      meta
    );
  }

  // Styling helpers
  getFrequencyBadgeClass(freq: string): string {
    const f = (freq || '').toLowerCase();
    if (f.includes('daily')) return 'freq-daily';
    if (f.includes('week')) return 'freq-weekly';
    if (f.includes('fortnight')) return 'freq-fortnight';
    if (f.includes('month')) return 'freq-monthly';
    if (f.includes('quarter')) return 'freq-quarterly';
    if (f.includes('semi') || f.includes('half')) return 'freq-semiannual';
    if (f.includes('year')) return 'freq-yearly';
    return 'freq-onetime';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLIED':
      case 'APPROVED':
        return 'badge-complied';
      case 'NOT_COMPLIED':
      case 'NEEDS_REDO':
        return 'badge-not-complied';
      default:
        return 'badge-pending';
    }
  }

  getFileIcon(filename: string): string {
    const f = (filename || '').toLowerCase();
    if (f.endsWith('.pdf')) return 'pi pi-file-pdf text-red-500';
    if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) return 'pi pi-image text-blue-500';
    if (f.endsWith('.xls') || f.endsWith('.xlsx') || f.endsWith('.csv')) return 'pi pi-file-excel text-green-500';
    if (f.endsWith('.doc') || f.endsWith('.docx')) return 'pi pi-file-word text-blue-600';
    return 'pi pi-file text-slate-500';
  }

  cleanFileName(url: string | null | undefined): string {
    if (!url) return 'Evidence Document';
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1];
      const clean = last.split('?')[0];
      return decodeURIComponent(clean);
    } catch {
      return url;
    }
  }
}
