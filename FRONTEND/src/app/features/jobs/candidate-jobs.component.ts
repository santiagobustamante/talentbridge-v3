import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsService } from '../../core/services/jobs.service';
import { JobOffer, JobApplication } from '../../core/models/jobs.models';

@Component({
  selector: 'app-candidate-jobs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatIconModule, MatProgressBarModule, MatSnackBarModule,
  ],
  styleUrl: './candidate-jobs.component.scss',
  templateUrl: './candidate-jobs.component.html',
})
export class CandidateJobsComponent implements OnInit {
  private jobsService = inject(JobsService);
  private snackBar = inject(MatSnackBar);

  activeTab = signal<'available' | 'my-applications'>('available');
  loading = signal(false);
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

  selectedJob = signal<JobOffer | null>(null);
  coverMessage = '';
  showApplyForm = false;

  hasSearched = false;

  readonly modalities = ['Remoto', 'Presencial', 'Híbrido'];
  readonly contractTypes = ['Tiempo completo', 'Medio tiempo', 'Freelance', 'Por proyecto', 'Prácticas'];

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
    this.loading.set(true);
    this.jobsService.getMyApplications().subscribe({
      next: (apps) => {
        this.applications = apps;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
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

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      REVIEWED: 'Revisado',
      PRESELECTED: 'Preseleccionado',
      REJECTED: 'Rechazado',
      HIRED: 'Contratado',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
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
}
