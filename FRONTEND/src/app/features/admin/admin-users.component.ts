import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

/**
 * Gestión de usuarios/empresas (Fase 7) — suspender bloquea el login de esa
 * cuenta (auth-service lo rechaza con 403) sin borrar ningún dato; reactivar
 * la desbloquea. No permite suspender cuentas ADMIN desde acá (protección
 * del backend, ver UsersService.setSuspended).
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule, CardComponent, BadgeComponent, ButtonDirective],
  template: `
    <div class="admin-users">
      <h1>Usuarios y empresas</h1>
      <p class="subtitle">Suspender una cuenta bloquea su acceso de inmediato, sin borrar ningún dato.</p>

      <div class="filters">
        <select [(ngModel)]="roleFilter" (change)="onFilterChange()">
          <option value="">Todos los roles</option>
          <option value="CANDIDATE">Candidato</option>
          <option value="COMPANY">Empresa</option>
          <option value="ADMIN">Admin</option>
        </select>
        <input placeholder="Buscar por correo..." [(ngModel)]="search" (keyup.enter)="onFilterChange()" />
        <button appButton="secondary" size="sm" (click)="onFilterChange()">Buscar</button>
      </div>

      @if (loading) {
        <p>Cargando...</p>
      } @else {
        @for (u of users; track u.id) {
          <app-card variant="flat" padding="md" class="user-card">
            <div class="user-row">
              <div>
                <strong>{{ displayName(u) }}</strong>
                <span class="user-email">{{ u.email }}</span>
              </div>
              <app-badge tone="neutral">{{ u.role }}</app-badge>
              <app-badge [tone]="u.suspended ? 'danger' : 'success'">{{ u.suspended ? 'Suspendida' : 'Activa' }}</app-badge>
              @if (u.role !== 'ADMIN') {
                <button appButton="ghost" size="sm" (click)="toggleSuspend(u)">
                  {{ u.suspended ? 'Reactivar' : 'Suspender' }}
                </button>
              }
            </div>
          </app-card>
        }
        <div class="pagination">
          <button appButton="ghost" [disabled]="page === 1" (click)="goToPage(page - 1)">Anterior</button>
          <span>Página {{ page }}</span>
          <button appButton="ghost" [disabled]="users.length < limit" (click)="goToPage(page + 1)">Siguiente</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-users { padding: 24px; max-width: 820px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .filters { display: flex; gap: 8px; margin-bottom: 20px; }
    .filters select, .filters input { padding: 6px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px; }
    .filters input { flex: 1; }
    .user-card { margin-bottom: 10px; }
    .user-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .user-row > div:first-child { flex: 1; display: flex; flex-direction: column; }
    .user-email { font-size: 0.85rem; color: var(--text-secondary); }
    .pagination { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
  `],
})
export class AdminUsersComponent implements OnInit {
  private admin = inject(AdminService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = true;
  users: AdminUser[] = [];
  page = 1;
  limit = 20;
  roleFilter = '';
  search = '';

  ngOnInit(): void {
    this.load();
  }

  displayName(u: AdminUser): string {
    return u.profile?.fullName || u.companyProfile?.companyName || u.email;
  }

  goToPage(page: number): void {
    if (page < 1) return;
    this.page = page;
    this.load();
  }

  onFilterChange(): void {
    this.page = 1;
    this.load();
  }

  toggleSuspend(u: AdminUser): void {
    const willSuspend = !u.suspended;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: willSuspend ? 'Suspender cuenta' : 'Reactivar cuenta',
        message: willSuspend
          ? `"${u.email}" no va a poder iniciar sesión hasta que se reactive. ¿Confirmás?`
          : `"${u.email}" va a poder iniciar sesión de nuevo. ¿Confirmás?`,
        confirmLabel: willSuspend ? 'Suspender' : 'Reactivar',
        confirmColor: willSuspend ? 'warn' : 'primary',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.admin.setUserSuspended(u.id, willSuspend).subscribe({
        next: (updated) => {
          u.suspended = updated.suspended;
          this.snackBar.open(`"${u.email}" ${updated.suspended ? 'suspendida' : 'reactivada'}`, 'Cerrar', { duration: 3000 });
        },
        error: (err) => this.snackBar.open(err.error?.message || 'No se pudo actualizar', 'Cerrar', { duration: 5000 }),
      });
    });
  }

  private load(): void {
    this.loading = true;
    this.admin.listUsers({ role: this.roleFilter || undefined, q: this.search || undefined, page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.users = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudieron cargar los usuarios', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
