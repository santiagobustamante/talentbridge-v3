import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { JobsService } from '../../core/services/jobs.service';
import { ChatService } from '../../core/services/chat.service';
import { JobOffer, JobApplication } from '../../core/models/jobs.models';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { statusToTone } from '../../shared/components/badge/status-tone.util';
import { statusToLabel } from '../../shared/components/badge/status-label.util';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { formatAppDate } from '../../shared/utils/format-date.util';
import { formatNumberDisplay, parseNumericInput, titleCaseText, trimText } from '../../shared/utils/normalize';
import { LevelMeterComponent, SkillLevel } from '../../shared/components/level-meter/level-meter.component';
import { SKILL_CATALOG } from '../../core/services/skill-catalog';

/** Fila del formulario de habilidades requeridas: nombre, si exige un nivel minimo, y cual. */
interface SkillRow {
  name: string;
  requireLevel: boolean;
  level: SkillLevel;
}

/**
 * Parsea el string crudo `skillsRequired` de una oferta (formato interno
 * "Nombre" o "Nombre:NIVEL", separado por comas) a filas editables en el
 * formulario. Espejo minimalista de BACKEND/libs/contracts/src/skill-match.util.ts
 * — Angular no puede importar código de un lib NestJS, así que el formato
 * "Nombre:NIVEL" se parsea/serializa igual en ambos lados sin migrar el
 * schema de JobOffer.
 */
function parseSkillsRequired(raw: string): SkillRow[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, levelPart] = entry.split(':');
      const level = (levelPart || '').trim().toUpperCase();
      const valid = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].includes(level);
      return {
        name: (name || '').trim(),
        requireLevel: valid,
        level: (valid ? level : 'BASIC') as SkillLevel,
      };
    });
}

/** Serializa las filas del formulario de vuelta al formato interno "Nombre:NIVEL" (o solo "Nombre" si no exige nivel) que espera el backend. */
function stringifySkillRows(rows: SkillRow[]): string {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => (r.requireLevel ? `${r.name.trim()}:${r.level}` : r.name.trim()))
    .join(',');
}

/**
 * Gestion de ofertas de empleo de la empresa (ruta "/company/jobs").
 * Permite crear/editar ofertas (incluyendo las habilidades requeridas,
 * opcionalmente con nivel minimo por habilidad, usadas por el backend
 * para calcular el match con cada candidato), publicarlas/cerrarlas/
 * archivarlas/restaurarlas/eliminarlas, revisar las postulaciones
 * recibidas por oferta, cambiar el estado de cada postulacion y
 * contactar directamente a un candidato postulado desde ahi.
 */
@Component({
  selector: 'app-company-jobs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatIconModule, MatProgressBarModule, MatSnackBarModule,
    BadgeComponent, ButtonDirective, AppDatePipe, LevelMeterComponent,
  ],
  styleUrl: './company-jobs.component.scss',
  templateUrl: './company-jobs.component.html',
})
export class CompanyJobsComponent implements OnInit {
  private jobsService = inject(JobsService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(false);
  saving = signal(false);
  loadingApps = signal(false);
  contactingId = signal<number | null>(null);

  showForm = signal(false);
  editingId = signal<number | null>(null);
  showApplications = signal(false);
  selectedJobForApps = signal<JobOffer | null>(null);

  jobOffers: JobOffer[] = [];
  applications: JobApplication[] = [];

  formData: any = {
    title: '', description: '', requirements: '', responsibilities: '',
    city: '', modality: '', contractType: '', customContractType: '',
    workload: '', customWorkload: '', salaryMin: '', salaryMax: '',
    currency: 'COP',
  };

  skillRows: SkillRow[] = [];
  skillCatalogNames = SKILL_CATALOG.map((e) => e.name);

  contractTypes = [
    { value: 'Término indefinido', label: 'Término indefinido' },
    { value: 'Término fijo', label: 'Término fijo' },
    { value: 'Obra o labor', label: 'Obra o labor' },
    { value: 'Aprendizaje', label: 'Aprendizaje' },
    { value: 'Prestación de servicios', label: 'Prestación de servicios' },
    { value: 'Temporal / ocasional / accidental', label: 'Temporal / ocasional / accidental' },
    { value: 'Prácticas', label: 'Prácticas' },
    { value: 'Otro', label: 'Otro' },
  ];

  workloads = [
    { value: 'Tiempo completo', label: 'Tiempo completo' },
    { value: 'Medio tiempo', label: 'Medio tiempo' },
    { value: 'Por horas', label: 'Por horas' },
    { value: 'Turnos', label: 'Turnos' },
    { value: 'Flexible', label: 'Flexible' },
    { value: 'Otra', label: 'Otra' },
  ];

  modalities = [
    { value: 'Remoto', label: 'Remoto' },
    { value: 'Híbrido', label: 'Híbrido' },
    { value: 'Presencial', label: 'Presencial' },
  ];

  ngOnInit(): void {
    this.loadJobs();
  }

  /** Trae todas las ofertas publicadas por la empresa (en cualquier estado: borrador, publicada, cerrada, archivada). */
  loadJobs(): void {
    this.loading.set(true);
    this.jobsService.getCompanyJobs().subscribe({
      next: (jobs) => {
        this.jobOffers = jobs;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Error al cargar ofertas';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Convierte el texto ingresado en el campo de salario a un numero entero, o null si no es valido. */
  private parseMoney(value: unknown): number | null {
    const parsed = parseNumericInput(String(value ?? ''));
    return parsed != null ? Math.round(parsed) : null;
  }

  /** Abre el formulario en blanco para crear una oferta nueva. */
  openCreateForm(): void {
    this.editingId.set(null);
    this.formData = {
      title: '', description: '', requirements: '', responsibilities: '',
      city: '', modality: '', contractType: '', customContractType: '',
      workload: '', customWorkload: '', salaryMin: '', salaryMax: '',
      currency: 'COP',
    };
    this.skillRows = [];
    this.showForm.set(true);
  }

  /** Carga los datos de una oferta existente en el formulario para editarla, incluyendo el parseo de sus habilidades requeridas. */
  editJob(job: JobOffer): void {
    this.editingId.set(job.id);
    this.formData = {
      title: job.title, description: job.description,
      requirements: job.requirements || '', responsibilities: job.responsibilities || '',
      city: job.city || '', modality: job.modality || '',
      contractType: job.contractType || '', customContractType: job.customContractType || '',
      workload: job.workload || '', customWorkload: job.customWorkload || '',
      salaryMin: job.salaryMin ?? '', salaryMax: job.salaryMax ?? '',
      currency: job.currency || 'COP',
    };
    this.skillRows = parseSkillsRequired(job.skillsRequired || '');
    this.showForm.set(true);
  }

  /** Agrega una fila vacia al formulario de habilidades requeridas. */
  addSkillRow(): void {
    this.skillRows.push({ name: '', requireLevel: false, level: 'BASIC' });
  }

  /** Quita una fila del formulario de habilidades requeridas por posicion. */
  removeSkillRow(index: number): void {
    this.skillRows.splice(index, 1);
  }

  /** Activa/desactiva si una habilidad requerida exige un nivel minimo de dominio. */
  toggleRequireLevel(row: SkillRow): void {
    row.requireLevel = !row.requireLevel;
  }

  /** Fija el nivel minimo exigido para una fila de habilidad requerida. */
  setRowLevel(row: SkillRow, level: SkillLevel): void {
    row.level = level;
  }

  /** Cierra el formulario de oferta sin guardar y sale del modo edicion. */
  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  /**
   * Valida y guarda el formulario de oferta: exige titulo y descripcion,
   * valida que el salario maximo no sea menor al minimo, normaliza los
   * textos (capitalizacion, recorte de espacios) y serializa las filas
   * de habilidades al formato interno antes de crear o actualizar la
   * oferta en el backend, segun si `editingId` esta seteado.
   */
  saveJob(): void {
    if (!this.formData.title || !this.formData.description) {
      this.snackBar.open('Título y descripción son requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const salaryMin = this.parseMoney(this.formData.salaryMin);
    const salaryMax = this.parseMoney(this.formData.salaryMax);

    if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) {
      this.snackBar.open('El salario máximo no puede ser menor que el salario mínimo', 'Cerrar', { duration: 4000 });
      return;
    }

    this.saving.set(true);
    const payload = {
      ...this.formData,
      title: titleCaseText(this.formData.title),
      description: trimText(this.formData.description),
      requirements: this.formData.requirements ? trimText(this.formData.requirements) : this.formData.requirements,
      responsibilities: this.formData.responsibilities ? trimText(this.formData.responsibilities) : this.formData.responsibilities,
      city: this.formData.city ? titleCaseText(this.formData.city) : this.formData.city,
      salaryMin,
      salaryMax,
      skillsRequired: stringifySkillRows(this.skillRows),
    };

    const request = this.editingId()
      ? this.jobsService.updateJob(this.editingId()!, payload)
      : this.jobsService.createJob(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadJobs();
        this.snackBar.open(
          this.editingId() ? 'Oferta actualizada' : 'Oferta creada',
          'Cerrar', { duration: 2000 }
        );
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message || 'Error al guardar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Publica una oferta (o la republica si estaba cerrada), haciendola visible para los candidatos. */
  publishJob(job: JobOffer): void {
    this.jobsService.publishJob(job.id).subscribe({
      next: () => {
        this.loadJobs();
        const isRepublish = job.status === 'CLOSED';
        this.snackBar.open(isRepublish ? 'Oferta republicada' : 'Oferta publicada', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al publicar';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Pide confirmacion y cierra la oferta, impidiendo nuevas postulaciones. */
  closeJob(job: JobOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cerrar oferta',
        message: '¿Seguro que quieres cerrar esta oferta? Los candidatos ya no podrán postularse.',
        confirmLabel: 'Cerrar oferta',
        confirmColor: 'primary',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.jobsService.closeJob(job.id).subscribe({
        next: () => {
          this.loadJobs();
          this.snackBar.open('Oferta cerrada', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al cerrar';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  /** Pide confirmacion y archiva la oferta, ocultandola de los candidatos sin eliminarla (se puede restaurar despues). */
  archiveJob(job: JobOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Archivar oferta',
        message: '¿Seguro que quieres archivar esta oferta? No se mostrará a los candidatos, pero podrás restaurarla después.',
        confirmLabel: 'Archivar',
        confirmColor: 'primary',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.jobsService.archiveJob(job.id).subscribe({
        next: () => {
          this.loadJobs();
          this.snackBar.open('Oferta archivada', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al archivar';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  /** Restaura una oferta archivada, devolviendola al estado de borrador para poder editarla y republicarla. */
  restoreJob(job: JobOffer): void {
    this.jobsService.restoreJob(job.id).subscribe({
      next: () => {
        this.loadJobs();
        this.snackBar.open('Oferta restaurada como borrador', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo restaurar la oferta';
        this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
      },
    });
  }

  /** Pide confirmacion y elimina definitivamente la oferta (accion irreversible, a diferencia de archivar). */
  deleteJob(job: JobOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar oferta',
        message: '¿Estás seguro de eliminar esta oferta? Esta acción no se puede deshacer.',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.jobsService.deleteJob(job.id).subscribe({
        next: () => {
          this.loadJobs();
          this.snackBar.open('Oferta eliminada', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al eliminar';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  /** Abre el panel de postulaciones recibidas para una oferta puntual y las carga desde el backend. */
  viewApplications(job: JobOffer): void {
    this.selectedJobForApps.set(job);
    this.showApplications.set(true);
    this.loadingApps.set(true);
    this.applications = [];

    this.jobsService.getJobApplications(job.id).subscribe({
      next: (apps) => {
        this.applications = apps;
        this.loadingApps.set(false);
      },
      error: (err) => {
        this.loadingApps.set(false);
        const msg = err?.error?.message || 'Error al cargar postulaciones';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Cierra el panel de postulaciones y limpia la lista cargada. */
  closeApplications(): void {
    this.showApplications.set(false);
    this.selectedJobForApps.set(null);
    this.applications = [];
  }

  /** Cambia el estado de una postulacion (ej. en revision, entrevista, rechazada) y refleja el cambio en la lista local sin recargar todo. */
  updateStatus(applicationId: number, status: string): void {
    this.jobsService.updateApplicationStatus(applicationId, status).subscribe({
      next: (updated) => {
        const idx = this.applications.findIndex((a) => a.id === applicationId);
        if (idx >= 0) {
          this.applications[idx] = { ...this.applications[idx], status: updated.status };
          this.applications = [...this.applications];
        }
        this.snackBar.open('Estado actualizado', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al actualizar estado';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Crea (o recupera) una conversacion con el candidato postulado y navega a Mensajes con esa conversacion abierta. */
  contactCandidate(candidateUserId: number): void {
    if (this.contactingId() === candidateUserId) return;

    this.contactingId.set(candidateUserId);

    this.chatService.createConversation(candidateUserId).subscribe({
      next: (conv) => {
        this.contactingId.set(null);
        this.router.navigate(['/company/messages'], { queryParams: { conversationId: conv.id } });
      },
      error: (err) => {
        this.contactingId.set(null);
        const msg = err?.error?.message || err?.message || 'No se pudo iniciar la conversación';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Traduce el estado de una postulacion a una etiqueta legible en español. */
  statusLabel(status: string): string {
    return statusToLabel(status);
  }

  /** Mapea el estado de una postulacion al tono de color del badge. */
  statusTone(status: string): BadgeTone {
    return statusToTone(status);
  }

  /** Etiqueta de tipo de contrato de la oferta, usando el valor personalizado si aplica. */
  contractTypeLabel(job: JobOffer): string {
    if (job.contractType === 'Otro' && job.customContractType) return job.customContractType;
    return job.contractType || '';
  }

  /** Etiqueta de jornada laboral de la oferta, usando el valor personalizado si aplica. */
  workloadLabel(job: JobOffer): string {
    if (job.workload === 'Otra' && job.customWorkload) return job.customWorkload;
    return job.workload || '';
  }

  /** Rango salarial de la oferta en formato legible, o null si no se informo salario. */
  formatSalary(job: JobOffer): string | null {
    if (!job.salaryMin && !job.salaryMax) return null;
    const c = job.currency || 'COP';
    const min = job.salaryMin ? '$' + formatNumberDisplay(job.salaryMin) : '';
    const max = job.salaryMax ? '$' + formatNumberDisplay(job.salaryMax) : '';
    if (min && max) return `${min} – ${max} ${c}`;
    return `${min || max} ${c}`;
  }

  /** Fecha de publicacion (o de creacion si aun no fue publicada) de la oferta, formateada para mostrar en pantalla. */
  formatJobDate(job: JobOffer): string {
    const date = job.publishedAt || job.createdAt;
    return date ? formatAppDate(date, 'short') : '—';
  }
}
