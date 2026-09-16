import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplianceApiService, Circular, Authority } from '../../core/services/api/compliance-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from '../../core/services/config/config.token';
import { Router, ActivatedRoute } from '@angular/router';
import { TableComponent, TableColumn, TableAction } from '../../shared/components/table/table.component';
import { TextFieldComponent } from '../../shared/components/form/text-field/text-field.component';
import { TextareaFieldComponent } from '../../shared/components/form/textarea-field/textarea-field.component';
import { SelectFieldComponent } from '../../shared/components/form/select-field/select-field.component';
import { CheckboxFieldComponent } from '../../shared/components/form/checkbox-field/checkbox-field.component';
import { DateRangeFieldComponent } from '../../shared/components/form/date-range-field/date-range-field.component';
import { PageComponent } from '../../shared/components/page/page.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DrawerModule } from 'primeng/drawer';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-circulars',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableComponent,
    TextFieldComponent,
    TextareaFieldComponent,
    SelectFieldComponent,
    CheckboxFieldComponent,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    CheckboxModule,
    DrawerModule,
    FileUploadModule,
    ProgressBarModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    SelectModule,
    TagModule,
    DatePickerModule,
    MenuModule,
    TooltipModule
  ],
  templateUrl: './circulars.component.html',
  styleUrl: './circulars.component.css'
})
export class CircularsComponent implements OnInit, OnDestroy {
  circulars = signal<Circular[]>([]);
  authorities = signal<Authority[]>([]);

  // Dynamic filter state
  activeFilters = signal<{ authority: boolean; dateRange: boolean; institution: boolean }>({
    authority: true,
    dateRange: true,
    institution: true
  });

  selectedDateRange = signal<Date[] | null>([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0),
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0, 0)
  ]);
  selectedInstitution = signal<string>('');
  private filterInitialized = false;

  filterMenuItems: MenuItem[] = [
    {
      label: 'Authority',
      icon: 'pi pi-building',
      command: () => this.addFilter('authority')
    },
    {
      label: 'Date Range',
      icon: 'pi pi-calendar',
      command: () => this.addFilter('dateRange')
    },
    {
      label: 'Institution',
      icon: 'pi pi-university',
      command: () => this.addFilter('institution')
    }
  ];

  showCircularDrawer = signal<boolean>(false);
  uploading = signal<boolean>(false);
  selectedCircularFiles = signal<File[]>([]);
  processingState = signal<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  processingMessage = signal<string>('');
  lastTaskCount = signal<number>(0);

  totalRecords = signal<number>(0);
  page = 1;
  limit = 10;
  searchQuery = '';

  newAuthorityId = signal<any>(null);
  referenceNo = '';
  referenceNoField = signal<string>('');
  circularTitle = '';
  circularTitleField = signal<string>('');
  circularDate = signal<string>('');
  priority = signal<string>('Medium');
  circularType = signal<string>('6');
  description = '';
  descriptionField = signal<string>('');
  portalWebsite = '';
  portalWebsiteField = signal<string>('');
  isPenaltyApplicable = false;
  penaltyAmount: number | null = null;
  penaltyDescription = '';
  penaltyDescriptionField = signal<string>('');

  isApplicable = signal<boolean>(true);
  isActive = signal<boolean>(true);
  loading = signal<boolean>(true);
  editingCircularId = signal<number | null>(null);
  selectedAuthorityFilter = signal<number | null>(null);
  categories = signal<any[]>([]);
  selectedCategoryFilter = signal<string | null>(null);
  categoryField = signal<string>('');

  priorityOptions = [
    { label: 'Critical', value: 'Critical' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  circularTypeOptions = [
    { label: 'Regulatory & Statutory Compliance', value: '1' },
    { label: 'Supervisory Compliance', value: '2' },
    { label: 'Compliances to Advisories', value: '3' },
    { label: 'Compliances to Custom Requirements', value: '4' },
    { label: 'Compliances to Policy Guidelines, SOPs', value: '5' },
    { label: 'General Compliances', value: '6' },
  ];

  showChatDrawer = signal<boolean>(false);
  chatCircular = signal<Circular | null>(null);
  chatMessages = signal<{ role: 'user' | 'ai', content: string }[]>([]);
  chatInput = signal<string>('');
  isTyping = signal<boolean>(false);

  showLogsModal = false;
  activeLogs = signal<any[]>([]);
  activeLogsCircularId: number | null = null;
  logsPollingInterval: any;
  eventSource: EventSource | null = null;
  streamingLogText = signal<string>('');
  streamingThinkingText = signal<string>('');

  showAmendmentChainModal = signal<boolean>(false);
  amendmentChainData = signal<{ original: Circular | null, amendments: any[], isOriginal: boolean } | null>(null);
  modalCircular = signal<any | null>(null);

  prioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  }

  getFileUrl(url: string | null | undefined): string {
    return this.api.getFileUrl(url);
  }

  private config: any = inject(APP_CONFIG);

  tableColumns: TableColumn[] = [
    { field: 'reference_no', header: 'Reference No.', width: '170px' },
    { field: 'authority_name', header: 'Authority', width: '150px' },
    { field: 'category', header: 'Category', width: '190px' },
    { field: 'title', header: 'Circular Title', width: '360px' },
    { field: 'published_date', header: 'Circular Date', type: 'date', width: '100px' },
    { field: 'circular_nature', header: 'Nature', type: 'badge', width: '160px' },
    { field: 'task_count', header: 'Tasks', type: 'number', width: '75px', align: 'center', headerAlign: 'center', sortable: true },
    {
      field: 'is_applicable',
      header: 'Applicable',
      type: 'boolean_toggle',
      width: '85px',
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      booleanActionTrueIcon: 'pi-toggle-on',
      booleanActionFalseIcon: 'pi-toggle-off',
      booleanActionTrueLabel: 'Applicable',
      booleanActionFalseLabel: 'Not Applicable',
      booleanActionTrueClass: 'p-button-success',
      booleanActionFalseClass: 'p-button-secondary'
    },
    {
      field: 'is_active',
      header: 'Active',
      type: 'boolean_toggle',
      width: '80px',
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      booleanActionTrueIcon: 'pi-toggle-on',
      booleanActionFalseIcon: 'pi-toggle-off',
      booleanActionTrueLabel: 'Active',
      booleanActionFalseLabel: 'Inactive',
      booleanActionTrueClass: 'p-button-success',
      booleanActionFalseClass: 'p-button-secondary'
    },
    { field: 'ai_processing_status', header: 'Status', width: '110px' }
  ];

  private auth = inject(AuthService);

  tableActions: TableAction[] = [
    {
      label: 'View PDF',
      icon: 'pi pi-file-pdf',
      disabled: (row) => row?.ai_processing_status === 'QUEUED' || row?.ai_processing_status === 'PROCESSING',
      command: (row) => window.open(this.api.getFileUrl(row.pdf_url), '_blank')
    },
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      styleClass: 'text-primary-500',
      disabled: (row) => row?.ai_processing_status === 'QUEUED' || row?.ai_processing_status === 'PROCESSING',
      command: (row) => this.openEditModal(row)
    },
    {
      label: 'Tasks',
      icon: 'pi pi-list',
      disabled: (row) => row?.ai_processing_status === 'QUEUED' || row?.ai_processing_status === 'PROCESSING',
      command: (row) => this.viewTasks(row.id)
    },
    {
      label: 'Task Set Master',
      icon: 'pi pi-list-check',
      styleClass: 'text-green-600',
      visible: () => {
        const user = this.auth.currentUser();
        const role = String(user?.role || '').toLowerCase();
        return role !== 'cco' || this.api.canCcoAccessTaskSets();
      },
      command: (row) => this.router.navigate(['/task-sets'], { queryParams: { circular_id: row.id, parent_page: this.page, parent_limit: this.limit } })
    },
    {
      label: 'Ask AI',
      icon: 'pi pi-comment',
      styleClass: 'text-purple-700',
      disabled: (row) => row?.ai_processing_status === 'QUEUED' || row?.ai_processing_status === 'PROCESSING',
      command: (row) => this.router.navigate(['/circulars', row.id, 'chat'])
    },
    {
      label: 'Amendment Chain',
      icon: 'pi pi-link',
      styleClass: 'text-teal-600',
      command: (row) => this.openAmendmentChainModal(row)
    },
    // {
    //   label: 'View Logs',
    //   icon: 'pi pi-server',
    //   styleClass: 'text-blue-600',
    //   command: (row) => this.openLogsModal(row)
    // },
    // {
    //   label: (row: any) => row?.is_applicable ? 'Mark Not Applicable' : 'Mark Applicable',
    //   icon: (row: any) => row?.is_applicable ? 'pi pi-times-circle' : 'pi pi-check-circle',
    //   styleClass: 'text-orange-500',
    //   command: (row) => this.toggleCircularFlag(row, 'is_applicable')
    // },
    // {
    //   label: (row: any) => row?.is_active ? 'Deactivate' : 'Activate',
    //   icon: (row: any) => row?.is_active ? 'pi pi-ban' : 'pi pi-play-circle',
    //   styleClass: 'text-indigo-500',
    //   command: (row) => this.toggleCircularFlag(row, 'is_active')
    // },
    // {
    //   label: 'Delete',
    //   icon: 'pi pi-trash',
    //   styleClass: 'text-red-500',
    //   disabled: (row) => row?.ai_processing_status === 'QUEUED' || row?.ai_processing_status === 'PROCESSING',
    //   command: (row) => this.confirmDelete(row)
    // }
  ];

  highlightedCircularId = signal<number | null>(null);

  getCircularRowClass = (row: any) => {
    return this.highlightedCircularId() === row.id ? 'highlighted-row' : '';
  };

  constructor(
    private api: ComplianceApiService,
    private http: HttpClient,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {
    // Reactively watch for date picker changes via signal effect
    effect(() => {
      const dates = this.selectedDateRange();
      this.handleDateRangeFilterChange();
    });
  }

  handleTableActionClick(event: { name: string; row: any }) {
    console.log('[handleTableActionClick] name:', event.name, 'row id:', event.row.id);
    if (event.name === 'is_applicable') {
      this.toggleCircularFlag(event.row, 'is_applicable');
    } else if (event.name === 'is_active') {
      this.toggleCircularFlag(event.row, 'is_active');
    }
  }

  toggleCircularFlag(row: any, field: 'is_applicable' | 'is_active') {
    const newValue = row[field]; // Already updated by two-way [(ngModel)] binding
    const fieldLabel = field === 'is_applicable' ? 'Applicable' : 'Active';

    this.api.updateCircular(row.id, { [field]: newValue }).subscribe({
      next: () => {
        this.messageService.add({
          severity: newValue ? 'success' : 'warn',
          summary: `Circular ${fieldLabel} ${newValue ? 'Enabled' : 'Disabled'}`,
          detail: `"${row.title}" is now marked as ${fieldLabel} = ${newValue ? 'Yes' : 'No'}.`,
          life: 3500
        });
      },
      error: (err) => {
        // Revert on failure
        row[field] = !newValue;
        this.circulars.update(list =>
          list.map(c => c.id === row.id ? { ...c, [field]: !newValue } : c)
        );
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: `Could not update ${fieldLabel} status. Please try again.`,
          life: 4000
        });
        console.error(err);
      }
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const highlightId = params['highlight_id'];
      this.highlightedCircularId.set(highlightId ? Number(highlightId) : null);

      const parentPage = params['page'];
      if (parentPage) {
        this.page = Number(parentPage);
      }

      const parentLimit = params['limit'];
      if (parentLimit) {
        this.limit = Number(parentLimit);
      }

      this.loadData();
    });
  }

  ngOnDestroy() {
    this.closeLogsModal();
  }

  addFilter(type: 'authority' | 'dateRange' | 'institution') {
    this.activeFilters.update(curr => ({ ...curr, [type]: true }));
  }

  removeFilter(type: 'authority' | 'dateRange' | 'institution') {
    this.activeFilters.update(curr => ({ ...curr, [type]: false }));
    if (type === 'authority') {
      this.selectedAuthorityFilter.set(null);
      this.handleAuthorityFilterChange();
    } else if (type === 'dateRange') {
      this.selectedDateRange.set(null);
    } else if (type === 'institution') {
      this.selectedInstitution.set('');
      this.page = 1;
      this.loadData();
    }
  }

  formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadData(isRefresh = false) {
    const params: any = {
      page: this.page,
      limit: this.limit,
    };
    if (this.searchQuery) {
      params.search = this.searchQuery;
    }

    const authId = this.selectedAuthorityFilter();
    if (authId !== null && authId !== undefined) {
      params.authority_id = authId;
    }

    const cat = this.selectedCategoryFilter();
    if (cat) {
      params.category = cat;
    }

    const dates = this.selectedDateRange();
    if (dates && dates.length > 0) {
      const startDate = dates[0];
      const endDate = dates[1];
      if (startDate) {
        params.start_date = this.formatLocalDate(startDate);
      }
      if (endDate) {
        params.end_date = this.formatLocalDate(endDate);
      }
    }

    this.loading.set(true);
    this.api.getCirculars(params).subscribe({
      next: (res) => {
        this.circulars.set(res.data);
        this.totalRecords.set(res.total);
        this.loading.set(false);
        if (isRefresh) {
          this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Circulars list refreshed', life: 2500 });
        }

        // Auto scroll to highlighted row if exists
        if (this.highlightedCircularId()) {
          setTimeout(() => {
            const el = document.querySelector('.highlighted-row');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error(err);
      }
    });
    this.api.getAuthorities().subscribe(data => this.authorities.set(data));
    this.api.getCategories().subscribe(data => this.categories.set(data));
  }

  handleCategoryFilterChange() {
    this.page = 1;
    this.loadData();
  }

  clearAllFilters() {
    this.selectedCategoryFilter.set(null);
    this.selectedAuthorityFilter.set(null);
    this.selectedDateRange.set(null);
    this.page = 1;
    this.loadData();
  }

  handleAuthorityFilterChange() {
    this.page = 1;
    this.loadData();
  }

  handleDateRangeFilterChange() {
    if (!this.filterInitialized) {
      this.filterInitialized = true;
      return;
    }
    const dates = this.selectedDateRange();
    if (!dates || (dates[0] && dates[1]) || dates.length === 0) {
      this.page = 1;
      this.loadData();
    }
  }

  handleLazyLoad(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    if (event.globalFilter !== undefined) {
      this.searchQuery = event.globalFilter;
    }
    this.loadData();
  }

  handleSearch(query: string) {
    this.searchQuery = query;
    this.page = 1;
    this.loadData();
  }

  openUploadModal() {
    this.showCircularDrawer.set(true);
    this.newAuthorityId.set(null);
    this.referenceNo = '';
    this.referenceNoField.set('');
    this.circularTitle = '';
    this.circularTitleField.set('');
    this.circularDate.set('');
    this.priority.set('Medium');
    this.circularType.set('6');
    this.description = '';
    this.descriptionField.set('');
    this.portalWebsite = '';
    this.portalWebsiteField.set('');
    this.isPenaltyApplicable = false;
    this.penaltyAmount = null;
    this.penaltyDescription = '';
    this.penaltyDescriptionField.set('');
    this.selectedCircularFiles.set([]);
    this.processingState.set('idle');
    this.processingMessage.set('');
    this.lastTaskCount.set(0);
    this.editingCircularId.set(null);
    this.isApplicable.set(true);
    this.isActive.set(true);
  }

  openEditModal(row: any) {
    this.editingCircularId.set(row.id);
    this.showCircularDrawer.set(true);

    this.newAuthorityId.set(row.authority_id);
    this.referenceNoField.set(row.reference_no || '');
    this.circularTitleField.set(row.title || '');
    this.circularDate.set(row.published_date ? new Date(row.published_date).toISOString().split('T')[0] : '');
    this.priority.set(row.priority || 'Medium');
    this.circularType.set(String(row.circular_type || '6'));
    this.descriptionField.set(row.description || '');
    this.portalWebsiteField.set(row.portal_website || '');
    this.isPenaltyApplicable = row.is_penalty_applicable || false;
    this.penaltyAmount = row.penalty_amount || null;
    this.penaltyDescriptionField.set(row.penalty_description || '');
    this.isApplicable.set(row.is_applicable !== false);
    this.isActive.set(row.is_active !== false);

    this.selectedCircularFiles.set([]);
    this.processingState.set('idle');
    this.processingMessage.set('');
  }

  closeCircularDrawer() {
    this.showCircularDrawer.set(false);
  }

  onFileSelected(event: any) {
    // kept for template compatibility if a file is reintroduced later
  }

  onCircularFilesSelected(event: any) {
    console.log('onCircularFilesSelected', event);
    const files = event.currentFiles || event.files || [];
    this.selectedCircularFiles.set(files);

    if (files.length > 0) {
      const firstFile = files[0];
      const nameWithoutExt = firstFile.name.replace(/\.[^/.]+$/, ""); // strip extension

      // 1. Auto-populate local placeholders from filename instantly
      if (!this.circularTitleField().trim()) {
        const refRegex = /\b((?:rbi|dor|fidd|dos|fmd|idmd|dpss)[a-z0-9._\-/ ]*(?:\d{4}[-\/]\d{2,4}[-\/]\d{1,4}|\d+))\b/i;
        let titleClean = nameWithoutExt;
        const matchRef = nameWithoutExt.match(refRegex);
        if (matchRef) {
          titleClean = titleClean.replace(matchRef[0], '');
        }
        titleClean = titleClean.replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
        this.circularTitleField.set(titleClean || nameWithoutExt.replace(/[_\-]/g, ' '));
      }

      if (!this.referenceNoField().trim()) {
        const refRegex = /\b((?:rbi|dor|fidd|dos|fmd|idmd|dpss)[a-z0-9._\-/ ]*(?:\d{4}[-\/]\d{2,4}[-\/]\d{1,4}|\d+))\b/i;
        const matchRef = firstFile.name.match(refRegex);
        if (matchRef) {
          let cleanRef = matchRef[1].replace(/_/g, '/').replace(/\s+/g, ' ').trim();
          cleanRef = cleanRef.replace(/[-\/]+$/, ''); // clean trailing chars
          this.referenceNoField.set(cleanRef.toUpperCase());
        }
      }

      // 2. Call backend to extract precise metadata from PDF contents using AI
      this.uploading.set(true);
      this.processingState.set('processing');
      this.processingMessage.set('Extracting reference number, title and date from PDF contents via AI...');

      const formData = new FormData();
      formData.append('files', firstFile, firstFile.name);

      this.api.extractMetadata(formData).subscribe({
        next: (res) => {
          this.uploading.set(false);
          this.processingState.set('idle');
          this.processingMessage.set('');

          if (res.reference_no) {
            this.referenceNoField.set(res.reference_no);
          }
          if (res.title) {
            this.circularTitleField.set(res.title);
          }
          if (res.published_date) {
            this.circularDate.set(res.published_date);
          }

          this.messageService.add({
            severity: 'success',
            summary: 'AI Extraction Complete',
            detail: 'Metadata successfully extracted from the circular PDF content.',
            life: 3000
          });
        },
        error: (err) => {
          this.uploading.set(false);
          this.processingState.set('idle');
          this.processingMessage.set('');
          console.warn('AI metadata extraction failed, relying on user inputs or file names', err);
        }
      });
    }
  }

  onCircularFileRemoved(event: any) {
    const removed = event.file;
    this.selectedCircularFiles.update(files => files.filter(file => file !== removed));
  }

  clearCircularFiles() {
    this.selectedCircularFiles.set([]);
  }

  onUpload(event: Event) {
    event.preventDefault();
    if (!this.newAuthorityId() || !this.circularTitleField().trim() || !this.circularDate()) {
      alert('Please fill all required fields');
      return;
    }

    const hasFiles = this.selectedCircularFiles().length > 0;
    const editingId = this.editingCircularId();

    if (!editingId && !hasFiles) {
      alert('PDF upload is mandatory for new circulars.');
      return;
    }

    this.uploading.set(true);
    this.processingState.set(hasFiles ? 'uploading' : 'processing');
    this.processingMessage.set(
      hasFiles
        ? 'Uploading PDFs to storage and queuing AI processing...'
        : 'Saving circular details...'
    );

    const payload = {
      authority_id: Number(this.newAuthorityId()),
      reference_no: this.referenceNoField().trim() || null,
      title: this.circularTitleField().trim(),
      published_date: this.circularDate(),
      priority: this.priority(),
      circular_type: Number(this.circularType()),
      description: this.descriptionField().trim() || null,
      portal_website: this.portalWebsiteField().trim() || null,
      is_penalty_applicable: this.isPenaltyApplicable,
      penalty_amount: this.isPenaltyApplicable && this.penaltyAmount !== null ? Number(this.penaltyAmount) : null,
      penalty_description: this.penaltyDescriptionField().trim() || null,
      is_applicable: this.isApplicable(),
      is_active: this.isActive(),
    };

    if (editingId) {
      this.api.updateCircular(editingId, payload).subscribe({
        next: (res) => {
          this.uploading.set(false);
          this.processingState.set('done');
          this.processingMessage.set('Circular updated successfully.');
          this.loadData();
          this.messageService.add({
            severity: 'success',
            summary: 'Circular Updated',
            detail: 'Circular details updated successfully.',
            life: 3000
          });
          window.setTimeout(() => {
            this.closeCircularDrawer();
          }, 400);
        },
        error: (err) => {
          this.uploading.set(false);
          this.processingState.set('error');
          this.processingMessage.set('Failed to update circular details.');
          console.error(err);
        }
      });
      return;
    }

    const request = hasFiles
      ? this.api.createCircularWithFiles(this.buildCircularFormData(payload))
      : this.api.createCircular(payload);

    request.subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.lastTaskCount.set((res as any).task_count || 0);
        this.processingState.set('done');
        this.processingMessage.set(
          hasFiles
            ? `Files uploaded! AI is extracting compliance tasks in the background — refresh Tasks shortly.`
            : 'Circular saved successfully.'
        );
        this.loadData();
        this.messageService.add({
          severity: hasFiles ? 'info' : 'success',
          summary: hasFiles ? 'Circular created' : 'Saved',
          detail: hasFiles
            ? 'Files uploaded! AI is extracting compliance tasks in the background.'
            : 'Circular saved successfully.',
          life: 4000
        });
        window.setTimeout(() => {
          this.closeCircularDrawer();
        }, 400);
      },
      error: (err) => {
        this.uploading.set(false);
        this.processingState.set('error');
        this.processingMessage.set('Save failed. Check MinIO is running, OCR service is up, and Ollama is available.');
        console.error(err);
      }
    });
  }

  private buildCircularFormData(payload: any): FormData {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === null || value === undefined) return; // skip nulls — backend defaults handle them
      // booleans must be sent as strings; String(false) = "false" which toBoolean() handles correctly
      formData.append(key, String(value));
    });
    this.selectedCircularFiles().forEach(file => formData.append('files', file, file.name));
    return formData;
  }

  processingTitle(): string {
    switch (this.processingState()) {
      case 'uploading':
        return 'Uploading files';
      case 'processing':
        return 'AI preprocessing';
      case 'done':
        return 'Done';
      case 'error':
        return 'Processing failed';
      default:
        return '';
    }
  }

  processingIcon(): string {
    switch (this.processingState()) {
      case 'done':
        return 'pi pi-check-circle';
      case 'error':
        return 'pi pi-exclamation-triangle';
      case 'uploading':
      case 'processing':
        return 'pi pi-spin pi-spinner';
      default:
        return 'pi pi-info-circle';
    }
  }

  getCircularTypeLabel(value: string): string {
    return this.circularTypeOptions.find(option => option.value === value)?.label || 'General Compliances';
  }

  viewTasks(id: number) {
    this.router.navigate(['/tasks'], { queryParams: { circular_id: id, parent_page: this.page, parent_limit: this.limit } });
  }

  // confirmDelete(row: Circular) {
  //   this.confirmationService.confirm({
  //     message: `Delete circular "<strong>${row.title}</strong>"? This will also delete all associated tasks and files.`,
  //     header: 'Delete Circular',
  //     icon: 'pi pi-exclamation-triangle',
  //     acceptButtonStyleClass: 'p-button-danger',
  //     accept: () => {
  //       this.api.deleteCircular(row.id).subscribe({
  //         next: () => {
  //           this.circulars.update(list => list.filter(c => c.id !== row.id));
  //           this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${row.title}" deleted successfully.`, life: 3000 });
  //         },
  //         error: () => {
  //           this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete circular.', life: 4000 });
  //         }
  //       });
  //     }
  //   });
  // }

  openChatModal(c: Circular) {
    this.chatCircular.set(c);
    this.showChatDrawer.set(true);
    this.chatMessages.set([{
      role: 'ai',
      content: `Hello! I am Qwen. I have read the "${c.title}" circular. How can I assist you with compliance today?`
    }]);
  }

  closeChatDrawer() {
    this.showChatDrawer.set(false);
    this.chatCircular.set(null);
    this.chatInput.set('');
  }

  sendMessage(event: Event) {
    event.preventDefault();
    const chatCircular = this.chatCircular();
    if (!this.chatInput().trim() || !chatCircular) return;

    const question = this.chatInput().trim();
    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: question }]);
    this.chatInput.set('');
    this.isTyping.set(true);

    this.http.post<{ response: string }>(`${this.config.apiUrl}/circulars/${chatCircular.id}/chat`, { question })
      .subscribe({
        next: (res) => {
          this.isTyping.set(false);
          this.chatMessages.update(msgs => [...msgs, { role: 'ai', content: res.response }]);
        },
        error: (err) => {
          this.isTyping.set(false);
          this.chatMessages.update(msgs => [...msgs, { role: 'ai', content: 'Sorry, I encountered an error connecting to the AI service.' }]);
          console.error(err);
        }
      });
  }

  isPollingLogs() {
    return !!this.eventSource;
  }

  openLogsModal(row: Circular) {
    this.activeLogsCircularId = row.id;
    this.showLogsModal = true;
    this.streamingLogText.set('');
    this.streamingThinkingText.set('');
    this.fetchLogs();

    // Connect to SSE for real-time updates if still processing
    if (row.ai_processing_status === 'QUEUED' || row.ai_processing_status === 'PROCESSING') {
      this.connectToLogStream(row.id);
    }
  }

  connectToLogStream(circularId: number) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${this.config.apiUrl}/circulars/${circularId}/logs/stream`);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.thinking) {
        // Real-time thinking tokens from the AI's chain of thought
        this.streamingThinkingText.update(text => text + data.thinking);
        this.scrollToBottom();
      } else if (data.chunk) {
        // Real-time content tokens (the actual JSON output)
        this.streamingLogText.update(text => text + data.chunk);
        this.scrollToBottom();
      } else if (data.status === 'START') {
        this.streamingLogText.set('');
        this.streamingThinkingText.set('');
      } else if (data.status === 'END') {
        this.streamingLogText.set('');
        this.streamingThinkingText.set('');
        this.fetchLogs(); // refresh DB logs to get the final extraction result
      } else if (data.status && data.message) {
        // Standard DB log entry
        this.activeLogs.update(logs => [...logs, {
          id: Date.now(),
          circular_id: circularId,
          status: data.status,
          message: data.message,
          created_at: new Date().toISOString()
        }]);
        this.scrollToBottom();

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          this.loadData();
        }
      }
    };

    this.eventSource.onerror = () => {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.logs-container');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 10);
  }

  closeLogsModal() {
    this.showLogsModal = false;
    this.activeLogsCircularId = null;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.streamingLogText.set('');
    this.streamingThinkingText.set('');
  }

  fetchLogs() {
    if (!this.activeLogsCircularId) return;
    this.api.getCircularLogs(this.activeLogsCircularId).subscribe({
      next: (logs) => {
        this.activeLogs.set(logs);
        this.scrollToBottom();
      }
    });
  }

  // ── Amendment Chain ──────────────────────────────────────────────────────────

  openAmendmentChainModal(row: any) {
    this.showAmendmentChainModal.set(true);
    this.modalCircular.set(row);
    this.amendmentChainData.set(null);
    this.api.getAmendmentChain(row.id).subscribe({
      next: (data) => {
        this.amendmentChainData.set(data);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load amendment chain.',
        });
        this.showAmendmentChainModal.set(false);
      }
    });
  }

  closeAmendmentChainModal() {
    this.showAmendmentChainModal.set(false);
    this.amendmentChainData.set(null);
    this.modalCircular.set(null);
  }
}
