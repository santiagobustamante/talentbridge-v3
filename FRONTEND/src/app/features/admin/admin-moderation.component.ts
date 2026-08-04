import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, AdminReport } from '../../core/services/admin.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';

/**
 * Moderación de contenido (Fase 12) — reportes de ofertas laborales,
 * mensajes de chat y usuarios, hechos por candidatos/empresas. Resolver un
 * reporte solo cambia su estado (descartado/resuelto) — no automatiza
 * ninguna acción de remediación (despublicar oferta, suspender usuario):
 * esas ya existen como funciones propias del panel (Catálogos/Usuarios), un
 * admin las aplica por separado si corresponde.
 */
@Component({
  selector: 'app-admin-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, CardComponent, BadgeComponent, ButtonDirective],
  template: `
    <div class="admin-moderation">
      <h1>Moderación</h1>
      <p class="subtitle">Reportes de contenido hechos por candidatos y empresas.</p>

      <div class="filters">
        <select [(ngModel)]="statusFilter" (change)="onFilterChange()">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="DISMISSED">Descartados</option>
          <option value="ACTION_TAKEN">Resueltos</option>
        </select>
        <select [(ngModel)]="typeFilter" (change)="onFilterChange()">
          <option value="">Todos los tipos</option>
          <option value="JOB_OFFER">Ofertas laborales</option>
          <option value="CHAT_MESSAGE">Mensajes de chat</option>
          <option value="USER">Usuarios</option>
        </select>
      </div>

      @if (loading) {
        <p>Cargando...</p>
      } @else if (reports.length === 0) {
        <app-card variant="flat" padding="lg">
          <p>No hay reportes con estos filtros.</p>
        </app-card>
      } @else {
        <div class="reports-list">
          @for (r of reports; track r.id) {
            <app-card variant="elevated" padding="md" class="report-card">
              <div class="report-header">
                <app-badge [tone]="typeTone(r.targetType)">{{ typeLabel(r.targetType) }}</app-badge>
                <app-badge [tone]="statusTone(r.status)">{{ statusLabel(r.status) }}</app-badge>
                <span class="report-date">{{ r.createdAt | date:'short' }}</span>
              </div>
              <p class="report-target">{{ targetSummary(r) }}</p>
              <p class="report-reason"><strong>Motivo:</strong> {{ r.reason }}</p>
              <p class="report-meta">Reportado por {{ r.reporter.email }}</p>
              @if (r.status === 'PENDING') {
                <div class="report-actions">
                  <button appButton="ghost" size="sm" [disabled]="resolvingId === r.id" (click)="resolve(r, 'DISMISSED')">Descartar</button>
                  <button appButton="primary" size="sm" [disabled]="resolvingId === r.id" (click)="resolve(r, 'ACTION_TAKEN')">Marcar resuelto</button>
                </div>
              } @else if (r.reviewedBy) {
                <p class="report-meta">Revisado por {{ r.reviewedBy.email }}</p>
              }
            </app-card>
          }
        </div>

        <div class="pagination" *ngIf="total > limit">
          <button appButton="ghost" size="sm" [disabled]="page === 1" (click)="goToPage(page - 1)">Anterior</button>
          <span>Página {{ page }}</span>
          <button appButton="ghost" size="sm" [disabled]="page * limit >= total" (click)="goToPage(page + 1)">Siguiente</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-moderation { padding: 24px; max-width: 820px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .filters select { padding: 6px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px; min-width: 0; }
    .reports-list { display: flex; flex-direction: column; gap: 12px; }
    .report-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .report-date { margin-left: auto; font-size: 0.8rem; color: var(--text-secondary); }
    .report-target { font-weight: 600; margin: 0 0 4px; }
    .report-reason { margin: 0 0 4px; font-size: 0.9rem; }
    .report-meta { margin: 0; font-size: 0.8rem; color: var(--text-secondary); }
    .report-actions { display: flex; gap: 8px; margin-top: 10px; }
    .pagination { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
  `],
})
export class AdminModerationComponent implements OnInit {
  private admin = inject(AdminService);
  private snackBar = inject(MatSnackBar);

  loading = true;
  reports: AdminReport[] = [];
  total = 0;
  page = 1;
  readonly limit = 20;
  statusFilter = '';
  typeFilter = '';
  resolvingId: number | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.admin.listReports({
      status: this.statusFilter || undefined,
      targetType: this.typeFilter || undefined,
      page: this.page,
      limit: this.limit,
    }).subscribe({
      next: (res) => {
        this.reports = res.data;
        this.total = res.total;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
  }

  resolve(report: AdminReport, status: 'DISMISSED' | 'ACTION_TAKEN'): void {
    this.resolvingId = report.id;
    this.admin.resolveReport(report.id, status).subscribe({
      next: () => {
        this.resolvingId = null;
        this.snackBar.open(status === 'DISMISSED' ? 'Reporte descartado' : 'Reporte marcado como resuelto', 'Cerrar', { duration: 2500 });
        this.load();
      },
      error: (err) => {
        this.resolvingId = null;
        this.snackBar.open(err.error?.message || 'Error al resolver el reporte', 'Cerrar', { duration: 4000 });
      },
    });
  }

  typeLabel(t: string): string {
    return t === 'JOB_OFFER' ? 'Oferta laboral' : t === 'CHAT_MESSAGE' ? 'Mensaje de chat' : 'Usuario';
  }

  typeTone(t: string): 'info' | 'neutral' {
    return t === 'JOB_OFFER' ? 'info' : 'neutral';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { PENDING: 'Pendiente', REVIEWED: 'Revisado', DISMISSED: 'Descartado', ACTION_TAKEN: 'Resuelto' };
    return map[s] || s;
  }

  statusTone(s: string): 'warning' | 'success' | 'neutral' {
    if (s === 'PENDING') return 'warning';
    if (s === 'ACTION_TAKEN') return 'success';
    return 'neutral';
  }

  /** Resumen legible del contenido reportado — según targetType, `target` trae distintos campos (ver ModerationService.list en el backend). */
  targetSummary(r: AdminReport): string {
    if (!r.target) return `#${r.targetId} (ya no existe)`;
    if (r.targetType === 'JOB_OFFER') return `${r.target.title} (${r.target.status})`;
    if (r.targetType === 'CHAT_MESSAGE') return `"${(r.target.body || '').slice(0, 120)}"`;
    return r.target.email + (r.target.suspended ? ' (suspendido)' : '');
  }
}
