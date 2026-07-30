import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, CatalogGroup, SystemCatalogEntry } from '../../core/services/admin.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';

/**
 * Catálogos de opciones (modalidad, tipo de contrato, jornada de oferta
 * laboral, por ahora — ver docs/plan-panel-administrativo.md Fase 3 para el
 * resto pendiente). Un valor nunca se borra físicamente, solo se
 * activa/desactiva — datos históricos pueden seguir referenciándolo.
 */
@Component({
  selector: 'app-admin-catalogs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, CardComponent, BadgeComponent, ButtonDirective],
  template: `
    <div class="admin-catalogs">
      <h1>Catálogos</h1>
      <p class="subtitle">Listas de opciones usadas en formularios de la plataforma. Agregar o desactivar un valor acá se refleja de inmediato, sin redeploy.</p>

      @if (loading) {
        <p>Cargando...</p>
      } @else {
        @for (group of groups; track group.catalogKey) {
          <app-card variant="elevated" padding="md" class="group-card">
            <h2>{{ group.catalogKey }}</h2>
            <table class="entries-table">
              <tbody>
                @for (entry of group.entries; track entry.id) {
                  <tr [class.inactive]="!entry.active">
                    <td class="value-cell">{{ entry.label }}</td>
                    <td>
                      <app-badge [tone]="entry.active ? 'success' : 'neutral'">{{ entry.active ? 'Activo' : 'Inactivo' }}</app-badge>
                    </td>
                    <td class="actions-cell">
                      <button appButton="ghost" size="sm" (click)="toggleActive(entry)">
                        {{ entry.active ? 'Desactivar' : 'Reactivar' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="add-entry">
              <input placeholder="Nuevo valor" [(ngModel)]="newValue[group.catalogKey]" />
              <input placeholder="Texto a mostrar" [(ngModel)]="newLabel[group.catalogKey]" />
              <button appButton="secondary" size="sm" (click)="addEntry(group.catalogKey)">Agregar</button>
            </div>
          </app-card>
        }
      }
    </div>
  `,
  styles: [`
    .admin-catalogs { padding: 24px; max-width: 820px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .group-card { margin-bottom: 20px; }
    .group-card h2 { margin: 0 0 12px; font-size: 1rem; font-family: monospace; }
    .entries-table { width: 100%; border-collapse: collapse; }
    .entries-table td { padding: 6px 8px; border-bottom: 1px solid var(--border, #e5e7eb); font-size: 0.9rem; }
    .entries-table tr.inactive .value-cell { color: var(--text-secondary); text-decoration: line-through; }
    .actions-cell { text-align: right; }
    .add-entry { display: flex; gap: 8px; margin-top: 12px; }
    .add-entry input { flex: 1; padding: 6px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px; }
  `],
})
export class AdminCatalogsComponent implements OnInit {
  private admin = inject(AdminService);
  private snackBar = inject(MatSnackBar);

  loading = true;
  groups: CatalogGroup[] = [];
  newValue: Record<string, string> = {};
  newLabel: Record<string, string> = {};

  ngOnInit(): void {
    this.load();
  }

  toggleActive(entry: SystemCatalogEntry): void {
    this.admin.updateCatalogEntry(entry.id, { active: !entry.active }).subscribe({
      next: (updated) => {
        entry.active = updated.active;
        this.snackBar.open(`"${entry.label}" ${updated.active ? 'reactivado' : 'desactivado'}`, 'Cerrar', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.message || 'No se pudo actualizar', 'Cerrar', { duration: 5000 }),
    });
  }

  addEntry(catalogKey: string): void {
    const value = this.newValue[catalogKey]?.trim();
    const label = this.newLabel[catalogKey]?.trim();
    if (!value || !label) {
      this.snackBar.open('Completa valor y texto a mostrar', 'Cerrar', { duration: 3000 });
      return;
    }
    this.admin.createCatalogEntry(catalogKey, value, label).subscribe({
      next: () => {
        this.newValue[catalogKey] = '';
        this.newLabel[catalogKey] = '';
        this.snackBar.open('Valor agregado', 'Cerrar', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'No se pudo agregar', 'Cerrar', { duration: 5000 }),
    });
  }

  private load(): void {
    this.loading = true;
    this.admin.listCatalogs().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudieron cargar los catálogos', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
