import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { APP_CONFIG } from '../config/config.token';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Authority {
  id: number;
  name: string;
  source_url?: string;
}

export interface Circular {
  id: number;
  authority_id: number;
  reference_no?: string | null;
  title: string;
  category?: string | null;
  published_date: string;
  priority?: string;
  circular_type?: number;
  circular_type_name?: string;
  description?: string | null;
  portal_website?: string | null;
  is_penalty_applicable?: boolean;
  penalty_amount?: number | null;
  penalty_description?: string | null;
  pdf_url?: string | null;
  authority_name?: string;
  circular_nature?: string;
  amendment_notes?: string | null;
  ai_processing_status?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  task_count?: number;
}

export interface ComplianceTask {
  id: number;
  circular_id: number;
  description: string;
  is_approved: boolean;
  status?: string;
  embedding?: number[];
  circular_title?: string;
  authority_name?: string;
  header_name?: string;
  priority?: string;
  risk_category?: string;
  business_risk?: string;
  control_risk?: string;
  audit_area_id?: number;
}

export interface ComplianceDocument {
  id: number;
  document_name: string;
  document_number?: string | null;
  issue_date?: string | null;
  created_at?: string;
  start_date?: string | null;
  end_date?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  description?: string | null;
  status?: string;
  access_level?: 'PUBLIC' | 'PRIVATE' | string;
  created_by_user_id?: number | null;
  created_by_username?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ComplianceApiService {
  private config = inject(APP_CONFIG);
  public baseUrl = this.config.apiUrl;

  constructor(private http: HttpClient) {}

  resolveFileUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const base = this.baseUrl || '';
    if (!base) return url;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  }

  canCcoAccessTaskSets(): boolean {
    const flag = this.config.cco_task_set_access;
    if (flag === 1 || flag === true || Number(flag) === 1) {
      return false;
    }
    return true;
  }

  isDirectSubDeptAssignment(): boolean {
    const flag = this.config.direct_subdept_assignment;
    if (flag === 1 || flag === true || Number(flag) === 1) {
      return true;
    }
    return false;
  }

  // Authorities
  getAuthorities() {
    return this.http.get<Authority[]>(`${this.baseUrl}/authorities`);
  }
  
  createAuthority(data: any) {
    return this.http.post<Authority>(`${this.baseUrl}/authorities`, data);
  }

  updateAuthority(id: number, data: any) {
    return this.http.patch<Authority>(`${this.baseUrl}/authorities/${id}`, data);
  }

  deleteAuthority(id: number) {
    return this.http.delete(`${this.baseUrl}/authorities/${id}`);
  }

  // Circulars
  getFileUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const serverUrl = this.baseUrl.replace(/\/api\/?$/, '');
    return `${serverUrl}/${cleanPath}`;
  }

  getCirculars(params?: any) {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Circular>>(`${this.baseUrl}/circulars`, { params: httpParams });
  }

  getCategories() {
    return this.http.get<any[]>(`${this.baseUrl}/circulars/categories`);
  }

  getCircularTasks(circularId: number) {
    return this.http.get<ComplianceTask[]>(`${this.baseUrl}/circulars/${circularId}/tasks`);
  }

  getCircularLogs(circularId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/circulars/${circularId}/logs`);
  }

  getAmendmentChain(circularId: number) {
    return this.http.get<{
      original: Circular | null;
      amendments: (Circular & { depth: number })[];
      isOriginal: boolean;
    }>(`${this.baseUrl}/circulars/${circularId}/amendment-chain`);
  }

  getCircularById(id: number) {
    return this.http.get<Circular>(`${this.baseUrl}/circulars/${id}`);
  }

  deleteCircular(id: number) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/circulars/${id}`);
  }

  createCircular(data: any) {
    return this.http.post<Circular>(`${this.baseUrl}/circulars`, data);
  }

  updateCircular(id: number, data: any) {
    return this.http.patch<Circular>(`${this.baseUrl}/circulars/${id}`, data);
  }

  createCircularWithFiles(data: FormData) {
    return this.http.post<Circular & { files?: any[]; task_count?: number; ai_processing_status?: string }>(`${this.baseUrl}/circulars`, data);
  }

  extractMetadata(data: FormData) {
    return this.http.post<{ reference_no: string | null; title: string | null; published_date: string | null }>(`${this.baseUrl}/circulars/extract-metadata`, data);
  }

  // Branches
  getBranches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/branches`).pipe(
      tap((branches) => {
        if (Array.isArray(branches)) {
          try {
            localStorage.setItem('compliance_branches_cache', JSON.stringify(branches));
          } catch {}
        }
      })
    );
  }

  getCachedBranches(): any[] {
    try {
      const raw = localStorage.getItem('compliance_branches_cache');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  createBranch(data: any) {
    return this.http.post<any>(`${this.baseUrl}/branches`, data);
  }

  updateBranch(id: number, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/branches/${id}`, data);
  }

  deleteBranch(id: number) {
    return this.http.delete(`${this.baseUrl}/branches/${id}`);
  }

  // Users
  getUsers() {
    return this.http.get<any[]>(`${this.baseUrl}/users`);
  }

  createUser(data: any) {
    return this.http.post<any>(`${this.baseUrl}/users`, data);
  }

  updateUser(id: string, data: any) {
    return this.http.put<any>(`${this.baseUrl}/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.http.delete(`${this.baseUrl}/users/${id}`);
  }
  getTasks(params?: any) {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<ComplianceTask>>(`${this.baseUrl}/tasks`, { params: httpParams });
  }

  getTaskStats(circularId?: number | null) {
    let httpParams = new HttpParams();
    if (circularId !== undefined && circularId !== null) {
      httpParams = httpParams.set('circular_id', String(circularId));
    }
    return this.http.get<{ total: number, pending: number, approved: number }>(`${this.baseUrl}/tasks/stats`, { params: httpParams });
  }

  // Backward compatibility methods if still used
  getPendingTasks() {
    return this.http.get<PaginatedResponse<ComplianceTask>>(`${this.baseUrl}/tasks?status=Pending`);
  }

  getApprovedTasks(params?: any) {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<ComplianceTask>>(`${this.baseUrl}/tasks`, { params: httpParams.set('status', 'Approved') });
  }

  approveTask(id: number) {
    return this.http.patch<ComplianceTask>(`${this.baseUrl}/tasks/${id}/approve`, {});
  }

  approveAllTasks(circularId?: number | null) {
    let httpParams = new HttpParams();
    if (circularId !== undefined && circularId !== null) {
      httpParams = httpParams.set('circularId', String(circularId));
    }
    return this.http.patch<{ count: number }>(`${this.baseUrl}/tasks/approve-all`, {}, { params: httpParams });
  }

  updateTaskDescription(id: number, payload: Partial<ComplianceTask> & { header_id?: number | null; file_url?: string | null }) {
    return this.http.put<ComplianceTask>(`${this.baseUrl}/tasks/${id}`, payload);
  }

  createManualTask(payload: Partial<ComplianceTask> & { circular_id: number; header_id?: number | null; file_url?: string | null }) {
    return this.http.post<ComplianceTask>(`${this.baseUrl}/tasks/manual`, payload);
  }

  uploadTaskFile(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ file_url: string; filename: string }>(`${this.baseUrl}/tasks/upload`, formData);
  }

  // Audit Areas
  getAuditAreas() {
    return this.http.get<any[]>(`${this.baseUrl}/audit-areas`);
  }

  // Task Sets
  getTaskSets() {
    return this.http.get<any[]>(`${this.baseUrl}/task-sets`);
  }

  // Task Headers
  getTaskHeaders() {
    return this.http.get<any[]>(`${this.baseUrl}/task-headers`);
  }

  createTaskHeader(name: string) {
    return this.http.post<any>(`${this.baseUrl}/task-headers`, { name });
  }

  updateTaskHeader(id: number, name: string) {
    return this.http.put<any>(`${this.baseUrl}/task-headers/${id}`, { name });
  }

  deleteTaskHeader(id: number) {
    return this.http.delete<any>(`${this.baseUrl}/task-headers/${id}`);
  }

  getTaskSet(id: number) {
    return this.http.get<any>(`${this.baseUrl}/task-sets/${id}`);
  }

  deleteTaskSet(id: number) {
    return this.http.delete<any>(`${this.baseUrl}/task-sets/${id}`);
  }

  createTaskSet(data: { name: string, default_due_date?: string, start_date?: string, end_date?: string, frequency?: string, reporting_date?: string, taskIds?: number[] }) {
    return this.http.post<any>(`${this.baseUrl}/task-sets`, data);
  }

  updateTaskSet(id: number, data: { name?: string, default_due_date?: string, start_date?: string, end_date?: string, frequency?: string, reporting_date?: string }) {
    return this.http.patch<any>(`${this.baseUrl}/task-sets/${id}`, data);
  }

  updateTaskSetMapping(setId: number, taskIds: number[], taskTimelines?: { task_id: number; due_date: string | null }[]) {
    return this.http.post<any>(`${this.baseUrl}/task-sets/${setId}/tasks`, { taskIds, taskTimelines });
  }

  reopenTaskSet(setId: number) {
    return this.http.post<any>(`${this.baseUrl}/task-sets/${setId}/reopen`, {});
  }

  // Assignments
  getAssignments(params?: any) {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/assignments`, { params: httpParams });
  }

  createAssignment(data: { task_set_id: number, branch_ids: number[], proposed_timeline: string }) {
    return this.http.post<any>(`${this.baseUrl}/assignments`, data);
  }

  proposeTimeline(id: number, date: string) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${id}/propose-timeline`, { date });
  }

  extendAssignmentTimeline(id: number, date: string) {
    return this.http.put<any>(`${this.baseUrl}/assignments/${id}/extend-timeline`, { date });
  }

  proposeSingleTaskTimeline(assignmentId: number, assignmentTaskId: number, proposedDueDate: string, proposedRemark?: string) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${assignmentTaskId}/propose-timeline`, { 
      proposed_due_date: proposedDueDate,
      proposed_remark: proposedRemark 
    });
  }

  reviewSingleTaskTimeline(assignmentId: number, assignmentTaskId: number, status: 'APPROVED' | 'REJECTED', remark?: string) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${assignmentTaskId}/review-timeline`, { status, remark });
  }

  proposeCustomTimeline(id: number, date: string, taskTimelines: { assignment_task_id: number; proposed_due_date: string }[]) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${id}/propose-custom-timeline`, { date, task_timelines: taskTimelines });
  }

  acceptTimeline(id: number) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${id}/accept-timeline`, {});
  }

  acceptTimelineWithChanges(id: number, date?: string, taskTimelines?: { assignment_task_id: number; proposed_due_date: string }[]) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${id}/accept-timeline-with-changes`, { date, task_timelines: taskTimelines });
  }

  getAssignmentTasks(id: number) {
    return this.http.get<any[]>(`${this.baseUrl}/assignments/${id}/tasks?_t=${Date.now()}`);
  }

  getAssignmentEvidence(id: number) {
    return this.http.get<any[]>(`${this.baseUrl}/assignments/${id}/evidence`);
  }

  uploadTaskEvidence(assignmentId: number, taskId: number, formData: FormData) {
    return this.http.post<any>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${taskId}/evidence`, formData);
  }

  reviewAssignment(assignmentId: number, action: 'ACCEPT' | 'REJECT' | 'ESCALATE', remark: string) {
    return this.http.put(`${this.baseUrl}/assignments/${assignmentId}/review`, { action, remark });
  }

  reviewTaskStatus(assignmentId: number, taskId: number, reviewStatus: 'APPROVED' | 'NEEDS_REDO' | 'ESCALATED', reviewRemark?: string) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${taskId}/review-status`, {
      review_status: reviewStatus,
      review_remark: reviewRemark
    });
  }

  completeTaskDirectly(assignmentId: number, taskId: number, complianceStatus: 'COMPLIED' | 'NOT_COMPLIED', remarks: string) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${taskId}/complete`, { compliance_status: complianceStatus, remarks });
  }

  delegateTaskToSubDept(assignmentId: number, taskId: number, subDeptId: number | null) {
    return this.http.patch<any>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${taskId}/delegate`, { sub_dept_id: subDeptId });
  }

  getTaskRemarksHistory(assignmentId: number, taskId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/assignments/${assignmentId}/tasks/${taskId}/remarks-history`);
  }

  updateAssignmentStatus(assignmentId: number, status: string) {
    return this.http.put<any>(`${this.baseUrl}/assignments/${assignmentId}/status`, { status });
  }

  updateTaskSetBranches(setId: number, branchIds: number[]) {
    return this.http.post<any>(`${this.baseUrl}/task-sets/${setId}/branches`, { branchIds });
  }

  generateAssignments(taskSetId?: number) {
    return this.http.post<any>(`${this.baseUrl}/assignments/generate-assignments`, { task_set_id: taskSetId });
  }

  // Dashboard
  getDashboardStats() {
    return this.http.get<any>(`${this.baseUrl}/dashboard/stats?_t=${Date.now()}`);
  }

  // Bulk Upload Tasks
  bulkUploadTasks(data: { rows: any[]; [key: string]: any }) {
    return this.http.post<any>(`${this.baseUrl}/master-bulk-upload/tasks`, data);
  }

  extractTasksFromText(text: string) {
    return this.http.post<{ tasks: string[] }>(`${this.baseUrl}/tasks/extract-from-text`, { text });
  }

  createBulkTasks(circularId: number, tasks: any[], extraData?: any) {
    return this.http.post<any>(`${this.baseUrl}/tasks/bulk`, { circular_id: circularId, tasks, ...(extraData || {}) });
  }

  bulkUploadTaskSets(formData: FormData) {
    return this.http.post<any>(`${this.baseUrl}/task-sets/bulk-upload`, formData);
  }

  // Holidays
  getHolidays(year?: number, month?: number) {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    return this.http.get<any[]>(`${this.baseUrl}/holidays`, { params });
  }

  addHoliday(date: string, name: string) {
    return this.http.post<any>(`${this.baseUrl}/holidays`, { date, name });
  }

  deleteHoliday(id: number) {
    return this.http.delete<any>(`${this.baseUrl}/holidays/${id}`);
  }

  // Document Master
  private getLocalDocuments(): ComplianceDocument[] {
    try {
      const data = localStorage.getItem('compliancepro_document_master');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalDocuments(docs: ComplianceDocument[]): void {
    try {
      localStorage.setItem('compliancepro_document_master', JSON.stringify(docs));
    } catch (e) {
      console.warn('Failed to save documents to local storage:', e);
    }
  }

  getDocuments(): Observable<ComplianceDocument[]> {
    return this.http.get<ComplianceDocument[]>(`${this.baseUrl}/documents`).pipe(
      tap((docs) => {
        if (Array.isArray(docs)) {
          this.saveLocalDocuments(docs);
        }
      }),
      catchError(() => {
        return of(this.getLocalDocuments());
      })
    );
  }

  createDocument(payload: Partial<ComplianceDocument>): Observable<ComplianceDocument> {
    return this.http.post<ComplianceDocument>(`${this.baseUrl}/documents`, payload).pipe(
      tap((created) => {
        const local = this.getLocalDocuments();
        this.saveLocalDocuments([created, ...local]);
      }),
      catchError(() => {
        const local = this.getLocalDocuments();
        const newDoc: ComplianceDocument = {
          id: Date.now(),
          document_name: payload.document_name || '',
          document_number: payload.document_number || null,
          issue_date: payload.issue_date || null,
          created_at: new Date().toISOString(),
          start_date: payload.start_date || null,
          end_date: payload.end_date || null,
          department_id: payload.department_id || null,
          department_name: payload.department_name || null,
          user_id: payload.user_id || null,
          user_name: payload.user_name || null,
          file_url: payload.file_url || null,
          file_name: payload.file_name || null,
          description: payload.description || null,
          status: payload.status || 'ACTIVE',
          access_level: payload.access_level || 'PUBLIC'
        };
        this.saveLocalDocuments([newDoc, ...local]);
        return of(newDoc);
      })
    );
  }

  updateDocument(id: number, payload: Partial<ComplianceDocument>): Observable<ComplianceDocument> {
    return this.http.put<ComplianceDocument>(`${this.baseUrl}/documents/${id}`, payload).pipe(
      tap((updated) => {
        const local = this.getLocalDocuments();
        const idx = local.findIndex(d => d.id === id);
        if (idx !== -1) local[idx] = updated;
        this.saveLocalDocuments(local);
      }),
      catchError(() => {
        const local = this.getLocalDocuments();
        const idx = local.findIndex(d => d.id === id);
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...payload };
          this.saveLocalDocuments(local);
          return of(local[idx]);
        }
        return of({ ...payload, id } as ComplianceDocument);
      })
    );
  }

  deleteDocument(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documents/${id}`).pipe(
      tap(() => {
        const local = this.getLocalDocuments().filter(d => d.id !== id);
        this.saveLocalDocuments(local);
      }),
      catchError(() => {
        const local = this.getLocalDocuments().filter(d => d.id !== id);
        this.saveLocalDocuments(local);
        return of({ success: true });
      })
    );
  }

  uploadDocumentFile(file: File): Observable<{ file_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('folder', 'compliance_documents');
    formData.append('subfolder', 'compliance_documents');
    formData.append('type', 'compliance_documents');
    return this.http.post<{ file_url: string; filename: string }>(`${this.baseUrl}/tasks/upload?folder=compliance_documents`, formData).pipe(
      catchError(() => {
        const blobUrl = URL.createObjectURL(file);
        return of({ file_url: blobUrl, filename: file.name });
      })
    );
  }
}

