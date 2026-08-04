import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AdminDashboardStats, AdminService } from '../../core/services/admin.service';
import { CardComponent } from '../../shared/components/card/card.component';

/**
 * Panel de control (Fase 14) — métricas generales agregadas en vivo desde
 * `admin-service` (usuarios por rol, ofertas por estado, postulaciones
 * totales). Sin modelo propio: son `COUNT`/`GROUP BY` sobre tablas que ya
 * existen. Moderación pendiente no aparece todavía porque ese modelo
 * (`Report`) no existe (ver Fase 12 de docs/plan-panel-administrativo.md).
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, CardComponent],
  template: `
    <div class="admin-dashboard">
      <h1>Panel de control</h1>
      <p class="subtitle">Resumen general del sistema, en vivo.</p>

      @if (loading) {
        <p>Cargando...</p>
      } @else if (stats) {
        <h2 class="section-title">Usuarios</h2>
        <div class="stats-grid">
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.users.candidates }}</span>
            <span class="stat-label">Candidatos</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.users.companies }}</span>
            <span class="stat-label">Empresas</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.users.admins }}</span>
            <span class="stat-label">Administradores</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card" [class.stat-card--warn]="stats.users.suspended > 0">
            <span class="stat-value">{{ stats.users.suspended }}</span>
            <span class="stat-label">Cuentas suspendidas</span>
          </app-card>
        </div>

        <h2 class="section-title">Ofertas laborales</h2>
        <div class="stats-grid">
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.jobOffers.published }}</span>
            <span class="stat-label">Publicadas</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.jobOffers.draft }}</span>
            <span class="stat-label">En borrador</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.jobOffers.closed }}</span>
            <span class="stat-label">Cerradas</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.jobOffers.archived }}</span>
            <span class="stat-label">Archivadas</span>
          </app-card>
        </div>

        <h2 class="section-title">Postulaciones y moderación</h2>
        <div class="stats-grid">
          <app-card variant="elevated" padding="md" class="stat-card">
            <span class="stat-value">{{ stats.totalApplications }}</span>
            <span class="stat-label">Postulaciones totales</span>
          </app-card>
          <app-card variant="elevated" padding="md" class="stat-card" [class.stat-card--warn]="stats.pendingReports > 0">
            <span class="stat-value">{{ stats.pendingReports }}</span>
            <span class="stat-label">Reportes pendientes</span>
          </app-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-dashboard { padding: 24px; max-width: 820px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .section-title { margin: 0 0 12px; font-size: 1rem; color: var(--text-secondary); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
    .stat-card { display: flex; flex-direction: column; gap: 4px; }
    .stat-card--wide { grid-column: 1 / -1; max-width: 220px; }
    .stat-value { font-size: 1.75rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 0.85rem; color: var(--text-secondary); }
    .stat-card--warn .stat-value { color: var(--danger, #dc2626); }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private admin = inject(AdminService);

  loading = true;
  stats: AdminDashboardStats | null = null;

  ngOnInit(): void {
    this.admin.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
