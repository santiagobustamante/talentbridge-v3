import { Component } from '@angular/core';
import { CardComponent } from '../../shared/components/card/card.component';

/**
 * Placeholder del dashboard admin — las métricas reales (usuarios, empresas,
 * ofertas activas, alertas de moderación pendientes) se agregan en las fases
 * siguientes del plan (ver docs/plan-panel-administrativo.md), una vez que
 * exista contenido real que resumir (moderación, catálogos).
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CardComponent],
  template: `
    <div class="admin-dashboard">
      <h1>Panel de control</h1>
      <p class="subtitle">Resumen general del sistema — próximamente.</p>
      <app-card variant="flat" padding="lg">
        <p>
          Esta sección va a mostrar métricas generales (usuarios, empresas, ofertas activas,
          postulaciones, alertas de moderación pendientes) a medida que se construyan las
          fases siguientes del panel administrativo.
        </p>
      </app-card>
    </div>
  `,
  styles: [`
    .admin-dashboard { padding: 24px; max-width: 720px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
  `],
})
export class AdminDashboardComponent {}
