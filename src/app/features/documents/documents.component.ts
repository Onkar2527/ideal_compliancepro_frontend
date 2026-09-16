import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ComplianceApiService, ComplianceDocument } from '../../core/services/api/compliance-api.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { AuthService } from '../../core/services/auth/auth.service';

export interface DepartmentOption {
  label: string;
  value: number | null;
  name: string;
  type?: string;
  isHead?: boolean;
  isSub?: boolean;
  isBranch?: boolean;
  parentId?: number | null;
  parentName?: string;
}

export interface UserOption {
  label: string;
  value: number;
  name: string;
  username: string;
  branch_id: number | null;
  branch_name?: string;
  role: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    DrawerModule,
    RippleModule,
    TagModule,
    TooltipModule,
    SelectModule,
    TextareaModule,
    InputTextModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  private api = inject(ComplianceApiService);
  private auth = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private notification = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);

  documents = signal<ComplianceDocument[]>([]);
  rawBranches = signal<any[]>([]);
  departments = signal<DepartmentOption[]>([]);
  allUsers = signal<UserOption[]>([]);
  users = computed(() => this.allUsers());
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  uploadingFile = signal<boolean>(false);

  // Current logged in user info
  currentUserId: number | null = null;
  currentUserName = '';
  currentUserRole = '';
  currentUserBranchId: number | null = null;

  // Search & Filters
  searchTerm = '';
  selectedDeptFilter: number | null = null;
  selectedAccessFilter: string | null = null;
  selectedStatusFilter: string | null = null;
  selectedTypeFilter: 'DOCUMENT' | 'EVIDENCE' | null = null;

  // Pagination
  rowsPerPageOptions = [10, 25, 50, 100];

  // Dialog State
  displayDialog = signal<boolean>(false);
  dialogMode = signal<'create' | 'edit'>('create');
  submitted = signal<boolean>(false);

  // Form Fields
  docId: number | null = null;
  docName = '';
  docNumber = '';
  issueDate = '';
  startDate = '';
  endDate = '';
  departmentId: number | null = null;
  userId: number | null = null;
  userName = '';
  accessLevel: 'PUBLIC' | 'PRIVATE' = 'PUBLIC';
  fileUrl: string | null = null;
  fileName: string | null = null;
  description = '';
  status = 'ACTIVE';

  // Preview Modal
  previewDialog = signal<boolean>(false);
  previewFileUrl = signal<string | null>(null);
  previewFileName = signal<string | null>(null);

  resolveFileUrl(url: string | null | undefined): string | null {
    return this.api.resolveFileUrl(url);
  }

  safePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const rawUrl = this.previewFileUrl();
    if (!rawUrl) return null;
    const fullUrl = this.resolveFileUrl(rawUrl);
    return fullUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl) : null;
  });

  // Department Options for Form (Including "All Branches / Departments")
  formDeptOptions = computed(() => {
    return [
      { label: '🌐 All Branches / Departments (Company-wide)', value: null, name: 'All Branches', isHead: false, isSub: false, isBranch: false },
      ...this.departments()
    ];
  });

  // Department Filter Options for Toolbar
  deptFilterOptions = computed(() => {
    return [
      { label: 'All Departments / Branches', value: null, name: 'All Departments', isHead: false, isSub: false, isBranch: false },
      ...this.departments()
    ];
  });

  // Get department info by ID
  getDepartmentInfo(deptId: number | null | undefined): DepartmentOption | null {
    if (deptId === null || deptId === undefined) return null;
    const found = this.departments().find(d => Number(d.value) === Number(deptId));
    if (found) return found;

    // Fallback search in rawBranches
    const raw = this.rawBranches().find(b => Number(b.id) === Number(deptId));
    if (!raw) return null;
    const parent = raw.parent_id ? this.rawBranches().find(b => Number(b.id) === Number(raw.parent_id)) : null;
    return {
      label: raw.name,
      value: Number(raw.id),
      name: raw.name,
      isHead: raw.type === 'DEPARTMENT' && !raw.parent_id,
      isSub: raw.type === 'DEPARTMENT' && !!raw.parent_id,
      isBranch: raw.type === 'BRANCH',
      parentId: raw.parent_id ? Number(raw.parent_id) : null,
      parentName: parent ? parent.name : undefined
    };
  }

  get selectedDepartmentInfo(): DepartmentOption | null {
    return this.getDepartmentInfo(this.departmentId);
  }

  // User Options for Form (Dynamically filtered by selected Department/Branch & Sub-Departments)
  formUserOptions = computed<UserOption[]>(() => {
    const selectedDeptId = this.departmentId;
    const users = this.allUsers();
    if (selectedDeptId === null || selectedDeptId === undefined) {
      // "All Branches" selected -> Show all users across company
      return users;
    }
    
    const deptInfo = this.getDepartmentInfo(selectedDeptId);
    if (deptInfo?.isHead) {
      // If a Head Department is selected, include users in the Head Dept AND all its child Sub-Departments
      const childDeptIds = this.rawBranches()
        .filter(b => Number(b.parent_id) === Number(selectedDeptId))
        .map(b => Number(b.id));
      const targetIds = new Set([Number(selectedDeptId), ...childDeptIds]);
      const filtered = users.filter(u => u.branch_id !== null && targetIds.has(Number(u.branch_id)));
      return filtered.length > 0 ? filtered : users;
    }

    // Specific branch/sub-department selected -> Filter to users of this department
    const deptUsers = users.filter(u => Number(u.branch_id) === Number(selectedDeptId));
    return deptUsers.length > 0 ? deptUsers : users;
  });

  // Access Level Options for Form
  accessLevelOptions = [
    { label: 'Public (Department & Organization)', value: 'PUBLIC', icon: 'pi pi-globe', desc: 'Visible to CCO, CO, and all users in the assigned department' },
    { label: 'Private (Assigned Individual Only)', value: 'PRIVATE', icon: 'pi pi-lock', desc: 'Restricted: visible only to CCO, CO, and the specifically assigned employee' }
  ];

  // Access Filter Options for Toolbar
  accessFilterOptions = [
    { label: 'All Visibility', value: null },
    { label: 'Public Documents', value: 'PUBLIC' },
    { label: 'Private Documents', value: 'PRIVATE' }
  ];

  // Status Filter Options
  statusFilterOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Expiring Soon', value: 'EXPIRING_SOON' },
    { label: 'Expired', value: 'EXPIRED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Archived', value: 'ARCHIVED' }
  ];

  // Document Status Options for Form
  formStatusOptions = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Archived', value: 'ARCHIVED' }
  ];

  // Type Filter Options for Toolbar (Master Documents vs Task Evidence)
  typeFilterOptions = [
    { label: 'All Types (Docs & Evidence)', value: null },
    { label: '📁 Master Documents', value: 'DOCUMENT' },
    { label: '📎 Task Evidence', value: 'EVIDENCE' }
  ];

  // Calculated Summary Statistics
  totalCount = computed(() => this.visibleDocuments.length);
  activeCount = computed(() => this.visibleDocuments.filter(d => this.getDocumentStatus(d) === 'ACTIVE').length);
  publicCount = computed(() => this.visibleDocuments.filter(d => (d.access_level || 'PUBLIC') === 'PUBLIC').length);
  privateCount = computed(() => this.visibleDocuments.filter(d => d.access_level === 'PRIVATE').length);
  evidenceCount = computed(() => this.visibleDocuments.filter(d => !!d.is_evidence).length);
  masterDocCount = computed(() => this.visibleDocuments.filter(d => !d.is_evidence).length);
  expiringSoonCount = computed(() => this.visibleDocuments.filter(d => this.getDocumentStatus(d) === 'EXPIRING_SOON').length);
  expiredCount = computed(() => this.visibleDocuments.filter(d => this.getDocumentStatus(d) === 'EXPIRED').length);

  /**
   * Determine if logged in user has administrative / elevated access
   */
  get isElevatedUser(): boolean {
    const role = (this.currentUserRole || '').toUpperCase();
    return (
      role === 'ADMIN' ||
      role === 'SUPERADMIN' ||
      role === 'CCO' ||
      role === 'CCO_REVIEWER' ||
      role === 'CO' ||
      role === 'CO_REVIEWER' ||
      role === 'REVIEWER'
    );
  }

  /**
   * Check if current user is the owner/creator of the document
   */
  isOwner(doc: ComplianceDocument): boolean {
    if (!doc) return false;
    if (this.currentUserId !== null && doc.created_by_user_id !== null && doc.created_by_user_id !== undefined) {
      if (Number(doc.created_by_user_id) === Number(this.currentUserId)) return true;
    }
    if (this.currentUserId !== null && doc.user_id !== null && doc.user_id !== undefined) {
      if (Number(doc.user_id) === Number(this.currentUserId)) return true;
    }
    if (this.currentUserName && doc.created_by_username) {
      if (doc.created_by_username.toLowerCase().trim() === this.currentUserName.toLowerCase().trim()) return true;
    }
    if (this.currentUserName && doc.user_name) {
      if (doc.user_name.toLowerCase().trim() === this.currentUserName.toLowerCase().trim()) return true;
    }
    return false;
  }

  /**
   * Edit permission:
   * - Private doc: ONLY the creator/owner who created it can edit.
   * - Public doc: The creator can edit, or elevated administrative users (Admin, CCO, CO).
   */
  canEditDocument(doc: ComplianceDocument): boolean {
    if (!doc || doc.is_evidence) return false;
    const isPrivate = (doc.access_level || 'PUBLIC') === 'PRIVATE';
    if (isPrivate) {
      return this.isOwner(doc);
    }
    return this.isOwner(doc) || this.isElevatedUser;
  }

  /**
   * Delete permission:
   * - Private doc: ONLY the creator/owner who created it can delete.
   * - Public doc: The creator can delete, or elevated administrative users (Admin, CCO, CO).
   */
  canDeleteDocument(doc: ComplianceDocument): boolean {
    if (!doc || doc.is_evidence) return false;
    const isPrivate = (doc.access_level || 'PUBLIC') === 'PRIVATE';
    if (isPrivate) {
      return this.isOwner(doc);
    }
    return this.isOwner(doc) || this.isElevatedUser;
  }

  /**
   * Visibility check according to document privacy and user department:
   * 1. When document is PRIVATE:
   *    - Strictly visible ONLY to the creator / owner who created it.
   * 2. When document is PUBLIC:
   *    - Elevated users (CCO, CO, Admin) can view all public documents.
   *    - Company-wide / All Branches documents are visible to everyone.
   *    - Department documents are visible to all members/heads of that department (department_id === currentUserBranchId).
   */
  isDocumentVisibleToCurrentUser(doc: ComplianceDocument): boolean {
    const docAccess = doc.access_level || 'PUBLIC';

    if (docAccess === 'PRIVATE') {
      // Private document: strictly visible ONLY to the specific user it is assigned to / created for.
      if (doc.user_id !== null && doc.user_id !== undefined) {
        const matchesId = this.currentUserId !== null && Number(doc.user_id) === Number(this.currentUserId);
        const matchesName = Boolean(this.currentUserName && doc.user_name && doc.user_name.toLowerCase().trim() === this.currentUserName.toLowerCase().trim());
        return matchesId || matchesName;
      }

      // If no specific user was assigned, strictly visible ONLY to the creator
      if (doc.created_by_user_id !== null && doc.created_by_user_id !== undefined) {
        const matchesCreatorId = this.currentUserId !== null && Number(doc.created_by_user_id) === Number(this.currentUserId);
        const matchesCreatorName = Boolean(this.currentUserName && doc.created_by_username && doc.created_by_username.toLowerCase().trim() === this.currentUserName.toLowerCase().trim());
        return matchesCreatorId || matchesCreatorName;
      }

      return false;
    }

    // Public document: Elevated users (CCO, CO, Admin) can see all public documents
    if (this.isElevatedUser) {
      return true;
    }

    // Creator can always view their own documents
    if (this.isOwner(doc)) {
      return true;
    }

    // Public document: visible if assigned to "All Branches" (null) or to the user's branch / sub-dept
    if (doc.department_id === null || doc.department_id === undefined) {
      return true; // Company-wide
    }

    if (this.currentUserBranchId !== null && doc.department_id !== null && doc.department_id !== undefined) {
      const docDeptId = Number(doc.department_id);
      const userDeptId = Number(this.currentUserBranchId);
      
      // Exact match (same department or sub-department)
      if (docDeptId === userDeptId) return true;

      // 1. Head Department user viewing document from child Sub-Department
      const subDeptIds = this.rawBranches()
        .filter(b => Number(b.parent_id) === userDeptId)
        .map(b => Number(b.id));
      if (subDeptIds.includes(docDeptId)) return true;

      // 2. Sub-Department user viewing document uploaded by / for parent Head Department
      const userBranch = this.rawBranches().find(b => Number(b.id) === userDeptId);
      if (userBranch && userBranch.parent_id && Number(userBranch.parent_id) === docDeptId) {
        return true;
      }

      // 3. Sub-Department user viewing document from a sibling Sub-Department under the same Head Dept
      if (userBranch && userBranch.parent_id) {
        const docBranch = this.rawBranches().find(b => Number(b.id) === docDeptId);
        if (docBranch && docBranch.parent_id && Number(docBranch.parent_id) === Number(userBranch.parent_id)) {
          return true;
        }
      }
    }

    // Also allow if user is specifically assigned to it
    if (this.currentUserId !== null && doc.user_id !== null && Number(doc.user_id) === Number(this.currentUserId)) {
      return true;
    }

    return false;
  }

  /**
   * List of documents visible to current user
   */
  get visibleDocuments(): ComplianceDocument[] {
    return this.documents().filter(doc => this.isDocumentVisibleToCurrentUser(doc));
  }

  /**
   * Filtered List matching search and toolbar filters
   */
  get filteredDocumentsList(): ComplianceDocument[] {
    let list = this.visibleDocuments;
    const search = (this.searchTerm || '').toLowerCase().trim();
    const dept = this.selectedDeptFilter;
    const access = this.selectedAccessFilter;
    const st = this.selectedStatusFilter;

    if (search) {
      list = list.filter(d => 
        (d.document_name && d.document_name.toLowerCase().includes(search)) ||
        (d.document_number && d.document_number.toLowerCase().includes(search)) ||
        (d.department_name && d.department_name.toLowerCase().includes(search)) ||
        (d.user_name && d.user_name.toLowerCase().includes(search)) ||
        (d.description && d.description.toLowerCase().includes(search))
      );
    }

    if (dept !== null && dept !== undefined) {
      const deptInfo = this.getDepartmentInfo(dept);
      if (deptInfo?.isHead) {
        // If filtering by Head Department, show documents from this Head Dept and all its Sub-Departments
        const childDeptIds = this.rawBranches()
          .filter(b => Number(b.parent_id) === Number(dept))
          .map(b => Number(b.id));
        const targetIds = new Set([Number(dept), ...childDeptIds]);
        list = list.filter(d => d.department_id !== null && d.department_id !== undefined && targetIds.has(Number(d.department_id)));
      } else {
        list = list.filter(d => Number(d.department_id) === Number(dept));
      }
    }

    if (access !== null && access !== undefined) {
      list = list.filter(d => (d.access_level || 'PUBLIC') === access);
    }

    if (st !== null && st !== undefined) {
      list = list.filter(d => this.getDocumentStatus(d) === st);
    }

    if (this.selectedTypeFilter === 'DOCUMENT') {
      list = list.filter(d => !d.is_evidence);
    } else if (this.selectedTypeFilter === 'EVIDENCE') {
      list = list.filter(d => !!d.is_evidence);
    }

    return list;
  }

  ngOnInit(): void {
    const cached = this.api.getCachedBranches();
    if (cached && cached.length > 0) {
      this.rawBranches.set(cached);
    }
    this.loadCurrentUser();
    this.loadDepartments();
    this.loadUsers();
    this.loadDocuments();
  }

  loadCurrentUser(): void {
    try {
      const u = this.auth.currentUser();
      if (u) {
        this.currentUserId = u.id ? Number(u.id) : null;
        this.currentUserName = u.full_name || u.fullName || u.name || u.username || 'User';
        this.currentUserRole = String(u.role || '').toUpperCase();
        this.currentUserBranchId = u.branch_id ? Number(u.branch_id) : (u.branchId ? Number(u.branchId) : null);
        return;
      }
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      if (stored) {
        this.currentUserId = stored.id ? Number(stored.id) : (stored.user_id ? Number(stored.user_id) : null);
        this.currentUserName = stored.full_name || stored.name || stored.username || 'User';
        this.currentUserRole = String(stored.role || '').toUpperCase();
        this.currentUserBranchId = stored.branch_id ? Number(stored.branch_id) : (stored.branchId ? Number(stored.branchId) : null);
      }
    } catch {
      this.currentUserName = 'User';
    }
  }

  loadDepartments(): void {
    this.api.getBranches().subscribe({
      next: (data) => {
        const raw = data || [];
        this.rawBranches.set(raw);
        const deptMap = new Map(raw.map((b: any) => [Number(b.id), b.name]));

        const mainDepts = raw.filter((b: any) => b.type === 'DEPARTMENT' && !b.parent_id);
        const subDepts = raw.filter((b: any) => b.type === 'DEPARTMENT' && !!b.parent_id);
        const branches = raw.filter((b: any) => b.type === 'BRANCH');

        const options: DepartmentOption[] = [];

        // 1. Head Departments with their Sub-Departments directly under them
        for (const head of mainDepts) {
          options.push({
            label: `🏛️ ${head.name} (Head Dept)`,
            value: Number(head.id),
            name: head.name,
            type: 'DEPARTMENT',
            isHead: true,
            isSub: false,
            isBranch: false,
            parentId: null
          });

          const children = subDepts.filter((s: any) => Number(s.parent_id) === Number(head.id));
          for (const sub of children) {
            options.push({
              label: `　↳ ${sub.name} [Sub-Dept of ${head.name}]`,
              value: Number(sub.id),
              name: sub.name,
              type: 'DEPARTMENT',
              isHead: false,
              isSub: true,
              isBranch: false,
              parentId: Number(head.id),
              parentName: head.name
            });
          }
        }

        // 2. Any orphan sub-departments (parent_id points to something else or missing)
        const handledSubIds = new Set(options.map(o => o.value));
        for (const sub of subDepts) {
          if (!handledSubIds.has(Number(sub.id))) {
            const pName = deptMap.get(Number(sub.parent_id)) || 'Parent Dept';
            options.push({
              label: `　↳ ${sub.name} [Sub-Dept of ${pName}]`,
              value: Number(sub.id),
              name: sub.name,
              type: 'DEPARTMENT',
              isHead: false,
              isSub: true,
              isBranch: false,
              parentId: Number(sub.parent_id),
              parentName: pName
            });
          }
        }

        // 3. Branches
        for (const branch of branches) {
          options.push({
            label: `📍 ${branch.name} (Branch)`,
            value: Number(branch.id),
            name: branch.name,
            type: 'BRANCH',
            isBranch: true,
            isHead: false,
            isSub: false,
            parentId: null
          });
        }

        this.departments.set(options);
      },
      error: () => {
        this.departments.set([]);
      }
    });
  }

  loadUsers(): void {
    this.api.getUsers().subscribe({
      next: (data) => {
        const mappedUsers: UserOption[] = (data || []).map((u: any) => {
          const empName = u.full_name || u.fullName || u.name || u.username;
          const label = u.full_name ? `${u.full_name} (${u.username})` : u.username;
          const roleTag = u.role ? ` [${u.role}]` : '';
          const branchTag = u.branch_name ? ` • ${u.branch_name}` : '';
          return {
            label: `${label}${roleTag}${branchTag}`,
            value: Number(u.id),
            name: empName,
            username: u.username,
            branch_id: u.branch_id ? Number(u.branch_id) : (u.branchId ? Number(u.branchId) : null),
            branch_name: u.branch_name || '',
            role: u.role || ''
          };
        });
        this.allUsers.set(mappedUsers);
      },
      error: () => {
        this.allUsers.set([]);
      }
    });
  }

  onDepartmentChange(deptId: number | null): void {
    this.departmentId = deptId;
    // If a user was selected that does not belong to this department, keep or re-evaluate
    if (deptId !== null && this.userId) {
      const usersInDept = this.allUsers().filter(u => u.branch_id === deptId);
      const stillValid = usersInDept.some(u => u.value === this.userId);
      if (!stillValid && usersInDept.length > 0) {
        // Auto-select the first user or clear
        this.userId = null;
        this.userName = '';
      }
    }
  }

  onUserChange(selectedUserId: number | null): void {
    if (!selectedUserId) {
      this.userId = null;
      this.userName = '';
      return;
    }
    const found = this.allUsers().find(u => u.value === selectedUserId);
    if (found) {
      this.userId = found.value;
      this.userName = found.name;
      // If no department is set yet, auto-set department to this user's branch
      if (this.departmentId === null && found.branch_id) {
        this.departmentId = found.branch_id;
      }
    }
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

  loadDocuments(isRefresh = false): void {
    this.loading.set(true);

    const cachedEvidences = this.api.getEvidenceDocuments();

    // 1 single fast HTTP call to get master documents
    this.api.getDocuments().subscribe({
      next: (masterDocs) => {
        const seenUrls = new Set<string>();
        (masterDocs || []).forEach(d => {
          if (d.file_url) seenUrls.add(d.file_url.toLowerCase().trim());
        });

        const dedupedEvidences = cachedEvidences.filter(ev => {
          if (!ev.file_url) return true;
          return !seenUrls.has(ev.file_url.toLowerCase().trim());
        });

        const combined = [...(masterDocs || []), ...dedupedEvidences];
        this.documents.set(combined);
        this.loading.set(false);
        if (isRefresh) {
          this.notification.info('Asset Management list refreshed');
        }

        // Lightweight background sync (only if cache is empty or on manual refresh)
        if (cachedEvidences.length === 0 || isRefresh) {
          this.syncRecentEvidencesInBackground();
        }
      },
      error: (err) => {
        this.documents.set(cachedEvidences);
        this.loading.set(false);
        this.notification.error('Failed to load documents: ' + (err.message || 'Error'));
      }
    });
  }

  /**
   * Non-blocking background sync for recent assignments
   */
  private syncRecentEvidencesInBackground(): void {
    const userBranchId = this.currentUserBranchId;
    const isElevated = this.isElevatedUser;

    this.api.getAssignments({ limit: 15 }).pipe(catchError(() => of({ data: [] }))).subscribe({
      next: (res) => {
        const rawAssignments = res?.data || [];
        const currentBranches = this.rawBranches();

        let relevantAssignments = rawAssignments;
        if (!isElevated && userBranchId) {
          const userBranch = currentBranches.find(b => Number(b.id) === Number(userBranchId));
          const parentId = userBranch?.parent_id ? Number(userBranch.parent_id) : null;
          const subDeptIds = currentBranches
            .filter(b => Number(b.parent_id) === Number(userBranchId))
            .map(b => Number(b.id));
          const allowedDeptIds = new Set([Number(userBranchId), ...(parentId ? [parentId] : []), ...subDeptIds]);

          relevantAssignments = rawAssignments.filter((asg: any) => {
            const bId = asg.branch_id ? Number(asg.branch_id) : null;
            if (bId !== null && allowedDeptIds.has(bId)) return true;
            if (userBranch?.name && asg.branch_name && asg.branch_name.toLowerCase().trim() === userBranch.name.toLowerCase().trim()) return true;
            return false;
          });
        }

        if (relevantAssignments.length === 0) return;

        const observables = relevantAssignments.slice(0, 10).map((asg: any) =>
          forkJoin({
            evidenceList: this.api.getAssignmentEvidence(asg.id).pipe(catchError(() => of([]))),
            tasksList: this.api.getAssignmentTasks(asg.id).pipe(catchError(() => of([])))
          }).pipe(
            map(({ evidenceList, tasksList }) => ({
              asg,
              evidenceList: Array.isArray(evidenceList) ? evidenceList : [],
              tasksList: Array.isArray(tasksList) ? tasksList : []
            })),
            catchError(() => of({ asg, evidenceList: [], tasksList: [] }))
          )
        );

        forkJoin(observables).subscribe({
          next: (results) => {
            const newEvDocs: ComplianceDocument[] = [];
            const seenUrls = new Set<string>();

            results.forEach(({ asg, evidenceList, tasksList }) => {
              const taskMap = new Map<number, any>();
              tasksList.forEach(t => {
                if (t.assignment_task_id) taskMap.set(Number(t.assignment_task_id), t);
                if (t.task_id) taskMap.set(Number(t.task_id), t);
              });

              evidenceList.forEach((ev: any) => {
                if (!ev.file_url) return;
                const normalizedUrl = ev.file_url.toLowerCase().trim();
                if (seenUrls.has(normalizedUrl)) return;
                seenUrls.add(normalizedUrl);

                const matchedTask = taskMap.get(Number(ev.assignment_task_id || ev.task_id));
                const targetDeptId = matchedTask?.sub_dept_id || matchedTask?.branch_id || ev.sub_dept_id || asg.branch_id;
                const targetDeptName = matchedTask?.sub_dept_name || matchedTask?.branch_name || ev.sub_dept_name || asg.branch_name;
                const fileName = this.cleanFileName(ev.file_name || ev.filename || ev.file_url.split('/').pop()?.split('?')[0]);
                const docName = ev.name ? this.cleanFileName(ev.name) : fileName;

                newEvDocs.push({
                  id: 9000000 + Number(ev.id || Math.floor(Math.random() * 1000000)),
                  document_name: docName,
                  document_number: asg.task_set_name ? `TASK: ${asg.task_set_name}` : (ev.assignment_task_id ? `TASK-#${ev.assignment_task_id}` : 'TASK-EVIDENCE'),
                  issue_date: ev.created_at || ev.uploaded_at || asg.created_at || null,
                  created_at: ev.created_at || ev.uploaded_at || asg.created_at || new Date().toISOString(),
                  start_date: asg.start_date || null,
                  end_date: null,
                  department_id: targetDeptId ? Number(targetDeptId) : null,
                  department_name: targetDeptName || null,
                  user_id: ev.uploaded_by ? Number(ev.uploaded_by) : null,
                  user_name: ev.uploader_name || ev.uploaded_by_name || 'Branch Member',
                  file_url: ev.file_url,
                  file_name: fileName,
                  description: `Evidence for "${matchedTask?.task_title || matchedTask?.description || asg.task_set_name || 'Task Assignment'}"`,
                  status: 'ACTIVE',
                  access_level: 'PUBLIC',
                  is_evidence: true,
                  source_type: 'TASK_EVIDENCE'
                });
              });
            });

            if (newEvDocs.length > 0) {
              this.api.saveEvidenceDocuments(newEvDocs);
              // Re-merge with current master documents smoothly
              const currentDocs = this.documents().filter(d => !d.is_evidence);
              const masterUrls = new Set(currentDocs.map(d => (d.file_url || '').toLowerCase().trim()));
              const allCachedEvs = this.api.getEvidenceDocuments().filter(ev => !ev.file_url || !masterUrls.has(ev.file_url.toLowerCase().trim()));
              this.documents.set([...currentDocs, ...allCachedEvs]);
            }
          }
        });
      }
    });
  }

  getDocumentStatus(doc: ComplianceDocument): string {
    // Evidence documents never expire and are always actively valid
    if (doc.is_evidence) {
      return 'ACTIVE';
    }
    if (doc.status === 'DRAFT' || doc.status === 'ARCHIVED') {
      return doc.status;
    }
    if (!doc.end_date) {
      return doc.status || 'ACTIVE';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(doc.end_date);
    expDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return 'EXPIRED';
    }
    if (diffDays <= 30) {
      return 'EXPIRING_SOON';
    }
    return 'ACTIVE';
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRING_SOON':
        return 'warn';
      case 'EXPIRED':
        return 'danger';
      case 'DRAFT':
        return 'secondary';
      case 'ARCHIVED':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'EXPIRING_SOON': return 'Expiring Soon';
      case 'EXPIRED': return 'Expired';
      case 'DRAFT': return 'Draft';
      case 'ARCHIVED': return 'Archived';
      default: return status;
    }
  }

  openNew(): void {
    this.docId = null;
    this.docName = '';
    this.docNumber = '';
    this.issueDate = new Date().toISOString().split('T')[0];
    this.startDate = new Date().toISOString().split('T')[0];
    this.endDate = '';
    this.departmentId = this.currentUserBranchId || null;
    this.userId = this.currentUserId;
    this.userName = this.currentUserName;
    this.accessLevel = 'PUBLIC';
    this.fileUrl = null;
    this.fileName = null;
    this.description = '';
    this.status = 'ACTIVE';
    this.submitted.set(false);
    this.dialogMode.set('create');
    this.displayDialog.set(true);
  }

  editDocument(doc: ComplianceDocument): void {
    if (!this.canEditDocument(doc)) {
      this.notification.warn('You can only edit documents that you created or have authorization to manage.');
      return;
    }
    this.docId = doc.id;
    this.docName = doc.document_name || '';
    this.docNumber = doc.document_number || '';
    this.issueDate = doc.issue_date ? doc.issue_date.split('T')[0] : '';
    this.startDate = doc.start_date ? doc.start_date.split('T')[0] : '';
    this.endDate = doc.end_date ? doc.end_date.split('T')[0] : '';
    this.departmentId = doc.department_id !== undefined && doc.department_id !== null ? Number(doc.department_id) : null;
    this.userId = doc.user_id ? Number(doc.user_id) : null;
    this.userName = doc.user_name || '';
    this.accessLevel = (doc.access_level === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
    if (this.userId && !this.userName && this.allUsers().length > 0) {
      const found = this.allUsers().find(u => u.value === this.userId);
      if (found) {
        this.userName = found.name;
      }
    }
    this.fileUrl = doc.file_url || null;
    this.fileName = doc.file_name || (doc.file_url ? 'Attached Document' : null);
    this.description = doc.description || '';
    this.status = doc.status || 'ACTIVE';
    this.submitted.set(false);
    this.dialogMode.set('edit');
    this.displayDialog.set(true);
  }

  hideDialog(): void {
    this.displayDialog.set(false);
    this.submitted.set(false);
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!this.docName || !this.docName.trim()) {
      this.docName = file.name.replace(/\.[^/.]+$/, '');
    }

    this.uploadingFile.set(true);
    this.fileName = file.name;

    this.api.uploadDocumentFile(file).subscribe({
      next: (res) => {
        this.uploadingFile.set(false);
        this.fileUrl = res.file_url;
        this.fileName = res.filename || file.name;
        this.notification.success('File attached successfully');
      },
      error: () => {
        this.uploadingFile.set(false);
        this.fileUrl = URL.createObjectURL(file);
        this.notification.info('File selected for upload');
      }
    });
  }

  removeFile(): void {
    this.fileUrl = null;
    this.fileName = null;
  }

  viewFile(doc: ComplianceDocument): void {
    if (!doc.file_url) return;
    const fullUrl = this.resolveFileUrl(doc.file_url);
    if (fullUrl) window.open(fullUrl, '_blank');
  }

  previewFile(url: string | null, name: string | null): void {
    if (!url) return;
    this.previewFileUrl.set(url);
    this.previewFileName.set(name || 'Document Preview');
    this.previewDialog.set(true);
  }

  saveDocument(): void {
    this.submitted.set(true);

    if (!this.docName.trim()) {
      this.notification.warn('Please enter the Document Name');
      return;
    }

    const selectedDept = this.departmentId !== null ? this.departments().find(d => d.value === this.departmentId) : null;
    let finalUserName = this.userName ? this.userName.trim() : '';
    if (this.userId) {
      const foundUser = this.allUsers().find(u => u.value === this.userId);
      if (foundUser) {
        finalUserName = foundUser.name;
      }
    }

    const payload: Partial<ComplianceDocument> = {
      document_name: this.docName.trim(),
      document_number: this.docNumber.trim() || null,
      issue_date: this.issueDate || null,
      start_date: this.startDate || null,
      end_date: this.endDate || null,
      department_id: this.departmentId,
      department_name: selectedDept ? selectedDept.name : (this.departmentId === null ? 'All Branches' : null),
      user_id: this.userId,
      user_name: finalUserName || null,
      created_by_user_id: this.currentUserId,
      created_by_username: this.currentUserName,
      access_level: this.accessLevel,
      file_url: this.fileUrl,
      file_name: this.fileName,
      description: this.description.trim() || null,
      status: this.status
    };

    this.saving.set(true);

    if (this.dialogMode() === 'edit' && this.docId) {
      this.api.updateDocument(this.docId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.displayDialog.set(false);
          this.notification.success('Document updated successfully');
          this.loadDocuments();
        },
        error: (err) => {
          this.saving.set(false);
          this.notification.error('Failed to update document: ' + (err.message || 'Error'));
        }
      });
    } else {
      this.api.createDocument(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.displayDialog.set(false);
          this.notification.success('Document created successfully');
          this.loadDocuments();
        },
        error: (err) => {
          this.saving.set(false);
          this.notification.error('Failed to create document: ' + (err.message || 'Error'));
        }
      });
    }
  }

  deleteDocument(doc: ComplianceDocument): void {
    if (!this.canDeleteDocument(doc)) {
      this.notification.warn('You can only delete documents that you created or have authorization to manage.');
      return;
    }
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${doc.document_name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteDocument(doc.id).subscribe({
          next: () => {
            this.documents.update(docs => docs.filter(d => d.id !== doc.id));
            this.notification.success('Document deleted successfully');
          },
          error: (err) => {
            this.notification.error('Failed to delete document: ' + (err.message || 'Error'));
          }
        });
      }
    });
  }
}
