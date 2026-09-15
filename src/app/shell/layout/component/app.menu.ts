import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { ComplianceApiService } from '../../../core/services/api/compliance-api.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `
    <ul class="layout-menu">
      <ng-container *ngFor="let item of model; let i = index">
        <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
        <li *ngIf="item.separator" class="menu-separator"></li>
      </ng-container>
    </ul>
  `,
})
export class AppMenu implements OnInit {
  model: MenuItem[] = [];

  constructor(private api: ComplianceApiService) {}

  ngOnInit(): void {
    const cached = this.api.getCachedBranches();
    this.buildMenu(cached.length > 0 ? cached : undefined);

    // Fetch branches to refresh/ensure accuracy
    this.api.getBranches().subscribe({
      next: (branches) => {
        this.buildMenu(branches);
      },
      error: () => {}
    });
  }

  buildMenu(branches?: any[]): void {
    let user: any = {};
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      console.warn('Invalid user JSON in menu:', e);
    }
    const userRole = String(user.role || '').toLowerCase();
    const userName = String(user.username || user.name || '').toLowerCase();
    const userBranchId = user.branch_id || user.branchId;

    let isSubDepartmentUser = false;
    if (user.is_sub_department || user.branch_parent_id || user.parent_id) {
      isSubDepartmentUser = true;
    }
    if (userRole === 'sub_department' || userRole.includes('sub_dept') || userRole.includes('subdepartment')) {
      isSubDepartmentUser = true;
    }
    if (userName.includes('sub_') || userName.includes('subdept') || userName.includes('sub_dep')) {
      isSubDepartmentUser = true;
    }

    const availableBranches = branches && branches.length > 0 ? branches : this.api.getCachedBranches();
    if (availableBranches && availableBranches.length > 0 && userBranchId) {
      const matchedBranch = availableBranches.find((b: any) => String(b.id) === String(userBranchId));
      if (matchedBranch && (matchedBranch.parent_id !== null && matchedBranch.parent_id !== undefined)) {
        isSubDepartmentUser = true;
      }
    }

    const menu: MenuItem[] = [];

    // 1. GENERAL Section
    const generalItems: MenuItem[] = [];
    generalItems.push({ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/home'] });

    if (['admin', 'co', 'cco'].includes(userRole)) {
      generalItems.push({
        label: 'Reports',
        icon: 'pi pi-fw pi-file',
        routerLink: ['/reports']
      });
    }

    menu.push({
      label: 'GENERAL',
      items: generalItems
    });

    // 2. COMPLIANCE Section
    const complianceItems: MenuItem[] = [];

    if (userRole === 'cco') {
      complianceItems.push({ label: 'CCO Review Queue (Internal)', icon: 'pi pi-fw pi-shield', routerLink: ['/cco-review'], queryParams: { type: 'INTERNAL' }, routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' } });
      complianceItems.push({ label: 'CCO Review Queue (Circular Based)', icon: 'pi pi-fw pi-shield', routerLink: ['/cco-review'], queryParams: { type: 'REGULAR' }, routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' } });
    } else if (userRole === 'co') {
      complianceItems.push({ label: 'CO Review Queue (Internal)', icon: 'pi pi-fw pi-check-circle', routerLink: ['/co-review'], queryParams: { type: 'INTERNAL' }, routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' } });
      complianceItems.push({ label: 'CO Review Queue (Circular Based)', icon: 'pi pi-fw pi-check-circle', routerLink: ['/co-review'], queryParams: { type: 'REGULAR' }, routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' } });
    } else if (['branch', 'branch_user', 'department', 'sub_department'].includes(userRole)) {
      if (isSubDepartmentUser) {
        complianceItems.push({ label: 'My Assignments', icon: 'pi pi-fw pi-book', routerLink: ['/assignments'] });
      } else {
        complianceItems.push({
          label: 'My Assignments',
          icon: 'pi pi-fw pi-book',
          routerLink: ['/assignments'],
          queryParams: { view: 'my_assignments' },
          routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' }
        });
        complianceItems.push({
          label: 'Department Tasks',
          icon: 'pi pi-fw pi-building',
          routerLink: ['/assignments'],
          queryParams: { view: 'dept_tasks' },
          routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' }
        });
      }
    }

    if (complianceItems.length > 0) {
      menu.push({
        label: 'COMPLIANCE',
        items: complianceItems
      });
    }

    // 3. MASTERS Section
    const masterItems: MenuItem[] = [];

    const isAdminOrCoOrCco = ['admin', 'cco', 'co'].includes(userRole);
    let canAccessMasters = false;

    if (isAdminOrCoOrCco) {
      canAccessMasters = true;
    } else if (['branch', 'branch_user', 'department'].includes(userRole)) {
      if (isSubDepartmentUser) {
        canAccessMasters = false;
      } else if (availableBranches && availableBranches.length > 0 && userBranchId) {
        const matched = availableBranches.find((b: any) => String(b.id) === String(userBranchId));
        canAccessMasters = !matched || !matched.parent_id;
      } else {
        canAccessMasters = false;
      }
    }

    if (canAccessMasters) {
      masterItems.push({ label: 'Authority Master', icon: 'pi pi-fw pi-building', routerLink: ['/admin/authorities'] });

      const circularSubItems: MenuItem[] = [
        { label: 'Circular List', icon: 'pi pi-fw pi-list', routerLink: ['/circulars'] },
        {
          label: 'Task Master',
          icon: 'pi pi-fw pi-check-square',
          routerLink: ['/tasks'],
          routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' }
        },
        { label: 'Task Header Master', icon: 'pi pi-fw pi-tags', routerLink: ['/admin/task-headers'] }
      ];

      // Flag check: CCO task set access (when cco_task_set_access is 1, CCO has Task Set Master; when 0, hidden)
      const canAccessTaskSets = userRole !== 'cco' || this.api.canCcoAccessTaskSets();
      if (canAccessTaskSets) {
        circularSubItems.push({
          label: 'Task Set Master',
          icon: 'pi pi-fw pi-server',
          routerLink: ['/task-sets'],
          routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' }
        });
      }

      masterItems.push({
        label: 'Circular Master',
        icon: 'pi pi-fw pi-file-pdf',
        items: circularSubItems
      });
    }

    // Asset Management - Accessible to all roles including sub department
    const canAccessDocuments = isAdminOrCoOrCco || ['branch', 'branch_user', 'department', 'sub_department'].includes(userRole);
    if (canAccessDocuments) {
      masterItems.push({
        label: 'Asset Management',
        icon: 'pi pi-fw pi-folder-open',
        routerLink: ['/admin/documents'],
        routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' }
      });
    }

    if (userRole === 'admin') {
      masterItems.push({ label: 'Branch and Department Master', icon: 'pi pi-fw pi-map-marker', routerLink: ['/admin/branches'] });
      masterItems.push({ label: 'Users Master', icon: 'pi pi-fw pi-users', routerLink: ['/admin/users'] });
      masterItems.push({ label: 'Manage Assignments', icon: 'pi pi-fw pi-calendar-times', routerLink: ['/admin/manage-assignments'] });
      masterItems.push({ label: 'Holidays Master', icon: 'pi pi-fw pi-calendar', routerLink: ['/admin/holidays'] });
    }

    if (masterItems.length > 0) {
      menu.push({
        label: 'MASTERS',
        items: masterItems
      });
    }

    this.model = menu;
  }
}

