import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, computed, effect, signal, Output, ViewEncapsulation, ViewChild, ElementRef, HostListener, ContentChild, TemplateRef, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToolbarModule } from 'primeng/toolbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { ExportService } from '../../../core/services/export/export.service';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { DatePickerModule } from 'primeng/datepicker';

export interface TableColumn {
  /** Field name in the data object */
  field: string;
  /** Header label */
  header: string;
  /** Data type for formatting */
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'status' | 'status_inv' | 'badge' | 'action' | 'boolean_action' | 'boolean_toggle' | 'date_input' | 'html';
  /** Action icon (for action type only) */
  actionIcon?: string;
  /** Action name (default is field name) */
  actionName?: string;
  /** Column width (e.g., '10%', '100px') */
  width?: string;
  /** Text alignment for body cells (default: 'left') */
  align?: 'left' | 'center' | 'right';
  /** Text alignment for header (default: 'center') */
  headerAlign?: 'left' | 'center' | 'right';
  /** Pipe format string - for date: 'shortDate', 'mediumDate', etc. For number: '1.0-2', etc. For currency: 'USD', 'INR', etc. */
  pipeFormat?: string;
  /** Locale for formatting (default: 'en-US') */
  locale?: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom sort field for server-side sorting (e.g., 'c.createdAt') */
  sortField?: string;
  /** Whether column is filterable */
  filterable?: boolean;
  /** Tooltip for action columns */
  tooltip?: string;
  /** Custom CSS class for the column */
  cssClass?: string;
  /** Properties for boolean_action type */
  booleanActionTrueIcon?: string;
  booleanActionFalseIcon?: string;
  booleanActionTrueLabel?: string;
  booleanActionFalseLabel?: string;
  booleanActionTrueClass?: string;
  booleanActionFalseClass?: string;
}

export interface TableAction {
  label: string | ((row: any) => string);
  icon: string | ((row: any) => string);
  command: (row: any) => void;
  styleClass?: string;
  disabled?: (row: any) => boolean;
  visible?: (row: any) => boolean;
  name?: string;
}

/**
 * Style configuration for table component using PrimeNG 21 scoped tokens.
 * These tokens override the global theme for this specific table instance.
 */
export interface TableStyleConfig {
  /** Header cell background color */
  headerBackground?: string;
  /** Header cell text color */
  headerTextColor?: string;
  /** Header cell border color */
  headerBorderColor?: string;
  /** Row background color */
  rowBackground?: string;
  /** Row hover background color */
  rowHoverBackground?: string;
  /** Row selected background color */
  rowSelectedBackground?: string;
  /** Body cell text color */
  bodyTextColor?: string;
  /** Border color for cells */
  borderColor?: string;
  /** Custom CSS class to add to the table */
  cssClass?: string;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    ToolbarModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    TooltipModule,
    ToggleSwitch,
    MenuModule,
    DatePickerModule
  ],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TableComponent implements OnDestroy {
  data = input<any[]>([]);
  columns = input<TableColumn[]>([]);
  loading = input<boolean>(false);
  totalRecords = input<number>(0);
  rows = input<number>(10);
  globalFilterFields = input<string[]>([]);
  actions = input<TableAction[]>([]);
  actionsWidth = input<string | undefined>('auto');
  showAddButton = input<boolean>(true);
  addButtonLabel = input<string>('New (Ctrl+N)');
  showRefreshButton = input<boolean>(true);
  showBulkUploadButton = input<boolean>(false);
  bulkUploadButtonLabel = input<string>('Bulk Upload');
  sortField = input<string | undefined>();
  sortOrder = input<number>(1); // 1: Asc, -1: Desc
  showExportButton = input<boolean>(false);
  exportFilename = input<string>('export_data');
  summaryColumns = input<string[]>([]);
  reportHeaders = input<string[]>([]);

  // Selection Support
  selectable = input<boolean>(false);
  selection = input<any[]>([]);
  @Output() selectionChange = new EventEmitter<any[]>();

  // Virtual Scroll Inputs
  virtualScroll = input<boolean>(false);
  virtualScrollItemSize = input<number>(46);
  scrollHeight = input<string>('flex');
  lazy = input<boolean>(false);

  // Custom Body Template
  bodyTemplate = input<TemplateRef<any> | null>(null);

  // Custom Header Template
  headerTemplate = input<TemplateRef<any> | null>(null);

  // Search debounce delay in milliseconds (default 300ms for large datasets)
  searchDebounce = input<number>(300);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Style configuration for scoped tokens
  styleConfig = input<TableStyleConfig>({});

  // Header behavior
  stickyHeader = input<boolean>(true);

  // Toolbar visibility
  showToolbar = input<boolean>(true);
  
  // Row-specific loading state (Set of IDs)
  loadingRowIds = input<any>(new Set());

  // Custom table style (overrides default min-width)
  tableStyle = input<any>({ 'min-width': '50rem' });

  // Show serial number column
  showSerialNumber = input<boolean>(true);

  rowClass = input<(rowData: any) => string>();

  // Action display mode: 'menu' (default - three dots) or 'buttons' (individual buttons)
  actionDisplayMode = input<'menu' | 'buttons'>('buttons');

  // Whether to show labels in buttons mode (default false for icon-only)
  showActionLabels = input<boolean>(false);

  // Categorize columns for specialized rendering order
  actionColumns = computed(() => this.columns().filter(c => c.type === 'action'));
  dataColumns = computed(() => this.columns().filter(c => c.type !== 'action'));

  // Effective global filter fields for client-side search
  effectiveGlobalFilterFields = computed(() => {
    const fields = this.globalFilterFields();
    if (fields && fields.length > 0) {
      return fields;
    }
    return this.columns()
      .filter(c => !c.type || ['text', 'badge', 'status', 'status_inv', 'date', 'number'].includes(c.type))
      .map(c => c.field);
  });

  // Computed scoped tokens for PrimeNG [dt] input
  scopedTokens = computed(() => {
    const config = this.styleConfig();
    const tokens: Record<string, string> = {};

    if (config.headerBackground) tokens['header.cell.background'] = config.headerBackground;
    if (config.headerTextColor) tokens['header.cell.color'] = config.headerTextColor;
    if (config.headerBorderColor) tokens['header.cell.border.color'] = config.headerBorderColor;
    if (config.rowBackground) tokens['row.background'] = config.rowBackground;
    if (config.rowHoverBackground) tokens['row.hover.background'] = config.rowHoverBackground;
    if (config.rowSelectedBackground) tokens['row.selected.background'] = config.rowSelectedBackground;
    if (config.bodyTextColor) tokens['body.cell.color'] = config.bodyTextColor;
    if (config.borderColor) tokens['border.color'] = config.borderColor;

    return Object.keys(tokens).length > 0 ? tokens : undefined;
  });

  totalColumns = computed(() => {
    let count = this.columns().length;
    if (this.showSerialNumber()) count++;
    if (this.actions().length) {
      count++;
    }
    if (this.rowExpansionTemplate) count++;
    return count;
  });

  // Combined style class
  tableStyleClass = computed(() => {
    const classes = ['p-datatable-sm', 'h-full', 'flex', 'flex-column'];
    if (this.stickyHeader()) classes.push('sticky-header');
    if (this.styleConfig()?.cssClass) classes.push(this.styleConfig()!.cssClass!);
    return classes.join(' ');
  });

  // Display total records: fallback to data length if not lazy
  displayTotalRecords = computed(() => this.lazy() ? this.totalRecords() : this.data().length);

  @Output() onActionClick = new EventEmitter<{ name: string; row: any }>();
  @Output() onAdd = new EventEmitter<void>();
  @Output() onRefresh = new EventEmitter<void>();
  @Output() onBulkUpload = new EventEmitter<void>();
  @Output() onLazyLoad = new EventEmitter<any>();
  @Output() onSearch = new EventEmitter<string>();
  @Output() onRowsChange = new EventEmitter<number>();
  @Output() onPageChange = new EventEmitter<{ page: number; rows: number }>();
  @Output() onSort = new EventEmitter<{ field: string; order: number }>();

  skeletonRows = computed(() => Array(this.rows()).fill(0).map((_, i) => i));

  // Pagination Options
  rowsPerPageOptions = [10, 25, 50, 100];

  // Menu logic
  menuItems = computed<MenuItem[]>(() => {
    const row = this.activeRow();
    if (!row) return [];
    
    return this.actions()
      .filter(action => action.visible === undefined || action.visible(row))
      .map(action => ({
        label: typeof action.label === 'function' ? action.label(row) : action.label,
        icon: this.isRowLoading(row, action.name) ? 'pi pi-spin pi-spinner' : (typeof action.icon === 'function' ? action.icon(row) : action.icon),
        styleClass: action.styleClass,
        disabled: this.isRowLoading(row, action.name) || (action.disabled ? action.disabled(row) : false),
        visible: action.visible ? action.visible(row) : true,
        command: (event: any) => {
          if (this._activeMenu) {
            this._activeMenu.hide();
          }
          this._activeMenu = null;
          
          // Execute the action with a delay to allow PrimeNG's hide animation to complete completely.
          // This prevents the ghost overlay issue when navigating away from the page.
          setTimeout(() => {
             action.command(row);
          }, 250);
        }
      }));
  });

  activeRow = signal<any>(null);
  private _activeMenu: any = null;

  // Row Grouping Support
  rowGroupMode = input<'subheader' | 'rowspan' | undefined>();
  groupRowsBy = input<string | undefined>();
  @ContentChild('groupHeader') groupHeaderTemplate: TemplateRef<any> | null = null;
  @ContentChild('groupFooter') groupFooterTemplate: TemplateRef<any> | null = null;

  // Footer Template Support (Grand Total)
  @ContentChild('footer') footerTemplate: TemplateRef<any> | null = null;

  // Paginator Support
  paginator = input<boolean>(true);

  @ViewChild('dt') table!: any;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  private exportService = inject(ExportService);
  private cdr = inject(ChangeDetectorRef);

  // Row Expansion Support
  dataKey = input<string | undefined>();
  expandedRowKeys = input<{ [s: string]: boolean }>({});
  @Output() expandedRowKeysChange = new EventEmitter<{ [s: string]: boolean }>();
  @Output() onRowExpand = new EventEmitter<any>();
  @Output() onRowCollapse = new EventEmitter<any>();

  // Template for Row Expansion
  @ContentChild('rowExpansion') rowExpansionTemplate: TemplateRef<any> | null = null;

  @HostListener('document:keydown.control.f', ['$event'])
  onCtrlF(event: Event) {
    event.preventDefault();
    this.searchInput?.nativeElement?.focus();
  }

  constructor() {
    // Debug effect
    effect(() => {
      // console.log('TableComponent Data:', this.data().length);
    });
  }

  getRowClass(rowData: any): string {
    if (this.rowClass()) {
      return this.rowClass()!(rowData);
    }
    return '';
  }

  getActionLabel(action: TableAction, row: any): string {
    return typeof action.label === 'function' ? action.label(row) : action.label;
  }

  getActionIcon(action: TableAction, row: any): string {
    return typeof action.icon === 'function' ? action.icon(row) : action.icon;
  }

  isRowLoading(row: any, actionName?: string): boolean {
    const key = this.dataKey() || 'id';
    const id = row[key];
    const loadingIds = this.loadingRowIds();
    
    // Check if the whole row is loading
    const rowLoading = this._checkLoading(loadingIds, id);
    if (rowLoading) return true;

    // Check if the specific action is loading
    if (actionName) {
      return this._checkLoading(loadingIds, `${id}:${actionName}`);
    }

    return false;
  }

  private _checkLoading(loadingIds: any, target: string): boolean {
    if (loadingIds instanceof Set) return loadingIds.has(target);
    if (Array.isArray(loadingIds)) return loadingIds.includes(target);
    return loadingIds === target;
  }

  handleAdd() {
    this.onAdd.emit();
  }

  handleRefresh() {
    // 1. Clear Search Input UI
    if (this.searchInput) {
      this.searchInput.nativeElement.value = '';
    }

    // 2. Reset PrimeNG Table State (sort, filter, pagination)
    if (this.table) {
      this.table.clear();
      this.table.first = 0;
    }

    // 3. Notify parent to reload data
    this.onRefresh.emit();
  }

  handleSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Debounce the search to prevent API overload when typing fast
    this.searchDebounceTimer = setTimeout(() => {
      if (!this.lazy() && this.table) {
        this.table.filterGlobal(value, 'contains');
        this.cdr.markForCheck();
      }
      this.onSearch.emit(value);
      this.searchDebounceTimer = null;
    }, this.searchDebounce());
  }

  showMenu(event: MouseEvent, row: any, menu: any) {
    event.preventDefault();
    event.stopPropagation();
    this.activeRow.set(row);
    this._activeMenu = menu;
    menu.toggle(event);
  }

  handlePageChange(event: any) {
    const page = Math.floor(event.first / event.rows) + 1;
    this.onPageChange.emit({ page, rows: event.rows });
  }

  handleSort(event: any) {
    this.onSort.emit({
      field: event.field,
      order: event.order
    });
  }

  handleExport() {
    let dataToExport: any[] = [];
    const rawData = [...this.data()];
    const summaryCols = this.summaryColumns();
    const groupBy = this.groupRowsBy();
    const isGrouped = this.rowGroupMode() === 'subheader' && !!groupBy;

    if (isGrouped) {
      // Sort data by groupRowsBy if not already sorted
      // (assuming sorted for now as p-table expectations)

      let currentGroupValue: any = null;
      let groupTotals: any = {};
      let grandTotals: any = {};

      summaryCols.forEach(col => grandTotals[col] = 0);

      rawData.forEach((row, index) => {
        const rowGroupValue = row[groupBy!];

        if (rowGroupValue !== currentGroupValue) {
          // New Group detected

          // 1. Add Previous Group Footer
          if (currentGroupValue !== null) {
            dataToExport.push(this.createSummaryRow('footer', groupTotals, `Total for ${this.formatValue(currentGroupValue, this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' })}`));
          }

          // 2. Add New Group Header
          dataToExport.push({
            _rowType: 'header',
            _headerValue: this.formatValue(rowGroupValue, this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' })
          });

          // 3. Reset Group Totals
          currentGroupValue = rowGroupValue;
          groupTotals = {};
          summaryCols.forEach(col => groupTotals[col] = 0);
        }

        // Add Data Row
        const formattedRow: any = { _rowType: 'data' };
        this.columns().forEach(col => {
          const val = row[col.field];
          formattedRow[col.field] = this.formatValue(val, col);

          // Accumulate totals
          if (summaryCols.includes(col.field)) {
            const numericVal = Number(val) || 0;
            groupTotals[col.field] += numericVal;
            grandTotals[col.field] += numericVal;
          }
        });
        dataToExport.push(formattedRow);

        // If it's the last row, add final group footer and grand total
        if (index === rawData.length - 1) {
          dataToExport.push(this.createSummaryRow('footer', groupTotals, `Total for ${this.formatValue(this.formatValue(currentGroupValue, this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' }), this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' })}`));
          dataToExport.push(this.createSummaryRow('grand-total', grandTotals, 'GRAND TOTAL'));
        }
      });
    } else {
      // Flat data export
      let grandTotals: any = {};
      summaryCols.forEach(col => grandTotals[col] = 0);

      rawData.forEach((row, index) => {
        const formattedRow: any = { _rowType: 'data' };
        this.columns().forEach(col => {
          const val = row[col.field];
          formattedRow[col.field] = this.formatValue(val, col);
          if (summaryCols.includes(col.field)) {
            grandTotals[col.field] += (Number(val) || 0);
          }
        });
        dataToExport.push(formattedRow);

        if (index === rawData.length - 1 && summaryCols.length > 0) {
          dataToExport.push(this.createSummaryRow('grand-total', grandTotals, 'GRAND TOTAL'));
        }
      });
    }

    const exportCols = this.columns().map(col => ({
      field: col.field,
      header: col.header
    }));

    this.exportService.exportToExcel(dataToExport, exportCols, this.exportFilename(), this.reportHeaders());
  }

  private createSummaryRow(type: 'footer' | 'grand-total', totals: any, label: string): any {
    const row: any = { _rowType: type };
    this.columns().forEach((col, index) => {
      if (index === 0) {
        row[col.field] = label;
      } else if (this.summaryColumns().includes(col.field)) {
        row[col.field] = this.formatValue(totals[col.field], col);
      } else {
        row[col.field] = '';
      }
    });
    return row;
  }

  /**
   * Format cell value based on column type and pipeFormat
   */
  formatValue(value: any, col: TableColumn): string {
    if (value === null || value === undefined) return '';

    const locale = col.locale || 'en-US';

    switch (col.type) {
      case 'date':
        try {
          const date = new Date(value);
          const format = col.pipeFormat || 'dd/MM/yyyy';
          // Check if it's a custom pattern like dd-MM-yyyy or dd-MM-yyyy HH:mm
          if (format.includes('dd') || format.includes('MM') || format.includes('yyyy') || format.includes('HH') || format.includes('mm')) {
            return this.formatCustomDate(date, format);
          }
          return new Intl.DateTimeFormat(locale, this.getDateFormatOptions(format)).format(date);
        } catch {
          return value;
        }

      case 'number':
        try {
          const [minInt, fractionRange] = (col.pipeFormat || '1.0-2').split('.');
          const [minFraction, maxFraction] = (fractionRange || '0-2').split('-').map(Number);
          return new Intl.NumberFormat(locale, {
            minimumIntegerDigits: Number(minInt) || 1,
            minimumFractionDigits: minFraction || 0,
            maximumFractionDigits: maxFraction || 2
          }).format(Number(value));
        } catch {
          return value;
        }

      case 'currency':
        try {
          const currency = col.pipeFormat || 'INR';
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
          }).format(Number(value));
        } catch {
          return value;
        }

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'status':
        if (value === 1) return 'Active';
        if (value === 0) return 'Inactive';
        
        // Assignment status mapping
        const assignmentStatusMap: Record<string, string> = {
          'Pending_Timeline': 'Pending Timeline',
          'Timeline_Review': 'Timeline Review',
          'In_Progress': 'In Progress',
          'REVIEW_PENDING': 'Review Pending',
          'COMPLETED': 'Completed',
          'ESCALATED_TO_CCO': 'Escalated to CCO',
          'REJECTED': 'Pending Recompliance',
          'Rejected': 'Pending Recompliance',
          'PENDING_RECOMPLIANCE': 'Pending Recompliance'
        };
        return assignmentStatusMap[value] ?? value;

      case 'status_inv':
        return value === 0 ? 'Active' : (value === 1 ? 'Inactive' : value);

      default:
        return value;
    }
  }

  private getDateFormatOptions(format: string): Intl.DateTimeFormatOptions {
    switch (format) {
      case 'short': return { dateStyle: 'short' };
      case 'medium': return { dateStyle: 'medium' };
      case 'long': return { dateStyle: 'long' };
      case 'full': return { dateStyle: 'full' };
      case 'shortDate': return { year: 'numeric', month: 'numeric', day: 'numeric' };
      case 'mediumDate': return { year: 'numeric', month: 'short', day: 'numeric' };
      case 'longDate': return { year: 'numeric', month: 'long', day: 'numeric' };
      case 'shortTime': return { hour: 'numeric', minute: 'numeric' };
      case 'mediumTime': return { hour: 'numeric', minute: 'numeric', second: 'numeric' };
      default: return { dateStyle: 'medium' };
    }
  }

  /**
   * Format date using custom pattern like dd-MM-yyyy HH:mm
   */
  private formatCustomDate(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  getBadgeClass(value: any): string {
    if (value === null || value === undefined) return 'bg-gray-100 text-gray-700 border-round px-2.5 py-1 font-semibold text-xs';
    
    // Handle booleans explicitly
    if (typeof value === 'boolean') {
      return value 
        ? 'bg-green-100 text-green-700 border-round px-2.5 py-1 font-semibold text-xs' 
        : 'bg-orange-100 text-orange-700 border-round px-2.5 py-1 font-semibold text-xs';
    }

    const val = String(value).toUpperCase();
    const base = 'border-round px-2.5 py-1 font-semibold text-xs inline-flex align-items-center gap-1 white-space-nowrap ';
    
    if (val === 'ORIGINAL') return base + 'bg-gray-100 text-gray-600 border-1 border-gray-300';
    if (val === 'AMENDMENT') return base + 'bg-blue-100 text-blue-700';
    if (val.includes('RECOMPLIANCE') || val === 'REJECTED' || val === 'NEEDS_REDO') {
      return base + 'bg-purple-100 text-purple-700 font-bold';
    }
    if (val.includes('NOT_FOUND') || val.includes('ERROR') || val.includes('FAILED') || val.includes('INACTIVE') || val.includes('ESCALATED')) {
      return base + 'bg-red-100 text-red-700';
    }
    if (val === 'COMPLETED' || val === 'SUCCESS' || val === 'APPROVED' || val === 'ACTIVE') {
      return base + 'bg-green-100 text-green-700 font-bold';
    }
    if (val.includes('PENDING') || val === 'PROCESSING' || val === 'QUEUED' || val.includes('REVIEW')) {
      return base + 'bg-orange-100 text-orange-700 font-semibold';
    }
    if (val.includes('PROGRESS')) {
      return base + 'bg-blue-100 text-blue-700';
    }
    return base + 'bg-indigo-100 text-indigo-700';
  }

  getStatusIcon(value: any, col?: TableColumn): string {
    if (value === null || value === undefined) return '';
    if (col && col.field !== 'status' && col.field !== 'task_set_type' && col.field !== 'type' && col.type !== 'status') {
      return '';
    }
    const val = String(value).toUpperCase();
    if (val.includes('RECOMPLIANCE') || val === 'REJECTED' || val === 'NEEDS_REDO') {
      return 'pi pi-refresh';
    }
    if (val === 'REVIEW_PENDING' || val === 'TIMELINE_REVIEW' || val.includes('REVIEW')) {
      return 'pi pi-clock';
    }
    if (val === 'PENDING_TIMELINE' || val === 'PENDING') {
      return 'pi pi-calendar-plus';
    }
    if (val === 'COMPLETED' || val === 'APPROVED' || val === 'SUCCESS' || val === 'ACTIVE') {
      return 'pi pi-check-circle';
    }
    if (val.includes('PROGRESS')) {
      return 'pi pi-spin pi-spinner';
    }
    if (val.includes('ESCALATED')) {
      return 'pi pi-arrow-up-right';
    }
    if (val === 'INTERNAL') {
      return 'pi pi-briefcase';
    }
    if (val === 'REGULAR') {
      return 'pi pi-file';
    }
    return '';
  }

  /**
   * Get text alignment style for a column
   */
  getAlignment(col: TableColumn, isHeader: boolean = false): string {
    if (isHeader) {
      return col.headerAlign || 'center';
    }
    return col.align || 'left';
  }

  ngOnDestroy() {
    if (this._activeMenu) {
      this._activeMenu.hide();
      this._activeMenu = null;
    }
    
    // Aggressive cleanup for PrimeNG appendTo="body" ghost overlays
    // This ensures no menu overlays are left behind when navigating away
    setTimeout(() => {
      document.querySelectorAll('.p-menu-overlay, .p-menu, [data-pc-name="menu"]').forEach(el => {
        // Try to remove the overlay from the DOM completely regardless of parent
        try {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {}
      });
    }, 100);
  }
}

