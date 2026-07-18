import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ExperiencesService } from '../../core/services/experiences.service';
import { ProfileService } from '../../core/services/profile.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { Experience } from '../../core/auth/auth.models';
import { SKILL_CATALOG, filterCatalog, SkillCatalogEntry } from '../../core/services/skill-catalog';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { titleCaseText, trimText } from '../../shared/utils/normalize';

@Component({
  selector: 'app-experiences',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule, MatIconModule, MatChipsModule, MatAutocompleteModule,
    MatSnackBarModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule,
    MatSelectModule, MatSlideToggleModule, AppDatePipe,
  ],
  styleUrl: './experiences.component.scss',
  template: `
    <div class="page-content">
      <header class="page-header animate-fade-in">
        <div class="header-icon"><mat-icon>work_history</mat-icon></div>
        <div class="header-text">
          <h1>Trayectoria profesional</h1>
          <p class="subtitle">Registra tu experiencia laboral</p>
        </div>
      </header>

      <div class="visibility-bar" *ngIf="profileLoaded">
        <span class="vis-label">Mostrar experiencia en perfil público</span>
        <mat-slide-toggle [checked]="showExperience" (change)="toggleVisibility($event)" color="primary"></mat-slide-toggle>
      </div>

      <div class="form-collapsible animate-fade-in-up">
        <button class="toggle-form-btn" (click)="showForm = !showForm">
          <div class="toggle-left">
            <mat-icon>{{ showForm ? 'expand_less' : 'add_circle' }}</mat-icon>
            <span>{{ editing ? 'Editando experiencia' : 'Agregar experiencia' }}</span>
          </div>
          <mat-icon class="chevron">{{ showForm ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>

        <div class="form-body" *ngIf="showForm">
          <form [formGroup]="form" (ngSubmit)="save()" class="experience-form">

            <!-- Bloque 1: Información básica -->
            <div class="form-section">
              <div class="section-label">Información básica</div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Cargo <span class="req">*</span></mat-label>
                  <input matInput formControlName="position" placeholder="Ej. Senior Developer" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Empresa <span class="req">*</span></mat-label>
                  <input matInput formControlName="company" placeholder="Ej. Google" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ciudad</mat-label>
                  <input matInput formControlName="city" placeholder="Ej. Madrid, España" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Modalidad de trabajo</mat-label>
                  <mat-select formControlName="workMode">
                    <mat-option value="">—</mat-option>
                    <mat-option value="ONSITE">Presencial</mat-option>
                    <mat-option value="REMOTE">Remoto</mat-option>
                    <mat-option value="HYBRID">Híbrido</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="span-full">
                  <mat-label>Tipo de contrato</mat-label>
                  <mat-select formControlName="contractType">
                    <mat-option value="">—</mat-option>
                    <mat-option value="FULL_TIME">Tiempo completo</mat-option>
                    <mat-option value="PART_TIME">Medio tiempo</mat-option>
                    <mat-option value="CONTRACTOR">Contratista</mat-option>
                    <mat-option value="INTERNSHIP">Prácticas</mat-option>
                    <mat-option value="FREELANCE">Freelance</mat-option>
                    <mat-option value="TEMPORARY">Temporal</mat-option>
                    <mat-option value="OTHER">Otro</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <!-- Bloque 2: Fechas -->
            <div class="form-section">
              <div class="section-label">Periodo</div>
              <div class="period-row">
                <mat-form-field appearance="outline">
                  <mat-label>Fecha Inicio <span class="req">*</span></mat-label>
                  <input matInput [matDatepicker]="sPicker" formControlName="startDate" />
                  <mat-datepicker-toggle matSuffix [for]="sPicker"/>
                  <mat-datepicker #sPicker/>
                </mat-form-field>
                <mat-form-field appearance="outline" *ngIf="!form.get('isCurrent')?.value">
                  <mat-label>Fecha Fin</mat-label>
                  <input matInput [matDatepicker]="ePicker" formControlName="endDate" />
                  <mat-datepicker-toggle matSuffix [for]="ePicker"/>
                  <mat-datepicker #ePicker/>
                </mat-form-field>
                <mat-checkbox class="period-checkbox" formControlName="isCurrent" color="primary">Trabajo actual</mat-checkbox>
              </div>
            </div>

            <!-- Bloque 3: Descripción profesional -->
            <div class="form-section">
              <div class="section-label">Descripción profesional</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Funciones realizadas</mat-label>
                <textarea matInput rows="3" formControlName="functions" placeholder="Describe tus funciones principales..."></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Logros obtenidos</mat-label>
                <textarea matInput rows="3" formControlName="achievements" placeholder="Describe tus logros y resultados..."></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Herramientas utilizadas</mat-label>
                <input matInput formControlName="tools" placeholder="Ej. Jira, Docker, AWS" />
              </mat-form-field>
            </div>

            <!-- Bloque 4: Habilidades aprendidas -->
            <div class="form-section">
              <div class="section-label">Habilidades aprendidas</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Buscar o agregar habilidad</mat-label>
                <input matInput [formControl]="skillInputCtrl" [matAutocomplete]="skillAuto"
                       placeholder="Ej. Angular, Liderazgo, Git..." />
                <mat-autocomplete #skillAuto="matAutocomplete" (optionSelected)="addSkillChip($event.option.value)">
                  @for (opt of filteredSkillSuggestions; track opt.name) {
                    <mat-option [value]="opt.name">
                      <span class="suggestion-name">{{ opt.name }}</span>
                      <span class="suggestion-cat">{{ opt.category }}</span>
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
              <div class="skills-chips" *ngIf="selectedSkills.length">
                <mat-chip *ngFor="let s of selectedSkills; let i = index" (removed)="removeSkillChip(i)">
                  {{ s }}
                  <mat-icon matChipRemove>cancel</mat-icon>
                </mat-chip>
              </div>
            </div>

            <div class="form-footer">
              <button mat-raised-button class="save-btn" type="submit" [disabled]="form.invalid">
                <mat-icon>{{ editing ? 'check' : 'add' }}</mat-icon>
                {{ editing ? 'Actualizar experiencia' : 'Agregar experiencia' }}
              </button>
              <button mat-button class="cancel-btn" type="button" *ngIf="editing" (click)="cancel()">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <ng-container *ngIf="items.length > 0; else emptyState">
        <div class="timeline">
          <div *ngFor="let e of items; let i = index" class="timeline-item animate-fade-in-up" [ngClass]="'stagger-' + ((i % 6) + 1)">
            <div class="timeline-dot"><mat-icon>work</mat-icon></div>
            <div class="timeline-card">
              <div class="card-top">
                <div class="card-info">
                  <h3 class="position-title">{{ e.position }}</h3>
                  <p class="company-name"><mat-icon>business</mat-icon>{{ e.company }}</p>
                </div>
                <span class="current-badge" *ngIf="e.isCurrent">Actual</span>
              </div>
              <div class="exp-meta-tags">
                <span class="meta-tag" *ngIf="e.city"><mat-icon>location_on</mat-icon>{{ e.city }}</span>
                <span class="meta-tag" *ngIf="e.workMode">{{ workModeLabel(e.workMode) }}</span>
                <span class="meta-tag" *ngIf="e.contractType">{{ contractTypeLabel(e.contractType) }}</span>
              </div>
              <div class="date-range">
                <mat-icon>calendar_today</mat-icon>
                <span>{{ e.startDate | appDate:'monthYear' }} — {{ e.isCurrent ? 'Actualidad' : (e.endDate | appDate:'monthYear') }}</span>
              </div>
              <p class="description" *ngIf="e.functions">{{ e.functions }}</p>
              <p class="description" *ngIf="e.achievements">{{ e.achievements }}</p>
              <div class="skill-chips" *ngIf="e.learnedSkills?.length">
                <span class="skill-chip" *ngFor="let s of e.learnedSkills">{{ s }}</span>
              </div>
              <div class="card-actions">
                <button mat-icon-button class="edit-btn" (click)="startEdit(e); showForm = true" aria-label="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button class="delete-btn" (click)="remove(e.id)" aria-label="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state animate-fade-in-scale">
          <div class="empty-icon"><mat-icon>timeline</mat-icon></div>
          <h2>Sin experiencia registrada</h2>
          <p>Comienza a construir tu trayectoria profesional</p>
        </div>
      </ng-template>
    </div>
  `,
})
export class ExperiencesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ExperiencesService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private profileService = inject(ProfileService);

  items: Experience[] = [];
  editing: number | null = null;
  showForm = false;
  showExperience = true;
  profileLoaded = false;
  selectedSkills: string[] = [];
  skillInputCtrl = this.fb.control('');
  filteredSkillSuggestions: SkillCatalogEntry[] = [];

  form = this.fb.group({
    company: ['', Validators.required],
    position: ['', Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null],
    isCurrent: [false],
    city: [''],
    workMode: [''],
    contractType: [''],
    functions: [''],
    achievements: [''],
    tools: [''],
  });

  ngOnInit() {
    this.load();
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showExperience = p.showExperience ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
    this.skillInputCtrl.valueChanges.subscribe(val => {
      this.filteredSkillSuggestions = filterCatalog(val || '');
    });
  }

  load() { this.service.getAll().subscribe({ next: (d) => (this.items = d) }); }

  toggleVisibility(event: any) {
    this.showExperience = event.checked;
    this.profileService.updateProfile({ showExperience: this.showExperience } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showExperience = !this.showExperience; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

  addSkillChip(name: string) {
    const exists = this.selectedSkills.some(s => s.toLowerCase() === name.toLowerCase());
    if (!exists) {
      this.selectedSkills.push(name);
    }
    this.skillInputCtrl.setValue('');
  }

  removeSkillChip(index: number) {
    this.selectedSkills.splice(index, 1);
  }

  save() {
    const v = this.form.value;
    const data = {
      company: titleCaseText(v.company!),
      position: titleCaseText(v.position!),
      startDate: v.startDate?.toISOString().split('T')[0] || '',
      endDate: v.isCurrent ? undefined : (v.endDate?.toISOString().split('T')[0] || undefined),
      isCurrent: v.isCurrent || false,
      city: v.city ? titleCaseText(v.city) : undefined,
      workMode: v.workMode || undefined,
      contractType: v.contractType || undefined,
      functions: v.functions ? trimText(v.functions) : undefined,
      achievements: v.achievements ? trimText(v.achievements) : undefined,
      tools: v.tools ? trimText(v.tools) : undefined,
      learnedSkills: this.selectedSkills.length ? this.selectedSkills : undefined,
    };

    const req = this.editing
      ? this.service.update(this.editing, data)
      : this.service.create(data);

    req.subscribe({
      next: () => {
        this.load();
        this.cancel();
        this.snackBar.open('Experiencia guardada', 'Cerrar', { duration: 2000 });
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Error al guardar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  startEdit(e: Experience) {
    this.editing = e.id;
    this.selectedSkills = [...(e.learnedSkills || [])];
    this.form.setValue({
      company: e.company,
      position: e.position,
      startDate: new Date(e.startDate),
      endDate: e.endDate ? new Date(e.endDate) : null,
      isCurrent: e.isCurrent || false,
      city: e.city || '',
      workMode: e.workMode || '',
      contractType: e.contractType || '',
      functions: e.functions || '',
      achievements: e.achievements || '',
      tools: e.tools || '',
    });
  }

  cancel() {
    this.editing = null;
    this.showForm = false;
    this.selectedSkills = [];
    this.skillInputCtrl.setValue('');
    this.form.reset({
      company: '', position: '', startDate: null, endDate: null, isCurrent: false,
      city: '', workMode: '', contractType: '', functions: '', achievements: '', tools: '',
    });
  }

  remove(id: number) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar', message: '¿Eliminar esta experiencia?' },
    });
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

  workModeLabel(m: string): string {
    const map: Record<string, string> = { ONSITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' };
    return map[m] || m;
  }

  contractTypeLabel(t: string): string {
    const map: Record<string, string> = {
      FULL_TIME: 'Tiempo completo', PART_TIME: 'Medio tiempo', CONTRACTOR: 'Contratista',
      INTERNSHIP: 'Prácticas', FREELANCE: 'Freelance', TEMPORARY: 'Temporal', OTHER: 'Otro',
    };
    return map[t] || t;
  }
}
