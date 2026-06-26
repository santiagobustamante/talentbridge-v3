import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SkillsService } from '../../core/services/skills.service';
import { ProfileService } from '../../core/services/profile.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { Skill } from '../../core/auth/auth.models';
import { SKILL_CATALOG, filterCatalog, SkillCatalogEntry } from '../../core/services/skill-catalog';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatCardModule,
    MatIconModule, MatChipsModule, MatSnackBarModule, MatAutocompleteModule, MatSlideToggleModule,
  ],
  styleUrl: './skills.component.scss',
  template: `
    <div class="page-content">
      <header class="page-header animate-fade-in">
        <div class="header-icon">
          <mat-icon>psychology</mat-icon>
        </div>
        <div class="header-text">
          <h1>Mapa de habilidades</h1>
          <p class="subtitle">Gestiona y organiza tus competencias</p>
        </div>
      </header>

      <div class="visibility-bar" *ngIf="profileLoaded">
        <span class="vis-label">Mostrar habilidades en perfil público</span>
        <mat-slide-toggle [checked]="showSkills" (change)="toggleVisibility($event)" color="primary"></mat-slide-toggle>
      </div>

      <div class="form-card glass-card animate-fade-in-up">
        <form [formGroup]="form" (ngSubmit)="save()" class="inline-form">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>Nombre de la habilidad</mat-label>
            <input matInput formControlName="name" [matAutocomplete]="auto"
                   placeholder="Ej. Angular, Python, Figma..." />
            <mat-autocomplete #auto="matAutocomplete">
              @for (opt of filteredSuggestions; track opt.name) {
                <mat-option [value]="opt.name">
                  <span class="suggestion-name">{{ opt.name }}</span>
                  <span class="suggestion-cat">{{ opt.category }}</span>
                </mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>
          <mat-form-field appearance="outline" class="level-field">
            <mat-label>Nivel</mat-label>
            <mat-select formControlName="level">
              <mat-option value="BASIC">Básico</mat-option>
              <mat-option value="INTERMEDIATE">Intermedio</mat-option>
              <mat-option value="ADVANCED">Avanzado</mat-option>
              <mat-option value="EXPERT">Experto</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button class="add-btn" type="submit" [disabled]="form.invalid">
            <mat-icon>{{ editing ? 'check' : 'add' }}</mat-icon>
            {{ editing ? 'Actualizar' : 'Agregar' }}
          </button>
          <button mat-button class="cancel-btn" type="button" *ngIf="editing" (click)="cancelEdit()">
            Cancelar
          </button>
        </form>
      </div>

      <ng-container *ngIf="skills.length > 0; else emptyState">
        <div class="skills-grid">
          <div
            *ngFor="let s of skills; let i = index"
            class="skill-card glass-card animate-fade-in-scale"
            [ngClass]="'stagger-' + ((i % 6) + 1)"
            [attr.data-level]="s.level"
          >
            <div class="skill-header">
              <h3 class="skill-name">{{ s.name }}</h3>
              <span class="level-badge" [attr.data-level]="s.level">{{ levelLabel(s.level) }}</span>
            </div>
            <div class="level-bar">
              <div class="level-fill" [style.width.%]="levelPercent(s.level)"></div>
            </div>
            <div class="level-dots">
              <span class="dot" *ngFor="let d of [1,2,3,4]; let idx = index" [class.filled]="idx < levelDots(s.level)"></span>
            </div>
            <div class="skill-actions">
              <button mat-icon-button class="edit-btn" (click)="startEdit(s)" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button class="delete-btn" (click)="remove(s.id)" aria-label="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state animate-fade-in-scale">
          <div class="empty-icon">
            <mat-icon>lightbulb</mat-icon>
          </div>
          <h2>Sin habilidades aún</h2>
          <p>Agrega tu primera habilidad usando el formulario superior</p>
        </div>
      </ng-template>
    </div>
  `,
})
export class SkillsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SkillsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private profileService = inject(ProfileService);

  skills: Skill[] = [];
  editing: number | null = null;
  showSkills = true;
  profileLoaded = false;
  filteredSuggestions: SkillCatalogEntry[] = [];
  form = this.fb.group({ name: ['', Validators.required], level: ['BASIC'] });

  ngOnInit() {
    this.load();
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showSkills = p.showSkills ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
    this.form.get('name')?.valueChanges.subscribe(val => {
      this.filteredSuggestions = filterCatalog(val || '');
    });
  }

  load() { this.service.getAll().subscribe({ next: (d) => (this.skills = d) }); }

  save() {
    const data = this.form.value as { name: string; level: string };
    if (this.editing) {
      this.service.update(this.editing, data).subscribe({
        next: () => { this.load(); this.cancelEdit(); this.snackBar.open(`Habilidad actualizada`, 'Cerrar', { duration: 2000 }); },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.message || err?.message || 'Error al actualizar';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    } else {
      this.service.create(data).subscribe({
        next: () => { this.load(); this.form.reset({ name: '', level: 'BASIC' }); this.snackBar.open(`Habilidad creada`, 'Cerrar', { duration: 2000 }); },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.message || err?.message || 'Error al guardar';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    }
  }

  startEdit(s: Skill) { this.editing = s.id; this.form.setValue({ name: s.name, level: s.level }); }

  cancelEdit() { this.editing = null; this.form.reset({ name: '', level: 'BASIC' }); }

  toggleVisibility(event: any) {
    this.showSkills = event.checked;
    this.profileService.updateProfile({ showSkills: this.showSkills } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showSkills = !this.showSkills; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

  remove(id: number) {
    const ref = this.dialog.open(ConfirmDialogComponent, { data: { title: 'Eliminar Habilidad', message: '¿Estás seguro?' } });
    ref.afterClosed().subscribe((ok) => { if (ok) this.service.delete(id).subscribe(() => this.load()); });
  }

  levelLabel(level: string): string {
    const map: Record<string, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado', EXPERT: 'Experto' };
    return map[level] || level;
  }

  levelPercent(level: string): number {
    const map: Record<string, number> = { BASIC: 25, INTERMEDIATE: 50, ADVANCED: 75, EXPERT: 100 };
    return map[level] || 0;
  }

  levelDots(level: string): number {
    const map: Record<string, number> = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
    return map[level] || 0;
  }
}
