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
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ProjectsService } from '../../core/services/projects.service';
import { ProfileService } from '../../core/services/profile.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { Project } from '../../core/auth/auth.models';
import { SKILL_CATALOG, filterCatalog, SkillCatalogEntry } from '../../core/services/skill-catalog';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule, MatIconModule, MatChipsModule, MatSnackBarModule,
    MatSelectModule, MatAutocompleteModule, MatDatepickerModule, MatNativeDateModule, MatSlideToggleModule,
  ],
  styleUrl: './projects.component.scss',
  template: `
    <div class="page-content">
      <header class="page-header animate-fade-in">
        <div class="header-icon"><mat-icon>code_blocks</mat-icon></div>
        <div class="header-text">
          <h1>Laboratorio de proyectos</h1>
          <p class="subtitle">Tu portafolio de trabajo e innovaci&oacute;n</p>
        </div>
      </header>

      <div class="visibility-bar" *ngIf="profileLoaded">
        <span class="vis-label">Mostrar proyectos en perfil público</span>
        <mat-slide-toggle [checked]="showProjects" (change)="toggleVisibility($event)" color="primary"></mat-slide-toggle>
      </div>

      <div class="form-collapsible animate-fade-in-up">
        <button class="toggle-form-btn" (click)="showForm = !showForm">
          <div class="toggle-left">
            <mat-icon>{{ showForm ? 'expand_less' : 'add_circle' }}</mat-icon>
            <span>{{ editing ? 'Editando proyecto' : 'Nuevo proyecto' }}</span>
          </div>
          <mat-icon class="chevron">{{ showForm ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>

        <div class="form-body" *ngIf="showForm">
          <form [formGroup]="form" (ngSubmit)="save()" class="project-form">

            <!-- Bloque 1: Información principal -->
            <div class="form-section">
              <div class="section-label">Informaci&oacute;n principal</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre del proyecto <span class="req">*</span></mat-label>
                <input matInput formControlName="name" placeholder="Ej. E-Commerce Platform" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripci&oacute;n</mat-label>
                <textarea matInput rows="3" formControlName="description" placeholder="Describe tu proyecto, objetivos y resultados..."></textarea>
              </mat-form-field>
            </div>

            <!-- Bloque 2: Participación -->
            <div class="form-section">
              <div class="section-label">Participaci&oacute;n</div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Rol en el proyecto</mat-label>
                  <input matInput formControlName="role" placeholder="Ej. Desarrollador Frontend" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tipo de proyecto</mat-label>
                  <mat-select formControlName="projectType">
                    <mat-option value="">—</mat-option>
                    <mat-option value="INDIVIDUAL">Individual</mat-option>
                    <mat-option value="TEAM">En equipo</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Responsabilidades</mat-label>
                <textarea matInput rows="3" formControlName="responsibilities" placeholder="Describe tus responsabilidades en el proyecto..."></textarea>
              </mat-form-field>
            </div>

            <!-- Bloque 3: Tecnologías y enlaces -->
            <div class="form-section">
              <div class="section-label">Tecnolog&iacute;as y enlaces</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Buscar o agregar tecnolog&iacute;a</mat-label>
                <input matInput [formControl]="techInputCtrl" [matAutocomplete]="techAuto"
                       placeholder="Ej. Angular, TypeScript, Docker..." />
                <mat-autocomplete #techAuto="matAutocomplete" (optionSelected)="addTechChip($event.option.value)">
                  @for (opt of filteredTechSuggestions; track opt.name) {
                    <mat-option [value]="opt.name">
                      <span class="suggestion-name">{{ opt.name }}</span>
                      <span class="suggestion-cat">{{ opt.category }}</span>
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
              <div class="skills-chips" *ngIf="selectedTechs.length">
                <mat-chip *ngFor="let t of selectedTechs; let i = index" (removed)="removeTechChip(i)">
                  {{ t }}
                  <mat-icon matChipRemove>cancel</mat-icon>
                </mat-chip>
              </div>

              <div class="github-warning">
                <mat-icon class="warn-icon">info</mat-icon>
                <p class="warn-text">Antes de compartir repositorios o enlaces de GitHub, verifica que no contengan credenciales, información privada, secretos, datos de clientes, código protegido por acuerdos de confidencialidad ni material restringido por políticas de tu empresa, cliente o institución. La información publicada o compartida mediante estos enlaces es responsabilidad del usuario.</p>
              </div>

              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Repositorio GitHub</mat-label>
                  <input matInput formControlName="repositoryUrl" placeholder="https://github.com/user/repo" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Demo URL</mat-label>
                  <input matInput formControlName="demoUrl" placeholder="https://demo.example.com" />
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>URL de imagen</mat-label>
                <input matInput formControlName="imageUrl" placeholder="https://example.com/image.png" />
              </mat-form-field>
            </div>

            <!-- Bloque 4: Estado -->
            <div class="form-section">
              <div class="section-label">Estado</div>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Estado</mat-label>
                  <mat-select formControlName="status">
                    <mat-option value="">—</mat-option>
                    <mat-option value="PLANNED">Planificado</mat-option>
                    <mat-option value="IN_PROGRESS">En progreso</mat-option>
                    <mat-option value="COMPLETED">Completado</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Fecha inicio</mat-label>
                  <input matInput [matDatepicker]="psPicker" formControlName="startDate" />
                  <mat-datepicker-toggle matSuffix [for]="psPicker"/>
                  <mat-datepicker #psPicker/>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Fecha fin</mat-label>
                  <input matInput [matDatepicker]="pePicker" formControlName="endDate" />
                  <mat-datepicker-toggle matSuffix [for]="pePicker"/>
                  <mat-datepicker #pePicker/>
                </mat-form-field>
              </div>
            </div>

            <div class="form-footer">
              <button mat-raised-button class="save-btn" type="submit" [disabled]="form.invalid">
                <mat-icon>{{ editing ? 'check' : 'add' }}</mat-icon>
                {{ editing ? 'Actualizar proyecto' : 'Agregar proyecto' }}
              </button>
              <button mat-button class="cancel-btn" type="button" *ngIf="editing" (click)="cancel()">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <ng-container *ngIf="items.length > 0; else emptyState">
        <div class="projects-grid">
          <div *ngFor="let p of items; let i = index"
               class="project-card animate-fade-in-scale" [ngClass]="'stagger-' + ((i % 6) + 1)">
            <div class="project-image" *ngIf="p.imageUrl">
              <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" />
            </div>
            <div class="project-image placeholder" *ngIf="!p.imageUrl">
              <mat-icon>image</mat-icon>
            </div>

            <div class="project-body">
              <div class="project-badges">
                <span class="proj-badge" *ngIf="p.projectType">{{ p.projectType === 'INDIVIDUAL' ? 'Individual' : 'En equipo' }}</span>
                <span class="proj-badge status-badge" *ngIf="p.status">{{ statusLabel(p.status) }}</span>
              </div>
              <h3 class="project-name">{{ p.name }}</h3>
              <p class="project-role" *ngIf="p.role"><mat-icon>person</mat-icon>{{ p.role }}</p>
              <p class="project-responsibilities" *ngIf="p.responsibilities">{{ p.responsibilities }}</p>
              <p class="project-description" *ngIf="p.description">{{ p.description }}</p>
              <div class="tech-chips" *ngIf="p.technologies?.length">
                <span class="tech-chip" *ngFor="let t of p.technologies">{{ t }}</span>
              </div>
              <div class="project-links">
                <a *ngIf="p.repositoryUrl" [href]="p.repositoryUrl" target="_blank" rel="noopener" class="link-btn" matTooltip="Repositorio">
                  <mat-icon>code</mat-icon>
                </a>
                <a *ngIf="p.demoUrl" [href]="p.demoUrl" target="_blank" rel="noopener" class="link-btn" matTooltip="Demo en vivo">
                  <mat-icon>open_in_new</mat-icon>
                </a>
              </div>
            </div>

            <div class="project-actions">
              <button mat-icon-button class="edit-btn" (click)="startEdit(p); showForm = true" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button class="delete-btn" (click)="remove(p.id)" aria-label="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state animate-fade-in-scale">
          <div class="empty-icon"><mat-icon>rocket_launch</mat-icon></div>
          <h2>Sin proyectos a&uacute;n</h2>
          <p>Muestra tu mejor trabajo al mundo</p>
        </div>
      </ng-template>
    </div>
  `,
})
export class ProjectsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ProjectsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private profileService = inject(ProfileService);

  items: Project[] = [];
  editing: number | null = null;
  showForm = false;
  showProjects = true;
  profileLoaded = false;
  selectedTechs: string[] = [];
  techInputCtrl = this.fb.control('');
  filteredTechSuggestions: SkillCatalogEntry[] = [];

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    role: [''],
    responsibilities: [''],
    repositoryUrl: [''],
    demoUrl: [''],
    imageUrl: [''],
    projectType: [''],
    status: [''],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
  });

  ngOnInit() {
    this.load();
    this.profileService.getProfile().subscribe({
      next: (p) => { this.showProjects = p.showProjects ?? true; this.profileLoaded = true; },
      error: () => { this.profileLoaded = true; },
    });
    this.techInputCtrl.valueChanges.subscribe(val => {
      this.filteredTechSuggestions = filterCatalog(val || '');
    });
  }

  load() { this.service.getAll().subscribe({ next: (d) => (this.items = d) }); }

  toggleVisibility(event: any) {
    this.showProjects = event.checked;
    this.profileService.updateProfile({ showProjects: this.showProjects } as any).subscribe({
      next: () => this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 2000 }),
      error: () => { this.showProjects = !this.showProjects; this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }); }
    });
  }

  addTechChip(name: string) {
    const exists = this.selectedTechs.some(t => t.toLowerCase() === name.toLowerCase());
    if (!exists) this.selectedTechs.push(name);
    this.techInputCtrl.setValue('');
  }

  removeTechChip(index: number) { this.selectedTechs.splice(index, 1); }

  save() {
    const v = this.form.value;
    const data: any = {
      name: v.name!,
      description: v.description || undefined,
      role: v.role || undefined,
      responsibilities: v.responsibilities || undefined,
      technologies: this.selectedTechs.length ? this.selectedTechs : undefined,
      repositoryUrl: v.repositoryUrl?.trim() || undefined,
      demoUrl: v.demoUrl?.trim() || undefined,
      imageUrl: v.imageUrl?.trim() || undefined,
      projectType: v.projectType || undefined,
      status: v.status || undefined,
      startDate: v.startDate ? v.startDate.toISOString().split('T')[0] : undefined,
      endDate: v.endDate ? v.endDate.toISOString().split('T')[0] : undefined,
    };

    const req = this.editing
      ? this.service.update(this.editing, data)
      : this.service.create(data);

    req.subscribe({
      next: () => { this.load(); this.cancel(); this.snackBar.open('Proyecto guardado', 'Cerrar', { duration: 2000 }); },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Error al guardar proyecto';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  startEdit(p: Project) {
    this.editing = p.id;
    this.selectedTechs = [...(p.technologies || [])];
    this.form.setValue({
      name: p.name, description: p.description || '',
      role: p.role || '', responsibilities: p.responsibilities || '',
      repositoryUrl: p.repositoryUrl || '', demoUrl: p.demoUrl || '',
      imageUrl: p.imageUrl || '',
      projectType: p.projectType || '', status: p.status || '',
      startDate: p.startDate ? new Date(p.startDate) : null,
      endDate: p.endDate ? new Date(p.endDate) : null,
    });
  }

  cancel() {
    this.editing = null;
    this.showForm = false;
    this.selectedTechs = [];
    this.techInputCtrl.setValue('');
    this.form.reset({
      name: '', description: '', role: '', responsibilities: '',
      repositoryUrl: '', demoUrl: '', imageUrl: '',
      projectType: '', status: '',
      startDate: null, endDate: null,
    });
  }

  remove(id: number) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar', message: '¿Eliminar este proyecto?' },
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.service.delete(id).subscribe(() => this.load()); });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { PLANNED: 'Planificado', IN_PROGRESS: 'En progreso', COMPLETED: 'Completado' };
    return map[s] || s;
  }
}
