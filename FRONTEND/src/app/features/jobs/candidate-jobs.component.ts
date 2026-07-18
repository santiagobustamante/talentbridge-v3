import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsService } from '../../core/services/jobs.service';
import { JobOffer, JobApplication } from '../../core/models/jobs.models';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { statusToTone } from '../../shared/components/badge/status-tone.util';
import { statusToLabel } from '../../shared/components/badge/status-label.util';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { formatAppDate } from '../../shared/utils/format-date.util';
import { formatNumberDisplay } from '../../shared/utils/normalize';

/**
 * Bolsa de empleo para candidatos (ruta "/app/jobs"). Tiene dos pestañas:
 * ofertas disponibles (con filtros de texto/ciudad/modalidad/contrato y
 * el porcentaje de coincidencia de habilidades entre el candidato y cada
 * oferta) y "mis postulaciones" (historial con su estado). El backend
 * calcula el match de habilidades (`skillMatch`/`matchedSkills`); este
 * componente solo lo consume y ordena/filtra las ofertas segun ese dato
 * para priorizar las que el candidato puede aplicar.
 */
@Component({
  selector: 'app-candidate-jobs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatIconModule, MatProgressBarModule, MatSnackBarModule, BadgeComponent, ButtonDirective, AppDatePipe,
  ],
  styleUrl: './candidate-jobs.component.scss',
  templateUrl: './candidate-jobs.component.html',
})
export class CandidateJobsComponent implements OnInit {
  private jobsService = inject(JobsService);
  private snackBar = inject(MatSnackBar);

  activeTab = signal<'available' | 'my-applications'>('available');
  loading = signal(false);
  loadingApps = signal(false);
  applyingId = signal<number | null>(null);

  qCtrl = new FormControl('');
  cityCtrl = new FormControl('');
  modalityCtrl = new FormControl('');
  contractTypeCtrl = new FormControl('');

  jobOffers: JobOffer[] = [];
  applications: JobApplication[] = [];
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;

  appPage = 1;
  appLimit = 10;
  appTotal = 0;
  appTotalPages = 1;
  appStatusFilter = '';
  appFromDate = '';
  appToDate = '';

  selectedJob = signal<JobOffer | null>(null);
  coverMessage = '';
  showApplyForm = false;

  hasSearched = false;

  readonly modalities = ['Remoto', 'Presencial', 'Híbrido'];
  readonly contractTypes = ['Término indefinido', 'Término fijo', 'Obra o labor', 'Aprendizaje', 'Prestación de servicios', 'Temporal / ocasional / accidental', 'Prácticas', 'Otro'];
  readonly workloads = ['Tiempo completo', 'Medio tiempo', 'Por horas', 'Turnos', 'Flexible', 'Otra'];

  ngOnInit(): void {
    this.loadJobs();
  }

  /** Cambia entre la pestaña de ofertas disponibles y la de postulaciones propias, cargando los datos correspondientes. */
  setTab(tab: 'available' | 'my-applications'): void {
    this.activeTab.set(tab);
    if (tab === 'available') {
      this.loadJobs();
    } else {
      this.loadMyApplications();
    }
  }

  /**
   * Busca ofertas de empleo segun los filtros activos. Normaliza cada
   * oferta recibida (listas de habilidades y flag `canApplyBySkills` con
   * valores por defecto seguros) y las ordena con `sortJobsForCandidate`
   * para priorizar las que el candidato puede aplicar.
   */
  loadJobs(): void {
    this.loading.set(true);
    this.hasSearched = true;
    this.jobOffers = [];

    const params: any = { page: this.page, limit: this.limit };
    const q = this.qCtrl.value?.trim();
    const city = this.cityCtrl.value?.trim();
    const modality = this.modalityCtrl.value?.trim();
    const contractType = this.contractTypeCtrl.value?.trim();

    if (q) params.q = q;
    if (city) params.city = city;
    if (modality) params.modality = modality;
    if (contractType) params.contractType = contractType;

    this.jobsService.searchJobs(params).subscribe({
      next: (res) => {
        const normalized = res.data.map((job) => ({
          ...job,
          requiredSkillsList: job.requiredSkillsList ?? [],
          matchedSkills: job.matchedSkills ?? [],
          canApplyBySkills: typeof job.canApplyBySkills === 'boolean' ? job.canApplyBySkills : true,
        }));
        this.jobOffers = this.sortJobsForCandidate(normalized);
        this.total = res.meta.total;
        this.totalPages = res.meta.totalPages;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Error al cargar ofertas';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Trae el historial de postulaciones del candidato, con filtros opcionales por estado y rango de fechas. */
  loadMyApplications(): void {
    this.loadingApps.set(true);
    const params: any = { page: this.appPage, limit: this.appLimit };
    if (this.appStatusFilter) params.status = this.appStatusFilter;
    if (this.appFromDate) params.fromDate = this.appFromDate;
    if (this.appToDate) params.toDate = this.appToDate;

    this.jobsService.getMyApplications(params).subscribe({
      next: (res) => {
        this.applications = res.data;
        this.appTotal = res.meta.total;
        this.appTotalPages = res.meta.totalPages;
        this.loadingApps.set(false);
      },
      error: (err) => {
        this.loadingApps.set(false);
        const msg = err?.error?.message || 'Error al cargar postulaciones';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  /** Aplica los filtros de busqueda de ofertas desde la pagina 1. */
  applyFilters(): void {
    this.page = 1;
    this.loadJobs();
  }

  /** Resetea todos los filtros de busqueda de ofertas y recarga la lista completa. */
  clearFilters(): void {
    this.qCtrl.setValue('');
    this.cityCtrl.setValue('');
    this.modalityCtrl.setValue('');
    this.contractTypeCtrl.setValue('');
    this.page = 1;
    this.loadJobs();
  }

  /**
   * Ordena las ofertas para priorizar lo mas relevante para el candidato,
   * en este orden de prioridad: (1) ofertas a las que puede aplicar y
   * todavia no aplico, (2) ofertas a las que ya aplico, (3) ofertas a las
   * que no puede aplicar porque su perfil no cumple los requisitos
   * minimos de habilidades; dentro de cada grupo, las mas recientes primero.
   */
  private sortJobsForCandidate(jobs: JobOffer[]): JobOffer[] {
    return [...jobs].sort((a, b) => {
      const aCanApply = a.canApplyBySkills === true && !a.hasApplied;
      const bCanApply = b.canApplyBySkills === true && !b.hasApplied;

      if (aCanApply !== bCanApply) {
        return aCanApply ? -1 : 1;
      }

      const aAlreadyApplied = a.hasApplied === true;
      const bAlreadyApplied = b.hasApplied === true;

      if (aAlreadyApplied !== bAlreadyApplied) {
        return aAlreadyApplied ? 1 : -1;
      }

      const aCannotApply = a.canApplyBySkills === false;
      const bCannotApply = b.canApplyBySkills === false;

      if (aCannotApply !== bCannotApply) {
        return aCannotApply ? 1 : -1;
      }

      return new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() -
             new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
    });
  }

  /** Navega a una pagina de resultados de ofertas y sube el scroll al inicio. */
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadJobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Abre el panel de detalle de una oferta desde la lista de disponibles. */
  openDetail(job: JobOffer): void {
    this.selectedJob.set(job);
    this.showApplyForm = false;
    this.coverMessage = '';
  }

  /** Cierra el panel de detalle de oferta y descarta el mensaje de postulacion sin enviar. */
  closeDetail(): void {
    this.selectedJob.set(null);
    this.showApplyForm = false;
    this.coverMessage = '';
  }

  /**
   * Abre el panel de detalle a partir de una postulacion propia (pestaña
   * "mis postulaciones"), reconstruyendo un objeto JobOffer con los datos
   * de esa postulacion (estado, fecha) para reusar la misma vista de detalle.
   */
  openDetailFromApp(app: JobApplication): void {
    const job = app.jobOffer;
    this.selectedJob.set({
      ...job,
      companyId: job.company ? 0 : 0,
      description: (job as any).description || '',
      status: job.status as any,
      hasApplied: true,
      applicationStatus: app.status,
      applicationId: app.id,
      appliedAt: app.createdAt,
    } as JobOffer);
    this.showApplyForm = false;
    this.coverMessage = '';
  }

  /**
   * Envia la postulacion del candidato a una oferta. Antes de llamar al
   * backend, bloquea localmente los casos que ya se sabe que van a
   * fallar (ya aplico, o su perfil no cumple los requisitos minimos de
   * habilidades segun `canApplyBySkills`) para dar feedback instantaneo
   * sin esperar el round-trip.
   */
  applyToJob(jobId: number): void {
    if (this.applyingId()) return;

    const job = this.jobOffers.find((j) => j.id === jobId);
    if (!job) return;

    if (job.hasApplied) {
      this.snackBar.open('Ya aplicaste a esta oferta.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (job.canApplyBySkills === false) {
      this.snackBar.open(
        'No puedes aplicar porque tu perfil no coincide con ninguno de los requisitos principales de esta oferta.',
        'Cerrar',
        { duration: 5000 },
      );
      return;
    }

    this.applyingId.set(jobId);
    this.jobsService.applyToJob(jobId, this.coverMessage ? { coverMessage: this.coverMessage } : undefined).subscribe({
      next: () => {
        this.applyingId.set(null);
        this.snackBar.open('Has aplicado a la oferta exitosamente', 'Cerrar', { duration: 3000 });
        this.closeDetail();
        this.loadJobs();
      },
      error: (err) => {
        this.applyingId.set(null);
        const msg = err?.error?.message || err?.message || 'Error al aplicar';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }

  /** Etiqueta de tipo de contrato: usa el valor personalizado si el tipo elegido fue "Otro". */
  contractTypeLabel(job: JobOffer): string {
    if (job.contractType === 'Otro' && job.customContractType) return job.customContractType;
    return job.contractType || '';
  }

  /** Etiqueta de jornada laboral: usa el valor personalizado si el tipo elegido fue "Otra". */
  workloadLabel(job: JobOffer): string {
    if (job.workload === 'Otra' && job.customWorkload) return job.customWorkload;
    return job.workload || '';
  }

  /** Fecha de publicacion de la oferta, formateada para mostrar en la tarjeta. */
  formatDate(job: JobOffer): string {
    const date = job.publishedAt || job.createdAt;
    if (!date) return '';
    return 'Publicado el ' + formatAppDate(date, 'short');
  }

  /** Oculta el logo de la empresa si falla la carga, en vez de mostrar el icono roto del navegador. */
  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  /** Nombre de la empresa que publico la oferta, con respaldo si no viene informado. */
  companyName(job: JobOffer): string {
    const c: any = job.company;
    if (!c) return 'Empresa no especificada';
    return c.companyName || c.companyProfile?.companyName || 'Empresa no especificada';
  }

  /**
   * Porcentaje de coincidencia de habilidades entre el candidato y la
   * oferta. Prioriza el calculo detallado que ya viene del backend
   * (`skillMatch.matchPercent`, que tiene en cuenta el nivel minimo
   * requerido por habilidad); si no esta disponible, hace un calculo
   * simple como respaldo: habilidades coincidentes sobre requeridas.
   */
  matchPercent(job: JobOffer): number {
    if (job.skillMatch) return job.skillMatch.matchPercent;
    const total = job.requiredSkillsList?.length || 0;
    if (!total) return 0;
    const matched = job.matchedSkills?.length || 0;
    return Math.round((matched / total) * 100);
  }

  /** Traduce el estado de coincidencia de una habilidad puntual a una etiqueta legible en español. */
  skillStatusLabel(status: 'met' | 'insufficient' | 'missing'): string {
    const map = { met: 'Cumple', insufficient: 'Nivel insuficiente', missing: 'Te falta' };
    return map[status];
  }

  /** Logo de la empresa que publico la oferta, si esta disponible. */
  companyLogo(job: JobOffer): string | undefined {
    const c: any = job.company;
    if (!c) return undefined;
    return c.logoUrl || c.companyProfile?.logoUrl;
  }

  /** Habilidades requeridas a mostrar como chips en la tarjeta, recortando a 5 y contando el resto como "+N mas". */
  visibleSkills(job: JobOffer): { chips: string[]; more: number } {
    const all = (job.skillsRequired || '').split(',').map(s => this.stripRequiredLevel(s)).filter(Boolean);
    if (all.length <= 5) return { chips: all, more: 0 };
    return { chips: all.slice(0, 5), more: all.length - 5 };
  }

  /** El nombre puede venir como "Angular:ADVANCED" (formato interno para pedir nivel mínimo) — acá solo se muestra el nombre. */
  stripRequiredLevel(raw: string): string {
    return raw.split(':')[0].trim();
  }

  /** Rango salarial en formato compacto para la tarjeta de la lista de ofertas. */
  formatSalaryCompact(job: JobOffer): string | null {
    if (job.salaryMin || job.salaryMax) {
      const currency = job.currency || 'COP';
      const min = job.salaryMin ? '$' + formatNumberDisplay(job.salaryMin) : '';
      const max = job.salaryMax ? '$' + formatNumberDisplay(job.salaryMax) : '';
      if (min && max) return `${min} – ${max} ${currency}`;
      if (min) return `Desde ${min} ${currency}`;
      return `Hasta ${max} ${currency}`;
    }
    return null;
  }

  /** Traduce el estado de una postulacion a una etiqueta legible en español. */
  getStatusLabel(status: string): string {
    return statusToLabel(status);
  }

  /** Mapea el estado de una postulacion al tono de color del badge. */
  statusTone(status: string): BadgeTone {
    return statusToTone(status);
  }

  /** Rango salarial en formato detallado para el panel de detalle de la oferta. */
  formatSalary(job: JobOffer): string | null {
    if (!job.salaryMin && !job.salaryMax) return null;
    const currency = job.currency || 'COP';
    const min = job.salaryMin ? formatNumberDisplay(job.salaryMin) : '';
    const max = job.salaryMax ? formatNumberDisplay(job.salaryMax) : '';
    if (min && max) return `$${min} - $${max} ${currency}`;
    if (min) return `Desde $${min} ${currency}`;
    return `Hasta $${max} ${currency}`;
  }

  /** Genera la lista de numeros de pagina para el paginador de ofertas, comprimiendo con "..." cuando hay muchas paginas. */
  get pagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages; }
    pages.push(1);
    let start = Math.max(2, this.page - 1);
    let end = Math.min(total - 1, this.page + 1);
    if (this.page <= 3) end = Math.min(5, total - 1);
    if (this.page >= total - 2) start = Math.max(total - 4, 2);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  }

  /** Aplica los filtros de postulaciones desde la pagina 1. */
  applyFiltersApps(): void {
    this.appPage = 1;
    this.loadMyApplications();
  }

  /** Resetea los filtros de postulaciones (estado y rango de fechas) y recarga la lista completa. */
  clearFiltersApps(): void {
    this.appStatusFilter = '';
    this.appFromDate = '';
    this.appToDate = '';
    this.appPage = 1;
    this.loadMyApplications();
  }

  /** Navega a una pagina de postulaciones y sube el scroll al inicio. */
  goToAppPage(p: number): void {
    if (p < 1 || p > this.appTotalPages) return;
    this.appPage = p;
    this.loadMyApplications();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Genera la lista de numeros de pagina para el paginador de postulaciones (mismo criterio de compresion que `pagesArray`). */
  get appPagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.appTotalPages;
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages; }
    pages.push(1);
    let start = Math.max(2, this.appPage - 1);
    let end = Math.min(total - 1, this.appPage + 1);
    if (this.appPage <= 3) end = Math.min(5, total - 1);
    if (this.appPage >= total - 2) start = Math.max(total - 4, 2);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  }

  /** Traduce el estado de una postulacion (pestaña "mis postulaciones") a una etiqueta legible en español. */
  appStatusLabel(status: string): string {
    return statusToLabel(status);
  }

  /** Fecha de postulacion, formateada para mostrar en la tarjeta. */
  appFormatDate(date: string | undefined): string {
    if (!date) return '';
    return 'Postulado el ' + formatAppDate(date, 'short');
  }

  /** Nombre de la empresa de la oferta a la que se aplico, con respaldo si no viene informado. */
  appCompanyName(app: JobApplication): string {
    const c: any = app.jobOffer?.company;
    if (!c) return 'Empresa no especificada';
    return c.companyName || c.companyProfile?.companyName || 'Empresa no especificada';
  }

  /** Logo de la empresa de la oferta a la que se aplico. */
  appCompanyLogo(app: JobApplication): string | undefined {
    const c: any = app.jobOffer?.company;
    if (!c) return undefined;
    return c.logoUrl || c.companyProfile?.logoUrl;
  }

  /** Etiqueta de tipo de contrato de la oferta postulada, usando el valor personalizado si aplica. */
  appContractLabel(app: JobApplication): string {
    const ct = app.jobOffer?.contractType;
    if (ct === 'Otro' && app.jobOffer?.customContractType) return app.jobOffer.customContractType;
    return ct || '';
  }

  /** Etiqueta de jornada laboral de la oferta postulada, usando el valor personalizado si aplica. */
  appWorkloadLabel(app: JobApplication): string {
    const wl = app.jobOffer?.workload;
    if (wl === 'Otra' && app.jobOffer?.customWorkload) return app.jobOffer.customWorkload;
    return wl || '';
  }

  /** Rango salarial de la oferta postulada, en formato compacto. */
  appSalary(app: JobApplication): string | null {
    const job = app.jobOffer;
    if (!job?.salaryMin && !job?.salaryMax) return null;
    const c = job.currency || 'COP';
    const min = job.salaryMin ? '$' + formatNumberDisplay(job.salaryMin) : '';
    const max = job.salaryMax ? '$' + formatNumberDisplay(job.salaryMax) : '';
    if (min && max) return `${min} – ${max} ${c}`;
    return `${min || max} ${c}`;
  }
}
