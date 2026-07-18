import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { forkJoin, of, catchError } from 'rxjs';
import { SkillsService } from '../../core/services/skills.service';
import { ProfileService } from '../../core/services/profile.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { Skill } from '../../core/auth/auth.models';
import { LevelMeterComponent, SkillLevel } from '../../shared/components/level-meter/level-meter.component';
import { SKILL_CATALOG, SkillCatalogEntry } from '../../core/services/skill-catalog';
import { normalizeSkillDisplay } from '../../shared/utils/normalize';

const MAX_SEARCH_RESULTS = 60;

/**
 * Gestion de habilidades del candidato (ruta "/app/skills"). Combina dos
 * formas de agregar habilidades: (1) seleccion multiple desde el catalogo
 * global (`SKILL_CATALOG`), buscando por texto o filtrando por categoria,
 * eligiendo un nivel de dominio comun y guardando todas de una vez en
 * paralelo; (2) carga de una habilidad personalizada que no esta en el
 * catalogo. Tambien permite editar el nivel de una habilidad ya cargada
 * "en linea" (sin abrir un formulario aparte) y controlar la visibilidad
 * de la seccion en el portafolio publico.
 */
@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatSlideToggleModule,
    LevelMeterComponent,
  ],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss',
})
export class SkillsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SkillsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private profileService = inject(ProfileService);

  skills: Skill[] = [];
  showSkills = true;
  profileLoaded = false;

  // ─── Selector por catálogo: búsqueda + filtro por categoría (sin acordeón) ───
  catalogQuery = '';
  categories = Array.from(new Set(SKILL_CATALOG.map((e) => e.category))).sort((a, b) => a.localeCompare(b, 'es'));
  activeCategory: string | null = null;
  selectedNames = new Set<string>();
  batchLevel: SkillLevel = 'BASIC';
  addingBatch = false;

  // ─── Habilidad personalizada (no está en el catálogo) ───
  customForm = this.fb.group({ name: ['', Validators.required], level: ['BASIC' as SkillLevel] });

  // ─── Edición de nivel inline en una card ya agregada ───
  editingLevelId: number | null = null;

  /** Carga las habilidades del candidato y el flag de visibilidad guardado en el perfil. */
  ngOnInit() {
    this.load();
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showSkills = p.showSkills ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
  }

  /** Trae la lista de habilidades del candidato desde el backend. */
  load() { this.service.getAll().subscribe({ next: (d) => (this.skills = d) }); }

  // ─── Catálogo ───

  /**
   * Entradas del catalogo a mostrar en el selector: si hay texto de
   * busqueda, filtra por nombre en todo el catalogo (limitado a
   * `MAX_SEARCH_RESULTS` para no renderizar de mas); si no hay busqueda
   * pero hay una categoria activa, muestra solo esa categoria; si no hay
   * ninguno de los dos, no muestra nada (evita listar el catalogo entero).
   */
  get visibleEntries(): SkillCatalogEntry[] {
    const q = this.catalogQuery.trim().toLowerCase();
    if (q) {
      return SKILL_CATALOG.filter((e) => e.name.toLowerCase().includes(q)).slice(0, MAX_SEARCH_RESULTS);
    }
    if (this.activeCategory) {
      return SKILL_CATALOG.filter((e) => e.category === this.activeCategory);
    }
    return [];
  }

  /** Indica si la busqueda actual tiene mas resultados de los que se muestran (para avisarle al usuario que afine la busqueda). */
  get searchTruncated(): boolean {
    const q = this.catalogQuery.trim().toLowerCase();
    if (!q) return false;
    return SKILL_CATALOG.filter((e) => e.name.toLowerCase().includes(q)).length > MAX_SEARCH_RESULTS;
  }

  /** Activa/desactiva una categoria del catalogo como filtro (toggle: tocarla de nuevo la desactiva). */
  selectCategory(category: string): void {
    this.activeCategory = this.activeCategory === category ? null : category;
  }

  /** Indica si el candidato ya tiene esta habilidad cargada en su perfil (comparacion case-insensitive). */
  isOwned(name: string): boolean {
    const n = name.toLowerCase();
    return this.skills.some((s) => s.name.toLowerCase() === n);
  }

  /** Indica si una habilidad del catalogo esta marcada para agregar en el lote actual. */
  isSelected(name: string): boolean {
    return this.selectedNames.has(name);
  }

  /** Marca/desmarca una habilidad del catalogo para el lote a agregar; no permite volver a seleccionar una que ya se tiene. */
  toggleSelect(name: string): void {
    if (this.isOwned(name)) return;
    if (this.selectedNames.has(name)) {
      this.selectedNames.delete(name);
    } else {
      this.selectedNames.add(name);
    }
  }

  /** Limpia la seleccion actual del catalogo sin guardar nada. */
  clearSelection(): void {
    this.selectedNames.clear();
  }

  /**
   * Crea en el backend, en paralelo, todas las habilidades marcadas del
   * catalogo con el nivel comun elegido (`batchLevel`). Los fallos
   * individuales (ej. habilidad ya existente) no frenan al resto: se
   * capturan con `catchError` y se reportan por separado del total
   * agregado con exito.
   */
  addSelected(): void {
    const names = Array.from(this.selectedNames);
    if (!names.length || this.addingBatch) return;

    this.addingBatch = true;
    forkJoin(
      names.map((name) =>
        this.service.create({ name, level: this.batchLevel }).pipe(catchError(() => of(null))),
      ),
    ).subscribe((results) => {
      this.addingBatch = false;
      const added = results.filter((r) => r !== null).length;
      const failed = results.length - added;
      this.selectedNames.clear();
      this.load();
      if (failed === 0) {
        this.snackBar.open(`${added} habilidad(es) agregada(s)`, 'Cerrar', { duration: 2500 });
      } else {
        this.snackBar.open(`${added} agregada(s), ${failed} ya existían o fallaron`, 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ─── Habilidad personalizada ───

  /** Crea una habilidad que no esta en el catalogo, normalizando su nombre a un formato de presentacion consistente. */
  addCustom(): void {
    if (this.customForm.invalid) return;
    const raw = this.customForm.value as { name: string; level: SkillLevel };
    const data = { ...raw, name: normalizeSkillDisplay(raw.name) };
    this.service.create(data).subscribe({
      next: () => {
        this.load();
        this.customForm.reset({ name: '', level: 'BASIC' });
        this.snackBar.open('Habilidad agregada', 'Cerrar', { duration: 2000 });
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Error al guardar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Fija el nivel de dominio elegido para la habilidad personalizada en construccion. */
  setCustomLevel(level: SkillLevel): void {
    this.customForm.patchValue({ level });
  }

  // ─── Edición de nivel inline ───

  /** Abre el editor de nivel "en linea" sobre una habilidad ya guardada. */
  startLevelEdit(skill: Skill): void {
    this.editingLevelId = skill.id;
  }

  /** Cierra el editor de nivel inline sin guardar cambios. */
  cancelLevelEdit(): void {
    this.editingLevelId = null;
  }

  /** Actualiza el nivel de dominio de una habilidad ya cargada y cierra el editor inline. */
  updateLevel(skill: Skill, level: SkillLevel): void {
    this.service.update(skill.id, { level }).subscribe({
      next: () => { this.load(); this.editingLevelId = null; },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Error al actualizar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  // ─── Visibilidad y eliminación ───

  /** Actualiza si la seccion de habilidades se muestra en el portafolio publico; revierte el cambio si falla el guardado. */
  toggleVisibility(event: any) {
    this.showSkills = event.checked;
    this.profileService.updateProfile({ showSkills: this.showSkills } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showSkills = !this.showSkills; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

  /** Pide confirmacion y, si se acepta, elimina la habilidad del backend y recarga la lista. */
  remove(id: number) {
    const ref = this.dialog.open(ConfirmDialogComponent, { data: { title: 'Eliminar Habilidad', message: '¿Estás seguro?' } });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.delete(id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.message || err?.message || 'Error al eliminar';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }
}
