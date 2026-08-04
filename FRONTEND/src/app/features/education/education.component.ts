import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EducationService } from '../../core/services/education.service';
import { ProfileService } from '../../core/services/profile.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { Education } from '../../core/auth/auth.models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { titleCaseText, trimText } from '../../shared/utils/normalize';
import { toLocalDateString } from '../../shared/utils/format-date.util';
import { notBlank } from '../../shared/utils/validators/not-blank.validator';

/**
 * Gestion de formacion academica del candidato (ruta "/app/education").
 * Permite crear/editar/eliminar entradas de educacion formal (colegio,
 * tecnico, universidad, posgrado) o no formal (cursos, certificaciones,
 * diplomados, bootcamps) segun `educationType`, y controlar si la
 * seccion se muestra en el portafolio publico.
 */
@Component({
  selector: 'app-education',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule, MatIconModule,
    MatSnackBarModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule,
    MatSelectModule, MatSlideToggleModule, AppDatePipe,
  ],
  styleUrl: './education.component.scss',
  template: `
    <div class="page-content">
      <header class="page-header animate-fade-in">
        <div class="header-icon">
          <mat-icon>school</mat-icon>
        </div>
        <div class="header-text">
          <h1>Formación académica</h1>
          <p class="subtitle">Tu historial educativo y certificaciones</p>
        </div>
      </header>

      <div class="visibility-bar" *ngIf="profileLoaded">
        <span class="vis-label">Mostrar formación en perfil público</span>
        <mat-slide-toggle [checked]="showEducation" (change)="toggleVisibility($event)" color="primary"></mat-slide-toggle>
      </div>

      <div class="form-collapsible animate-fade-in-up">
        <button class="toggle-form-btn glass-card" (click)="showForm = !showForm">
          <div class="toggle-left">
            <mat-icon>{{ showForm ? 'expand_less' : 'add_circle' }}</mat-icon>
            <span>{{ editing ? 'Editando formación' : 'Agregar formación' }}</span>
          </div>
          <mat-icon class="chevron">{{ showForm ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>

        <div class="form-body glass-card" *ngIf="showForm">
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Institución</mat-label>
                <input matInput formControlName="institution" placeholder="Ej. Universidad de Madrid" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Título</mat-label>
                <input matInput formControlName="degree" placeholder="Ej. Ingeniería Informática" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Área de estudio</mat-label>
                <input matInput formControlName="fieldOfStudy" placeholder="Ej. Desarrollo de Software" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo de educación</mat-label>
                <mat-select formControlName="educationType">
                  @for (t of educationTypes; track t.value) {
                    <mat-option [value]="t.value">{{ t.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-full">
                <mat-label>Nivel de formación</mat-label>
                <mat-select formControlName="formationLevel">
                  @for (l of visibleFormationLevels; track l.value) {
                    <mat-option [value]="l.value">{{ l.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="span-full" *ngIf="form.get('formationLevel')?.value === 'Otro'">
                <mat-label>Especifica el nivel de formación</mat-label>
                <input matInput formControlName="customFormationLevel" placeholder="Ej. Especialización, Maestría, Doctorado" maxlength="100" />
              </mat-form-field>
            </div>
            <div class="period-row">
              <mat-form-field appearance="outline">
                <mat-label>Fecha Inicio</mat-label>
                <input matInput [matDatepicker]="sPicker" formControlName="startDate" />
                <mat-datepicker-toggle matSuffix [for]="sPicker"/>
                <mat-datepicker #sPicker/>
              </mat-form-field>
              <mat-form-field appearance="outline" *ngIf="!form.get('isCurrent')?.value">
                <mat-label>Fecha Fin</mat-label>
                <input matInput [matDatepicker]="ePicker" [max]="today" formControlName="endDate" />
                <mat-datepicker-toggle matSuffix [for]="ePicker"/>
                <mat-datepicker #ePicker/>
              </mat-form-field>
              <mat-checkbox class="period-checkbox" formControlName="isCurrent" color="primary">Cursando actualmente</mat-checkbox>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripción</mat-label>
              <textarea matInput rows="3" formControlName="description" placeholder="Describe tu formación, materias relevantes, etc."></textarea>
            </mat-form-field>
            <div class="form-actions">
              <button mat-raised-button class="save-btn" type="submit" [disabled]="form.invalid">
                <mat-icon>{{ editing ? 'check' : 'add' }}</mat-icon>
                {{ editing ? 'Actualizar' : 'Agregar' }}
              </button>
              <button mat-button class="cancel-btn" type="button" *ngIf="editing" (click)="cancel()">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <ng-container *ngIf="items.length > 0; else emptyState">
        <div class="education-grid">
          <div
            *ngFor="let e of items; let i = index"
            class="edu-card glass-card animate-fade-in-scale"
            [ngClass]="'stagger-' + ((i % 6) + 1)"
          >
            <div class="edu-icon">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="edu-body">
              <div class="edu-badges">
                <span class="edu-type-badge" *ngIf="e.educationType">{{ educationTypeLabel(e.educationType) }}</span>
                <span class="edu-level-badge" *ngIf="e.formationLevel">{{ formationLevelLabel(e) }}</span>
              </div>
              <h3 class="degree-title">{{ e.degree }}</h3>
              <p class="institution-name">{{ e.institution }}</p>
              <p class="field-study" *ngIf="e.fieldOfStudy">{{ e.fieldOfStudy }}</p>
              <div class="date-range">
                <mat-icon>calendar_today</mat-icon>
                <span>{{ e.startDate | appDate:'monthYear' }} — {{ e.isCurrent ? 'En curso' : (e.endDate | appDate:'monthYear') }}</span>
              </div>
              <p class="edu-description" *ngIf="e.description">{{ e.description }}</p>
              <span class="current-badge" *ngIf="e.isCurrent">En curso</span>
            </div>
            <div class="edu-actions">
              <button mat-icon-button class="edit-btn" (click)="startEdit(e); showForm = true" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button class="delete-btn" (click)="remove(e.id)" aria-label="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state animate-fade-in-scale">
          <div class="empty-icon">
            <mat-icon>menu_book</mat-icon>
          </div>
          <h2>Sin formación registrada</h2>
          <p>Agrega tu historial académico y certificaciones</p>
        </div>
      </ng-template>
    </div>
  `,
})
export class EducationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(EducationService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private profileService = inject(ProfileService);
  items: Education[] = [];
  editing: number | null = null;
  showForm = false;
  showEducation = true;
  profileLoaded = false;
  readonly today = new Date();
  form = this.fb.group({
    institution: ['', [Validators.required, notBlank]], degree: ['', [Validators.required, notBlank]],
    fieldOfStudy: [''], startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null], isCurrent: [false],
    educationType: [''], formationLevel: [''], customFormationLevel: [''], description: [''],
  });

  // Valores iniciales de respaldo (por si `getCatalogs()` todavía no
  // resolvió o falla) — la fuente de verdad real es `SystemCatalog`,
  // administrable desde el panel admin sin redeploy (Fase 10).
  educationTypes: { value: string; label: string }[] = [
    { value: 'FORMAL', label: 'Formal' },
    { value: 'NON_FORMAL', label: 'No formal' },
  ];
  formationLevels: { value: string; label: string }[] = [
    { value: 'Curso', label: 'Curso' }, { value: 'Certificación', label: 'Certificación' },
    { value: 'Diplomado', label: 'Diplomado' }, { value: 'Seminario', label: 'Seminario' }, { value: 'Bootcamp', label: 'Bootcamp' },
    { value: 'Bachillerato', label: 'Bachillerato' }, { value: 'Técnico', label: 'Técnico' }, { value: 'Tecnólogo', label: 'Tecnólogo' },
    { value: 'Universidad', label: 'Universidad' }, { value: 'Posgrado', label: 'Posgrado' }, { value: 'Otro', label: 'Otro' },
  ];
  /** Valores de `formationLevel` que aplican a educación no formal — el resto (+ "Otro", siempre visible) son de educación formal. División fija en el frontend porque `SystemCatalog` no tiene un campo de agrupación (mismo motivo que dejó fuera el catálogo de habilidades en la Fase 3). */
  private readonly nonFormalLevelValues = new Set(['Curso', 'Certificación', 'Diplomado', 'Seminario', 'Bootcamp']);

  /** Subconjunto de `formationLevels` que corresponde al `educationType` elegido, más "Otro" siempre disponible. */
  get visibleFormationLevels(): { value: string; label: string }[] {
    const isNonFormal = this.form.get('educationType')?.value === 'NON_FORMAL';
    return this.formationLevels.filter((l) => l.value === 'Otro' || this.nonFormalLevelValues.has(l.value) === isNonFormal);
  }

  /** Carga las entradas de formacion existentes, los catálogos del formulario y el flag de visibilidad guardado en el perfil. */
  ngOnInit() {
    this.load();
    this.service.getCatalogs().subscribe({
      next: (catalogs) => {
        this.educationTypes = catalogs.educationType;
        this.formationLevels = catalogs.formationLevel;
      },
      error: () => {},
    });
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showEducation = p.showEducation ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
  }
  /** Trae la lista de formacion academica del candidato desde el backend. */
  load() {
    this.service.getAll().subscribe({
      next: (d) => (this.items = d),
      error: () => this.snackBar.open('No se pudo cargar tu formación académica — intenta recargar la página', 'Cerrar', { duration: 4000 }),
    });
  }

  /** Actualiza si la seccion de formacion se muestra en el portafolio publico; revierte el cambio si falla el guardado. */
  toggleVisibility(event: any) {
    this.showEducation = event.checked;
    this.profileService.updateProfile({ showEducation: this.showEducation } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showEducation = !this.showEducation; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

  /** Guarda el formulario: crea una entrada de formacion nueva o actualiza la que esta en edicion, segun `editing`. */
  save() {
    const v = this.form.value;
    const data = {
      institution: titleCaseText(v.institution!), degree: titleCaseText(v.degree!), fieldOfStudy: v.fieldOfStudy ? titleCaseText(v.fieldOfStudy) : undefined,
      startDate: v.startDate ? toLocalDateString(v.startDate) : '',
      endDate: v.endDate ? toLocalDateString(v.endDate) : undefined,
      isCurrent: v.isCurrent || false,
      educationType: v.educationType || undefined,
      formationLevel: v.formationLevel || undefined,
      customFormationLevel: v.formationLevel === 'Otro' && v.customFormationLevel?.trim()
        ? v.customFormationLevel.trim().charAt(0).toUpperCase() + v.customFormationLevel.trim().slice(1)
        : undefined,
      description: v.description ? trimText(v.description) : undefined,
    };
    const req = this.editing ? this.service.update(this.editing, data) : this.service.create(data);
    req.subscribe({
      next: () => { this.load(); this.cancel(); this.snackBar.open('Guardado', 'Cerrar', { duration: 2000 }); },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Error al guardar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Carga los datos de una entrada de formacion existente en el formulario para editarla. */
  startEdit(e: Education) {
    this.editing = e.id;
    this.form.setValue({
      institution: e.institution, degree: e.degree, fieldOfStudy: e.fieldOfStudy || '',
      startDate: new Date(e.startDate), endDate: e.endDate ? new Date(e.endDate) : null,
      isCurrent: e.isCurrent,
      educationType: e.educationType || '', formationLevel: e.formationLevel || '',
      customFormationLevel: e.customFormationLevel || '',
      description: e.description || '',
    });
    // Mismo patrón que Proyectos/Perfil/Empresa: si el registro ya tenía un
    // dato inválido guardado, que se vea marcado de entrada.
    this.form.markAllAsTouched();
  }

  /** Sale del modo edicion/creacion y limpia el formulario a su estado inicial. */
  cancel() { this.editing = null; this.showForm = false; this.form.reset({ institution: '', degree: '', fieldOfStudy: '', startDate: null, endDate: null, isCurrent: false, educationType: '', formationLevel: '', customFormationLevel: '', description: '' }); }

  /** Etiqueta de nivel de formación a mostrar, usando el valor personalizado si aplica (mismo patrón que contractTypeLabel/workloadLabel en ofertas). */
  formationLevelLabel(e: Education): string {
    if (e.formationLevel === 'Otro' && e.customFormationLevel) return e.customFormationLevel;
    return this.formationLevels.find((l) => l.value === e.formationLevel)?.label || e.formationLevel || '';
  }

  /** Etiqueta de tipo de educación (leída de `SystemCatalog`, Fase 10). */
  educationTypeLabel(type: string): string {
    return this.educationTypes.find((t) => t.value === type)?.label || type;
  }

  /** Pide confirmacion y, si se acepta, elimina la entrada de formacion del backend y recarga la lista. */
  remove(id: number) {
    const ref = this.dialog.open(ConfirmDialogComponent, { data: { title: 'Eliminar', message: '¿Eliminar esta educación?' } });
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
