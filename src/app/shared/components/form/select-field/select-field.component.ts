import { Component, input, WritableSignal, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Reusable select/dropdown field component with signal-based binding
 * 
 * @example
 * ```html
 * <app-select-field
 *   label="Category"
 *   [field]="selectedCategory"
 *   [options]="categories"
 *   optionLabel="name"
 *   optionValue="id"
 *   [filter]="true">
 * </app-select-field>
 * ```
 */
@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, FloatLabelModule, ButtonModule, TooltipModule],
  template: `
    <div class="form-field">
      <div class="field-wrapper">
        @if (hideLabel()) {
          <p-select
            [inputId]="id()"
            [ngModel]="field()()"
            (ngModelChange)="onValueChange($event)"
            (onBlur)="onBlur()"
            (onFilter)="onFilter($event)"
            (onShow)="onShow.emit($event)"
            [options]="sortedOptions()"
            [optionLabel]="optionLabel()"
            [optionValue]="optionValue()"
            [disabled]="disabled()"
            [filter]="filter()"
            [filterBy]="effectiveFilterBy()"
            [showClear]="showClear()"
            [editable]="editable()"
            [virtualScroll]="virtualScroll()"
            [virtualScrollItemSize]="virtualScrollItemSize()"
            [scrollHeight]="scrollHeight()"
            [placeholder]="placeholder()"
            [appendTo]="appendTo()"
            styleClass="w-full"
            [class.ng-invalid]="showError()"
            [class.ng-dirty]="touched()">
          </p-select>
        } @else {
          <p-floatlabel variant="on" [class.has-value]="hasValue()">
            <p-select
              [inputId]="id()"
              [ngModel]="field()()"
              (ngModelChange)="onValueChange($event)"
              (onBlur)="onBlur()"
              (onFilter)="onFilter($event)"
              (onShow)="onShow.emit($event)"
              [options]="sortedOptions()"
              [optionLabel]="optionLabel()"
              [optionValue]="optionValue()"
              [disabled]="disabled()"
              [filter]="filter()"
              [filterBy]="effectiveFilterBy()"
              [showClear]="showClear()"
              [editable]="editable()"
              [virtualScroll]="virtualScroll()"
              [virtualScrollItemSize]="virtualScrollItemSize()"
              [scrollHeight]="scrollHeight()"
              [appendTo]="appendTo()"
              styleClass="w-full"
              [class.ng-invalid]="showError()"
              [class.ng-dirty]="touched()">
            </p-select>
            <label [for]="id()">
              {{ label() }}
              @if (required()) {
                <span class="text-red-500">*</span>
              }
            </label>
          </p-floatlabel>
        }
        @if (showAddButton() && !disabled()) {
          <button 
            type="button" 
            pButton 
            icon="pi pi-plus" 
            class="p-button-text p-button-sm add-btn" 
            [pTooltip]="addTooltip()" 
            tooltipPosition="top"
            (click)="onAddClick($event)">
          </button>
        }
      </div>
      @if (showError()) {
        <small class="error-message">
          <i class="pi pi-exclamation-circle"></i>
          {{ error() }}
        </small>
      }
    </div>
  `,
  styles: [`
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      width: 100%;
    }

    .field-wrapper {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
    }

    .field-wrapper > *:first-child {
      flex: 1 1 auto;
      min-width: 0;
    }

    .add-btn {
      flex: 0 0 auto;
      width: 2.5rem !important;
      height: 2.5rem !important;
      background: var(--surface-100, #f1f5f9) !important;
      border: 1px solid var(--surface-300, #cbd5e1) !important;
      border-radius: 6px !important;
      color: var(--primary-color, #3b82f6) !important;
      padding: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease;
      
      &:hover {
        background: var(--primary-50, #eff6ff) !important;
        border-color: var(--primary-color, #3b82f6) !important;
        color: var(--primary-color, #2563eb) !important;
      }
    }

    :host ::ng-deep {
      .p-floatlabel {
        width: 100%;
        display: block;
      }

      .p-select {
        width: 100%;
      }

      .p-select .p-select-label {
        font-size: 0.95rem;
        padding: 0.75rem 0.875rem;
      }

      .p-floatlabel label {
        font-weight: 500;
      }
    }
  `]
})
export class SelectFieldComponent<T = any> {
  /** Signal field for two-way binding */
  field = input.required<WritableSignal<T | null>>();

  /** Label text (optional if hideLabel is true) */
  label = input<string>('');

  /** Whether to hide the label and p-floatlabel */
  hideLabel = input<boolean>(false);

  /** Options array */
  options = input.required<any[]>();

  /** Unique ID for the input */
  id = input<string>(`select-field-${Math.random().toString(36).substr(2, 9)}`);

  /** Property name to display as label */
  optionLabel = input<string>('label');

  /** Property name to use as value */
  optionValue = input<string | undefined>(undefined);

  /** Placeholder text */
  placeholder = input<string>('Select...');

  /** Change event emitter */
  onChange = output<T | null>();

  /** Dropdown panel open event emitter */
  onShow = output<any>();

  /** Whether field is required */
  required = input<boolean>(false);

  /** Error message to display */
  error = input<string>('');

  /** Whether field is disabled */
  disabled = input<boolean>(false);

  /** Enable filtering/search */
  filter = input<boolean>(true);

  /** Properties to filter by */
  filterBy = input<string>('label');

  /** Show clear button */
  showClear = input<boolean>(false);

  /** Allow custom text input */
  editable = input<boolean>(false);

  /** Enable virtual scrolling for large datasets */
  virtualScroll = input<boolean>(true);

  /** Height of each item in virtual scroll (default 38px) */
  virtualScrollItemSize = input<number>(38);

  /** Max height of dropdown panel */
  scrollHeight = input<string>('200px');

  /** Target element to attach overlay to (e.g. 'body', or undefined for parent/local attachment) */
  appendTo = input<string | undefined>('body');

  /** Show add button */
  showAddButton = input<boolean>(false);

  /** Add button tooltip */
  addTooltip = input<string>('Add New');

  /** Add event emitter */
  add = output<void>();

  /** Effective filterBy property - defaults to optionLabel if filterBy is untouched */
  effectiveFilterBy = computed(() => {
    const fb = this.filterBy();
    const labelKey = this.optionLabel();
    if (fb === 'label' && labelKey !== 'label') {
      return labelKey;
    }
    return fb;
  });

  /** Defensive options array */
  safeOptions = computed(() => {
    const opts = this.options();
    return Array.isArray(opts) ? opts : [];
  });

  private _filterQuery = signal<string>('');

  /** Sorted options based on filter query priority */
  sortedOptions = computed(() => {
    const query = this._filterQuery().toLowerCase().trim();
    const options = this.safeOptions();
    const labelKey = this.optionLabel();

    if (!query) return options;

    return [...options].sort((a, b) => {
      const labelA = String(a[labelKey] || '').toLowerCase();
      const labelB = String(b[labelKey] || '').toLowerCase();

      const scoreA = labelA === query ? 0 : (labelA.startsWith(query) ? 1 : 2);
      const scoreB = labelB === query ? 0 : (labelB.startsWith(query) ? 1 : 2);

      return scoreA - scoreB;
    });
  });

  private _touched = signal(false);

  touched = computed(() => this._touched());

  showError = computed(() => {
    const errorMsg = this.error();
    return errorMsg.length > 0;
  });

  /** Check if field has a value */
  hasValue = computed(() => {
    const value = this.field()();
    return value !== null && value !== undefined && value !== '';
  });

  onValueChange(value: T | null): void {
    this.field().set(value);
    this.onChange.emit(value);
  }

  onBlur(): void {
    this._touched.set(true);
  }

  onAddClick(event: Event): void {
    event.stopPropagation();
    this.add.emit();
  }

  markTouched(): void {
    this._touched.set(true);
  }

  resetTouched(): void {
    this._touched.set(false);
  }

  onFilter(event: any): void {
    this._filterQuery.set(event.filter || '');
  }
}
