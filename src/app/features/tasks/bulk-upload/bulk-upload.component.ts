import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { SelectFieldComponent } from '../../../shared/components/form/select-field/select-field.component';
import { ComplianceApiService } from '../../../core/services/api/compliance-api.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    ButtonModule,
    TableModule,
    SelectFieldComponent,
  ],
  templateUrl: './bulk-upload.component.html',
  styleUrl: './bulk-upload.component.scss',
})
export class BulkUploadComponent {
  /** Whether the drawer is visible */
  visible = input.required<boolean>();

  /** Circulars list passed from parent */
  circulars = input.required<any[]>();

  /** Task headers for CSV validation */
  taskHeaders = input.required<any[]>();

  /** Emitted when visibility changes (open/close) */
  visibleChange = output<boolean>();

  /** Emitted when upload completes successfully so parent can refresh */
  uploadSuccess = output<void>();

  // ── Internal Signals ──────────────────────────────────────────────────
  circularId = signal<number | null>(null);
  selectedFile = signal<File | null>(null);
  selectedFileName = signal('');
  previewRows = signal<any[]>([]);
  validRows = signal<any[]>([]);
  validating = signal(false);
  uploading = signal(false);

  hasErrors = computed(() => this.previewRows().some((row) => row.status === 'ERROR'));
  errorCount = computed(() => this.previewRows().filter((row) => row.status === 'ERROR').length);

  // ── Options ───────────────────────────────────────────────────────────
  private readonly priorityOptions = [
    { label: 'Critical', value: 'Critical' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  constructor(private api: ComplianceApiService, private messageService: MessageService, private auth: AuthService) {}

  /** Called by parent to seed the circularId and reset state */
  open(initialCircularId: number | null) {
    this.circularId.set(initialCircularId);
    this.selectedFile.set(null);
    this.selectedFileName.set('');
    this.previewRows.set([]);
    this.validRows.set([]);
  }

  // ── File handling ─────────────────────────────────────────────────────
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Please select a CSV file only',
      });
      return;
    }

    this.selectedFile.set(file);
    this.selectedFileName.set(file.name);
    this.previewRows.set([]);
    this.validRows.set([]);
  }

  downloadSample() {
    window.open('./assets/csv/compliance-pro-task-upload-sample.csv', '_blank');
  }

  // ── Validation ────────────────────────────────────────────────────────
  validateCsv() {
    const file = this.selectedFile();
    const circularId = this.circularId();
    if (!file || !circularId) return;

    this.validating.set(true);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = this.parseCsv(text);

        // Check required headers
        const requiredHeaders = ['task'];
        const actualHeaders = parsed.headers.map(h => h.trim().toLowerCase());
        const missing = requiredHeaders.filter(h => !actualHeaders.includes(h));

        if (missing.length > 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Validation Failed',
            detail: `Missing required column: ${missing.join(', ')}`,
          });
          this.validating.set(false);
          return;
        }

        const preview: any[] = [];
        const valid: any[] = [];

        parsed.rows.forEach((row, idx) => {
          const rowNumber = idx + 2;
          const description = (row['task'] || '').trim();
          const headerName = (row['header'] || '').trim();
          const priority = (row['priority'] || '').trim();

          const errors: string[] = [];

          if (!description) {
            errors.push('Task description is required');
          }

          let headerId: number | null = null;
          if (headerName) {
            const h = this.taskHeaders().find(
              x => x.name.trim().toLowerCase() === headerName.toLowerCase()
            );
            if (h) {
              headerId = h.id;
            } else {
              errors.push(`Header "${headerName}" does not exist in task headers`);
            }
          }

          let normalizedPriority: string | null = null;
          if (priority) {
            const pOpt = this.priorityOptions.find(
              opt => opt.label.toLowerCase() === priority.toLowerCase()
            );
            if (pOpt) {
              normalizedPriority = pOpt.value;
            } else {
              errors.push(`Priority must be one of: Critical, High, Medium, Low`);
            }
          }

          preview.push({
            rowNumber,
            description,
            headerName,
            priority,
            status: errors.length > 0 ? 'ERROR' : 'VALID',
            message: errors.join('; ') || 'Ready',
          });

          if (errors.length === 0) {
            valid.push({
              description,
              circular_id: circularId,
              header_id: headerId,
              priority: normalizedPriority,
              risk_category: null,
              business_risk: null,
              control_risk: null,
              audit_area_id: null,
            });
          }
        });

        this.previewRows.set(preview);
        this.validRows.set(valid);
        this.validating.set(false);

        this.messageService.add({
          severity: this.hasErrors() ? 'warn' : 'success',
          summary: this.hasErrors() ? 'Validation Complete with Errors' : 'Validation Successful',
          detail: this.hasErrors() ? 'Please correct invalid rows' : `${valid.length} rows ready`,
        });
      } catch (e: any) {
        this.validating.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Parse Error',
          detail: e?.message || 'Failed to parse CSV file',
        });
      }
    };
    reader.readAsText(file);
  }

  // ── Upload ────────────────────────────────────────────────────────────
  uploadRows() {
    if (!this.validRows().length || this.hasErrors()) return;

    this.uploading.set(true);
    const user = this.auth.currentUser();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? storedUser?.id ?? storedUser?.user_id ?? storedUser?.userId;
    const userName = user?.name || user?.full_name || user?.fullName || user?.username || storedUser?.name || storedUser?.full_name || storedUser?.username;
    const userRole = user?.role || user?.designation || storedUser?.role || storedUser?.designation;

    const rowsWithCreator = this.validRows().map((r: any) => ({
      ...r,
      created_by: userId,
      created_by_id: userId,
      created_by_user_id: userId,
      user_id: userId,
      created_by_role: userRole,
      creator_role: userRole,
      created_by_name: userName,
      creator_name: userName,
      created_by_username: userName
    }));

    this.api.bulkUploadTasks({
      rows: rowsWithCreator,
      created_by: userId,
      created_by_id: userId,
      created_by_role: userRole,
      created_by_name: userName
    }).subscribe({
      next: () => {
        this.uploading.set(false);
        this.visibleChange.emit(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Bulk Upload Successful',
          detail: `${this.validRows().length} tasks uploaded successfully`,
        });
        this.uploadSuccess.emit();
      },
      error: (err) => {
        this.uploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: err?.error?.message || 'Error occurred during bulk upload',
        });
      },
    });
  }

  // ── CSV Parser ────────────────────────────────────────────────────────
  private parseCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines: string[][] = [];
    let current = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < content.length; i += 1) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i += 1;
        }
        row.push(current.trim());
        current = '';
        if (row.some((item) => item.length > 0)) {
          lines.push(row);
        }
        row = [];
        continue;
      }

      current += char;
    }

    if (current.length || row.length) {
      row.push(current.trim());
      if (row.some((item) => item.length > 0)) {
        lines.push(row);
      }
    }

    const [headerRow = [], ...dataRows] = lines;
    const headers = headerRow.map((header) => header.trim());
    const mappedRows = dataRows.map((cells) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        const key = header.trim().toLowerCase().replace(/\s+/g, '_');
        record[key] = (cells[index] || '').trim();
      });
      return record;
    });

    return { headers, rows: mappedRows };
  }
}
