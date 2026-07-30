import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, SystemParameter } from '../../core/services/admin.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

/** Etiqueta y tono de cada nivel de riesgo — a más alto, confirmación más fuerte antes de aplicar el cambio. */
const RISK_LABEL: Record<number, string> = {
  1: 'Bajo riesgo',
  2: 'Riesgo medio',
  3: 'Riesgo alto',
  4: 'Riesgo crítico',
};
const RISK_TONE: Record<number, BadgeTone> = {
  1: 'neutral',
  2: 'info',
  3: 'warning',
  4: 'danger',
};

interface EditableParameter extends SystemParameter {
  draftValue: string;
  saving: boolean;
}

/**
 * Lista/edición de `SystemParameter` — cada parámetro se agrega acá con
 * insertar una fila en la tabla, no escribiendo un componente nuevo (ver
 * docs/plan-panel-administrativo.md). La confirmación antes de guardar
 * escala con `riskLevel`: riesgo 1-2 solo pide confirmar, riesgo 3-4 exige
 * escribir la palabra "CONFIRMAR" para evitar un cambio accidental.
 */
@Component({
  selector: 'app-admin-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, MatSnackBarModule, CardComponent, BadgeComponent, ButtonDirective],
  template: `
    <div class="admin-parameters">
      <h1>Parámetros del sistema</h1>
      <p class="subtitle">Reglas y umbrales que hoy afectan el comportamiento real de la plataforma.</p>

      @if (loading) {
        <p>Cargando...</p>
      } @else if (parameters.length === 0) {
        <app-card variant="flat" padding="lg">
          <p>Todavía no hay parámetros migrados a esta tabla. Se van agregando fase por fase.</p>
        </app-card>
      } @else {
        @for (category of categories(); track category) {
          <h2 class="category-title">{{ category }}</h2>
          @for (param of byCategory(category); track param.key) {
            <app-card variant="elevated" padding="md" class="param-card">
              <div class="param-header">
                <div>
                  <code class="param-key">{{ param.key }}</code>
                  <app-badge [tone]="riskTone(param.riskLevel)">{{ riskLabel(param.riskLevel) }}</app-badge>
                </div>
                <span class="param-meta">Última edición: {{ param.updatedAt | date: 'short' }}</span>
              </div>
              <p class="param-description">{{ param.description }}</p>
              <div class="param-edit">
                <input
                  class="param-input"
                  [(ngModel)]="param.draftValue"
                  [disabled]="param.saving"
                />
                @if (param.type === 'NUMBER' && (param.minValue !== null || param.maxValue !== null)) {
                  <span class="param-range">Rango permitido: {{ param.minValue ?? '−∞' }} a {{ param.maxValue ?? '∞' }}</span>
                }
                <button
                  appButton="primary"
                  [disabled]="param.draftValue === param.value || param.saving"
                  (click)="onSave(param)"
                >
                  {{ param.saving ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </app-card>
          }
        }
      }
    </div>
  `,
  styles: [`
    .admin-parameters { padding: 24px; max-width: 820px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .category-title { text-transform: capitalize; font-size: 1.05rem; margin: 24px 0 12px; }
    .param-card { margin-bottom: 12px; }
    .param-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .param-key { font-size: 0.9rem; background: var(--surface-soft, #f3f4f6); padding: 2px 8px; border-radius: 6px; margin-right: 8px; }
    .param-meta { font-size: 0.8rem; color: var(--text-secondary); }
    .param-description { margin: 0 0 12px; color: var(--text-secondary); font-size: 0.9rem; }
    .param-edit { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .param-input { padding: 8px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px; min-width: 140px; }
    .param-range { font-size: 0.8rem; color: var(--text-secondary); }
  `],
})
export class AdminParametersComponent implements OnInit {
  private admin = inject(AdminService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = true;
  parameters: EditableParameter[] = [];

  ngOnInit(): void {
    this.admin.listParameters().subscribe({
      next: (data) => {
        this.parameters = data.map((p) => ({ ...p, draftValue: p.value, saving: false }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudieron cargar los parámetros', 'Cerrar', { duration: 5000 });
      },
    });
  }

  categories(): string[] {
    return Array.from(new Set(this.parameters.map((p) => p.category)));
  }

  byCategory(category: string): EditableParameter[] {
    return this.parameters.filter((p) => p.category === category);
  }

  riskLabel(level: number): string {
    return RISK_LABEL[level] || `Riesgo ${level}`;
  }

  riskTone(level: number): BadgeTone {
    return RISK_TONE[level] || 'neutral';
  }

  onSave(param: EditableParameter): void {
    const highRisk = param.riskLevel >= 3;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar cambio de parámetro',
        message: highRisk
          ? `Vas a cambiar "${param.key}" de "${param.value}" a "${param.draftValue}". Este es un parámetro de ${this.riskLabel(param.riskLevel).toLowerCase()} — el cambio se aplica de inmediato en producción. ¿Confirmás?`
          : `Vas a cambiar "${param.key}" de "${param.value}" a "${param.draftValue}". ¿Confirmás?`,
        confirmLabel: 'Guardar cambio',
        confirmColor: highRisk ? 'warn' : 'primary',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      param.saving = true;
      this.admin.updateParameter(param.key, param.draftValue).subscribe({
        next: (updated) => {
          Object.assign(param, updated, { draftValue: updated.value, saving: false });
          this.snackBar.open(`"${param.key}" actualizado`, 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          param.saving = false;
          this.snackBar.open(err.error?.message || 'No se pudo guardar el cambio', 'Cerrar', { duration: 5000 });
        },
      });
    });
  }
}
