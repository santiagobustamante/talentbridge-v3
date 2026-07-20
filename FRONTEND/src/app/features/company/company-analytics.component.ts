import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsService, CompanyAnalytics } from '../../core/services/analytics.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { statusToTone } from '../../shared/components/badge/status-tone.util';
import { statusToLabel } from '../../shared/components/badge/status-label.util';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/** Orden fijo del embudo de postulaciones — el pipeline real, no alfabético ni por volumen. */
const FUNNEL_ORDER = ['PENDING', 'REVIEWED', 'PRESELECTED', 'HIRED', 'REJECTED'];

interface FunnelBar {
  status: string;
  label: string;
  tone: BadgeTone;
  count: number;
  widthPercent: number;
}

interface TrendBar {
  date: string;
  count: number;
  heightPercent: number;
  showLabel: boolean;
}

/**
 * Panel de analítica de la empresa (ruta "/company/analytics"): embudo de
 * postulaciones por estado, tendencia de los últimos 30 días y ranking de
 * vacantes por volumen de postulaciones. Todo calculado en el backend sobre
 * datos que ya existían (JobOffer/JobApplication) — ver `AnalyticsService`.
 */
@Component({
  selector: 'app-company-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, CardComponent, BadgeComponent, EmptyStateComponent, AppDatePipe],
  templateUrl: './company-analytics.component.html',
  styleUrl: './company-analytics.component.scss',
})
export class CompanyAnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  data = signal<CompanyAnalytics | null>(null);
  loading = signal(true);
  error = signal(false);

  funnel = computed<FunnelBar[]>(() => {
    const d = this.data();
    if (!d) return [];
    const maxCount = Math.max(1, ...FUNNEL_ORDER.map((s) => d.statusFunnel[s] || 0));
    return FUNNEL_ORDER.map((status) => {
      const count = d.statusFunnel[status] || 0;
      return {
        status,
        label: statusToLabel(status),
        tone: statusToTone(status),
        count,
        widthPercent: Math.round((count / maxCount) * 100),
      };
    });
  });

  trendBars = computed<TrendBar[]>(() => {
    const d = this.data();
    if (!d) return [];
    const maxCount = Math.max(1, ...d.trend.map((t) => t.count));
    return d.trend.map((t, i) => ({
      date: t.date,
      count: t.count,
      heightPercent: Math.max(4, Math.round((t.count / maxCount) * 100)),
      // Una etiqueta cada 5 días (y el último) para no saturar el eje de fechas.
      showLabel: i % 5 === 0 || i === d.trend.length - 1,
    }));
  });

  ngOnInit(): void {
    this.analyticsService.getCompanyAnalytics().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  statusTone(s: string): BadgeTone {
    return statusToTone(s);
  }

  statusLabel(s: string): string {
    return statusToLabel(s);
  }

  /** Formatea "2026-07-20" a "20 jul" para las etiquetas del eje de la tendencia. */
  shortDayLabel(dateStr: string): string {
    const [, month, day] = dateStr.split('-');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]}`;
  }
}
