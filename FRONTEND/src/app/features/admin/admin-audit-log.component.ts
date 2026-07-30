import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, AdminAuditLogEntry } from '../../core/services/admin.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';

/**
 * Registro de cada cambio hecho por un administrador — quién, qué, cuándo,
 * antes/después, desde qué IP. Ver `AdminAuditLog` (backend) y el porqué de
 * esta tabla en docs/DECISIONS.md ("audit log obligatorio desde el día 1").
 * Filtrable por tipo de entidad y rango de fecha (Fase 2 del plan).
 */
@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, CardComponent, EmptyStateComponent, ButtonDirective],
  template: `
    <div class="admin-audit-log">
      <h1>Registro de cambios</h1>
      <p class="subtitle">Cada acción hecha desde el panel de administración queda registrada acá.</p>

      <div class="filters">
        <select [(ngModel)]="entityTypeFilter" (change)="onFilterChange()">
          <option value="">Todas las entidades</option>
          @for (type of entityTypes; track type) {
            <option [value]="type">{{ type }}</option>
          }
        </select>
        <label>
          Desde
          <input type="date" [(ngModel)]="fromFilter" (change)="onFilterChange()" />
        </label>
        <label>
          Hasta
          <input type="date" [(ngModel)]="toFilter" (change)="onFilterChange()" />
        </label>
        @if (entityTypeFilter || fromFilter || toFilter) {
          <button appButton="ghost" size="sm" (click)="clearFilters()">Limpiar filtros</button>
        }
      </div>

      @if (loading) {
        <p>Cargando...</p>
      } @else if (entries.length === 0) {
        <app-empty-state icon="history" title="Sin cambios todavía" message="Cuando se edite un parámetro o se modere un dato, va a aparecer acá." />
      } @else {
        @for (entry of entries; track entry.id) {
          <app-card variant="flat" padding="md" class="log-card">
            <div class="log-header">
              <strong>{{ entry.action }}</strong>
              <span class="log-date">{{ entry.createdAt | date: 'short' }}</span>
            </div>
            <p class="log-meta">
              {{ entry.admin.email }} · {{ entry.entityType }}@if (entry.entityId) { ({{ entry.entityId }}) } · IP {{ entry.ipAddress || 'desconocida' }}
            </p>
            @if (entry.before || entry.after) {
              <div class="log-diff">
                <span class="before">Antes: {{ formatJson(entry.before) }}</span>
                <span class="after">Después: {{ formatJson(entry.after) }}</span>
              </div>
            }
          </app-card>
        }
        <div class="pagination">
          <button appButton="ghost" [disabled]="page === 1" (click)="goToPage(page - 1)">Anterior</button>
          <span>Página {{ page }}</span>
          <button appButton="ghost" [disabled]="entries.length < limit" (click)="goToPage(page + 1)">Siguiente</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-audit-log { padding: 24px; max-width: 820px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .filters select, .filters input { padding: 6px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px; }
    .filters label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-secondary); }
    .log-card { margin-bottom: 12px; }
    .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .log-date { font-size: 0.8rem; color: var(--text-secondary); }
    .log-meta { margin: 0 0 8px; font-size: 0.85rem; color: var(--text-secondary); }
    .log-diff { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-family: monospace; }
    .log-diff .before { color: var(--danger, #b91c1c); }
    .log-diff .after { color: var(--success, #15803d); }
    .pagination { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
  `],
})
export class AdminAuditLogComponent implements OnInit {
  private admin = inject(AdminService);
  private snackBar = inject(MatSnackBar);

  loading = true;
  entries: AdminAuditLogEntry[] = [];
  entityTypes: string[] = [];
  page = 1;
  limit = 20;

  entityTypeFilter = '';
  fromFilter = '';
  toFilter = '';

  ngOnInit(): void {
    this.admin.listAuditLogEntityTypes().subscribe({
      next: (types) => (this.entityTypes = types),
      error: () => {},
    });
    this.load();
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

  clearFilters(): void {
    this.entityTypeFilter = '';
    this.fromFilter = '';
    this.toFilter = '';
    this.onFilterChange();
  }

  formatJson(value: unknown): string {
    if (value === null || value === undefined) return '—';
    return JSON.stringify(value);
  }

  private load(): void {
    this.loading = true;
    this.admin
      .listAuditLog(this.page, this.limit, {
        entityType: this.entityTypeFilter || undefined,
        from: this.fromFilter || undefined,
        to: this.toFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          this.entries = res.data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('No se pudo cargar el registro de cambios', 'Cerrar', { duration: 5000 });
        },
      });
  }
}
