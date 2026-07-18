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

  ngOnInit() {
    this.load();
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showSkills = p.showSkills ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
  }

  load() { this.service.getAll().subscribe({ next: (d) => (this.skills = d) }); }

  // ─── Catálogo ───

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

  get searchTruncated(): boolean {
    const q = this.catalogQuery.trim().toLowerCase();
    if (!q) return false;
    return SKILL_CATALOG.filter((e) => e.name.toLowerCase().includes(q)).length > MAX_SEARCH_RESULTS;
  }

  selectCategory(category: string): void {
    this.activeCategory = this.activeCategory === category ? null : category;
  }

  isOwned(name: string): boolean {
    const n = name.toLowerCase();
    return this.skills.some((s) => s.name.toLowerCase() === n);
  }

  isSelected(name: string): boolean {
    return this.selectedNames.has(name);
  }

  toggleSelect(name: string): void {
    if (this.isOwned(name)) return;
    if (this.selectedNames.has(name)) {
      this.selectedNames.delete(name);
    } else {
      this.selectedNames.add(name);
    }
  }

  clearSelection(): void {
    this.selectedNames.clear();
  }

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

  setCustomLevel(level: SkillLevel): void {
    this.customForm.patchValue({ level });
  }

  // ─── Edición de nivel inline ───

  startLevelEdit(skill: Skill): void {
    this.editingLevelId = skill.id;
  }

  cancelLevelEdit(): void {
    this.editingLevelId = null;
  }

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

  toggleVisibility(event: any) {
    this.showSkills = event.checked;
    this.profileService.updateProfile({ showSkills: this.showSkills } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showSkills = !this.showSkills; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

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
