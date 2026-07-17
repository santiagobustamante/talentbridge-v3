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
                  <mat-option value="FORMAL">Formal</mat-option>
                  <mat-option value="NON_FORMAL">No formal</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nivel de formación</mat-label>
                <mat-select formControlName="formationLevel">
                  <ng-container *ngIf="form.get('educationType')?.value === 'NON_FORMAL'">
                    <mat-option value="Curso">Curso</mat-option>
                    <mat-option value="Certificación">Certificación</mat-option>
                    <mat-option value="Diplomado">Diplomado</mat-option>
                    <mat-option value="Seminario">Seminario</mat-option>
                    <mat-option value="Bootcamp">Bootcamp</mat-option>
                  </ng-container>
                  <ng-container *ngIf="form.get('educationType')?.value !== 'NON_FORMAL'">
                    <mat-option value="Bachillerato">Bachillerato</mat-option>
                    <mat-option value="Técnico">Técnico</mat-option>
                    <mat-option value="Tecnólogo">Tecnólogo</mat-option>
                    <mat-option value="Universidad">Universidad</mat-option>
                    <mat-option value="Posgrado">Posgrado</mat-option>
                  </ng-container>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha Inicio</mat-label>
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
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripción</mat-label>
              <textarea matInput rows="3" formControlName="description" placeholder="Describe tu formación, materias relevantes, etc."></textarea>
            </mat-form-field>
            <mat-checkbox formControlName="isCurrent" color="primary">Cursando actualmente</mat-checkbox>
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
                <span class="edu-type-badge" *ngIf="e.educationType">{{ e.educationType === 'FORMAL' ? 'Formal' : 'No formal' }}</span>
                <span class="edu-level-badge" *ngIf="e.formationLevel">{{ e.formationLevel }}</span>
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
  form = this.fb.group({
    institution: ['', Validators.required], degree: ['', Validators.required],
    fieldOfStudy: [''], startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null], isCurrent: [false],
    educationType: [''], formationLevel: [''], description: [''],
  });

  ngOnInit() {
    this.load();
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showEducation = p.showEducation ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
  }
  load() { this.service.getAll().subscribe({ next: (d) => (this.items = d) }); }

  toggleVisibility(event: any) {
    this.showEducation = event.checked;
    this.profileService.updateProfile({ showEducation: this.showEducation } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showEducation = !this.showEducation; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

  save() {
    const v = this.form.value;
    const data = {
      institution: v.institution!, degree: v.degree!, fieldOfStudy: v.fieldOfStudy || undefined,
      startDate: v.startDate?.toISOString().split('T')[0] || '',
      endDate: v.endDate?.toISOString().split('T')[0] || undefined,
      isCurrent: v.isCurrent || false,
      educationType: v.educationType || undefined,
      formationLevel: v.formationLevel || undefined,
      description: v.description || undefined,
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

  startEdit(e: Education) {
    this.editing = e.id;
    this.form.setValue({
      institution: e.institution, degree: e.degree, fieldOfStudy: e.fieldOfStudy || '',
      startDate: new Date(e.startDate), endDate: e.endDate ? new Date(e.endDate) : null,
      isCurrent: e.isCurrent,
      educationType: e.educationType || '', formationLevel: e.formationLevel || '',
      description: e.description || '',
    });
  }

  cancel() { this.editing = null; this.showForm = false; this.form.reset({ institution: '', degree: '', fieldOfStudy: '', startDate: null, endDate: null, isCurrent: false, educationType: '', formationLevel: '', description: '' }); }

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
