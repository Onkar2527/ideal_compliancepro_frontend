import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComplianceApiService } from '../../core/services/api/compliance-api.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { APP_CONFIG } from '../../core/services/config/config.token';

@Component({
  selector: 'app-review-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="animate-fade-in p-4">
      <div class="mb-4">
        <button class="text-indigo-600 hover:text-indigo-800 font-medium" (click)="goBack()">
          <i class="pi pi-arrow-left mr-1"></i> Back to Reviews
        </button>
      </div>

      <div class="glass-panel mb-6">
        <h1 class="text-3xl gradient-text mb-2">Assignment Review</h1>
        <p class="text-gray-600">Review the evidence submitted by the branch for each task.</p>
      </div>

      <!-- Task Evidence List -->
      <div class="glass-panel mb-6">
        <h2 class="text-xl font-bold mb-4">Submitted Evidence</h2>
        
        <div class="border rounded-lg overflow-hidden">
          <table class="modern-table w-full">
            <thead>
              <tr class="bg-gray-50 border-b">
                <th class="p-4 text-left">Task Description</th>
                <th class="p-4 text-left">Branch Answer / Remark</th>
                <th class="p-4 text-left">Evidence Documents</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ev of evidence" class="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                <td class="p-4 font-medium text-gray-800 max-w-md">{{ ev.description }}</td>
                <td class="p-4 italic text-gray-600 max-w-sm">"{{ ev.remark }}"</td>
                <td class="p-4">
                  <a [href]="ev.file_url" target="_blank" class="text-indigo-600 hover:text-indigo-800 flex items-center">
                    <i class="pi pi-file text-xl mr-2 text-indigo-600"></i> View Evidence
                  </a>
                </td>
              </tr>
              <tr *ngIf="evidence.length === 0">
                <td colspan="3" class="p-6 text-center text-gray-500">No evidence found for this assignment.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CO Review Decision Box -->
      <div class="glass-panel border-l-4 border-indigo-500">
        <h2 class="text-xl font-bold mb-4">CO Decision</h2>
        
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">CO Review Remarks</label>
          <textarea [(ngModel)]="remark" class="modern-input h-24 w-full" placeholder="Enter feedback for the branch..."></textarea>
        </div>

        <div class="flex items-center gap-4 mt-6">
          <button class="btn-secondary flex-1 py-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" 
                  (click)="submitReview('REJECT')" [disabled]="submitting">
            <i class="pi pi-times-circle mr-2"></i> Reject & Request Changes
          </button>
          <button *ngIf="!isCco" class="btn-secondary flex-1 py-3 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300" 
                  (click)="submitReview('ESCALATE')" [disabled]="submitting">
            <i class="pi pi-exclamation-triangle mr-2"></i> Escalate to CCO
          </button>
          <button class="btn-dynamic flex-1 py-3 bg-green-500 hover:bg-green-600" 
                  (click)="submitReview('ACCEPT')" [disabled]="submitting">
            <i class="pi pi-check-circle mr-2"></i> Accept & Complete Assignment
          </button>
        </div>
      </div>
    </div>
  `
})
export class ReviewDetailsComponent implements OnInit {
  assignmentId: number | null = null;
  evidence: any[] = [];
  remark = '';
  submitting = false;

  private config: any = inject(APP_CONFIG);
  private auth: AuthService = inject(AuthService);

  get isCco(): boolean {
    return this.auth.currentUser()?.role === 'CCO';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ComplianceApiService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.assignmentId = parseInt(id, 10);
        this.loadEvidence();
      }
    });
  }

  loadEvidence() {
    if (this.assignmentId) {
      this.api.getAssignmentEvidence(this.assignmentId).subscribe(data => {
        // Fix URLs if they don't include backend address (e.g., MinIO urls)
        this.evidence = data.map(ev => {
          if (ev.file_url && ev.file_url.startsWith('http://localhost:9000')) {
            // Re-route minio via local IP or backend proxy if needed, 
            // but the direct presigned URL should work for the browser if minio is exposed
          }
          return ev;
        });
      });
    }
  }

  goBack() {
    this.router.navigate(['/review']);
  }

  submitReview(action: 'ACCEPT' | 'REJECT' | 'ESCALATE') {
    if (!this.assignmentId) return;

    if ((action === 'REJECT' || action === 'ESCALATE') && !this.remark.trim()) {
      alert(`Please provide a remark explaining why the submission is ${action === 'REJECT' ? 'rejected' : 'escalated'}.`);
      return;
    }

    this.submitting = true;

    this.api.reviewAssignment(this.assignmentId, action, this.remark).subscribe({
      next: () => {
        this.submitting = false;
        let actionMsg = 'COMPLETED';
        if (action === 'REJECT') actionMsg = 'REJECTED';
        if (action === 'ESCALATE') actionMsg = 'ESCALATED TO CCO';
        alert(`Assignment marked as ${actionMsg}.`);
        this.goBack();
      },
      error: (err) => {
        this.submitting = false;
        alert('Failed to submit review.');
        console.error(err);
      }
    });
  }
}
