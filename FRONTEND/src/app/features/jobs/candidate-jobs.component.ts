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

  setTab(tab: 'available' | 'my-applications'): void {
    this.activeTab.set(tab);
    if (tab === 'available') {
      this.loadJobs();
    } else {
      this.loadMyApplications();
    }
  }

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

  applyFilters(): void {
    this.page = 1;
    this.loadJobs();
  }

  clearFilters(): void {
    this.qCtrl.setValue('');
    this.cityCtrl.setValue('');
    this.modalityCtrl.setValue('');
    this.contractTypeCtrl.setValue('');
    this.page = 1;
    this.loadJobs();
  }

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

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadJobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openDetail(job: JobOffer): void {
    this.selectedJob.set(job);
    this.showApplyForm = false;
    this.coverMessage = '';
  }

  closeDetail(): void {
    this.selectedJob.set(null);
    this.showApplyForm = false;
    this.coverMessage = '';
  }

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

  contractTypeLabel(job: JobOffer): string {
    if (job.contractType === 'Otro' && job.customContractType) return job.customContractType;
    return job.contractType || '';
  }

  workloadLabel(job: JobOffer): string {
    if (job.workload === 'Otra' && job.customWorkload) return job.customWorkload;
    return job.workload || '';
  }

  formatDate(job: JobOffer): string {
    const date = job.publishedAt || job.createdAt;
    if (!date) return '';
    return 'Publicado el ' + formatAppDate(date, 'short');
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  companyName(job: JobOffer): string {
    const c: any = job.company;
    if (!c) return 'Empresa no especificada';
    return c.companyName || c.companyProfile?.companyName || 'Empresa no especificada';
  }

  matchPercent(job: JobOffer): number {
    if (job.skillMatch) return job.skillMatch.matchPercent;
    const total = job.requiredSkillsList?.length || 0;
    if (!total) return 0;
    const matched = job.matchedSkills?.length || 0;
    return Math.round((matched / total) * 100);
  }

  skillStatusLabel(status: 'met' | 'insufficient' | 'missing'): string {
    const map = { met: 'Cumple', insufficient: 'Nivel insuficiente', missing: 'Te falta' };
    return map[status];
  }

  companyLogo(job: JobOffer): string | undefined {
    const c: any = job.company;
    if (!c) return undefined;
    return c.logoUrl || c.companyProfile?.logoUrl;
  }

  visibleSkills(job: JobOffer): { chips: string[]; more: number } {
    const all = (job.skillsRequired || '').split(',').map(s => this.stripRequiredLevel(s)).filter(Boolean);
    if (all.length <= 5) return { chips: all, more: 0 };
    return { chips: all.slice(0, 5), more: all.length - 5 };
  }

  /** El nombre puede venir como "Angular:ADVANCED" (formato interno para pedir nivel mínimo) — acá solo se muestra el nombre. */
  stripRequiredLevel(raw: string): string {
    return raw.split(':')[0].trim();
  }

  formatSalaryCompact(job: JobOffer): string | null {
    if (job.salaryMin || job.salaryMax) {
      const currency = job.currency || 'COP';
      const min = job.salaryMin ? '$' + job.salaryMin.toLocaleString() : '';
      const max = job.salaryMax ? '$' + job.salaryMax.toLocaleString() : '';
      if (min && max) return `${min} – ${max} ${currency}`;
      if (min) return `Desde ${min} ${currency}`;
      return `Hasta ${max} ${currency}`;
    }
    return null;
  }

  getStatusLabel(status: string): string {
    return statusToLabel(status);
  }

  statusTone(status: string): BadgeTone {
    return statusToTone(status);
  }

  formatSalary(job: JobOffer): string | null {
    if (!job.salaryMin && !job.salaryMax) return null;
    const currency = job.currency || 'COP';
    const min = job.salaryMin ? job.salaryMin.toLocaleString() : '';
    const max = job.salaryMax ? job.salaryMax.toLocaleString() : '';
    if (min && max) return `$${min} - $${max} ${currency}`;
    if (min) return `Desde $${min} ${currency}`;
    return `Hasta $${max} ${currency}`;
  }

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

  applyFiltersApps(): void {
    this.appPage = 1;
    this.loadMyApplications();
  }

  clearFiltersApps(): void {
    this.appStatusFilter = '';
    this.appFromDate = '';
    this.appToDate = '';
    this.appPage = 1;
    this.loadMyApplications();
  }

  goToAppPage(p: number): void {
    if (p < 1 || p > this.appTotalPages) return;
    this.appPage = p;
    this.loadMyApplications();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

  appStatusLabel(status: string): string {
    return statusToLabel(status);
  }

  appFormatDate(date: string | undefined): string {
    if (!date) return '';
    return 'Postulado el ' + formatAppDate(date, 'short');
  }

  appCompanyName(app: JobApplication): string {
    const c: any = app.jobOffer?.company;
    if (!c) return 'Empresa no especificada';
    return c.companyName || c.companyProfile?.companyName || 'Empresa no especificada';
  }

  appCompanyLogo(app: JobApplication): string | undefined {
    const c: any = app.jobOffer?.company;
    if (!c) return undefined;
    return c.logoUrl || c.companyProfile?.logoUrl;
  }

  appContractLabel(app: JobApplication): string {
    const ct = app.jobOffer?.contractType;
    if (ct === 'Otro' && app.jobOffer?.customContractType) return app.jobOffer.customContractType;
    return ct || '';
  }

  appWorkloadLabel(app: JobApplication): string {
    const wl = app.jobOffer?.workload;
    if (wl === 'Otra' && app.jobOffer?.customWorkload) return app.jobOffer.customWorkload;
    return wl || '';
  }

  appSalary(app: JobApplication): string | null {
    const job = app.jobOffer;
    if (!job?.salaryMin && !job?.salaryMax) return null;
    const c = job.currency || 'COP';
    const min = job.salaryMin ? '$' + job.salaryMin.toLocaleString() : '';
    const max = job.salaryMax ? '$' + job.salaryMax.toLocaleString() : '';
    if (min && max) return `${min} – ${max} ${c}`;
    return `${min || max} ${c}`;
  }
}
