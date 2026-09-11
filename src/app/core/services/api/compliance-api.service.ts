import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class ComplianceApiService {
  private config = inject(APP_CONFIG);
  public baseUrl = this.config.apiUrl;

  constructor(private http: HttpClient) {}

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
  getBranches() {
    return this.http.get<any[]>(`${this.baseUrl}/branches`);
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
  bulkUploadTasks(data: { rows: any[] }) {
    return this.http.post<any>(`${this.baseUrl}/master-bulk-upload/tasks`, data);
  }

  extractTasksFromText(text: string) {
    return this.http.post<{ tasks: string[] }>(`${this.baseUrl}/tasks/extract-from-text`, { text });
  }

  createBulkTasks(circularId: number, tasks: { description: string }[]) {
    return this.http.post<any>(`${this.baseUrl}/tasks/bulk`, { circular_id: circularId, tasks });
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
}

