import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsService } from '../../core/services/jobs.service';
import { ChatService } from '../../core/services/chat.service';
import { JobOffer, JobApplication } from '../../core/models/jobs.models';

@Component({
  selector: 'app-company-jobs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatIconModule, MatProgressBarModule, MatSnackBarModule,
  ],
  styleUrl: './company-jobs.component.scss',
  templateUrl: './company-jobs.component.html',
})
export class CompanyJobsComponent implements OnInit {
  private jobsService = inject(JobsService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

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
    city: '', modality: '', contractType: '', salaryMin: '', salaryMax: '',
    currency: 'COP', skillsRequired: '',
  };

  ngOnInit(): void {
    this.loadJobs();
  }

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

  private parseMoney(value: unknown): number | null {
    const text = String(value ?? '').replace(/[^\d]/g, '').trim();
    return text ? Number(text) : null;
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.formData = {
      title: '', description: '', requirements: '', responsibilities: '',
      city: '', modality: '', contractType: '', salaryMin: '', salaryMax: '',
      currency: 'COP', skillsRequired: '',
    };
    this.showForm.set(true);
  }

  editJob(job: JobOffer): void {
    this.editingId.set(job.id);
    this.formData = {
      title: job.title, description: job.description,
      requirements: job.requirements || '', responsibilities: job.responsibilities || '',
      city: job.city || '', modality: job.modality || '', contractType: job.contractType || '',
      salaryMin: job.salaryMin ?? '', salaryMax: job.salaryMax ?? '',
      currency: job.currency || 'COP', skillsRequired: job.skillsRequired || '',
    };
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

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
      salaryMin,
      salaryMax,
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

  closeJob(job: JobOffer): void {
    if (!confirm('¿Seguro que quieres cerrar esta oferta? Los candidatos ya no podrán postularse.')) return;

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
  }

  archiveJob(job: JobOffer): void {
    if (!confirm('¿Seguro que quieres archivar esta oferta? No se mostrará a los candidatos, pero podrás restaurarla después.')) return;

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
  }

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

  deleteJob(job: JobOffer): void {
    if (!confirm('¿Estás seguro de eliminar esta oferta? Esta acción no se puede deshacer.')) return;
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
  }

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

  closeApplications(): void {
    this.showApplications.set(false);
    this.selectedJobForApps.set(null);
    this.applications = [];
  }

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

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      PUBLISHED: 'Publicada',
      CLOSED: 'Cerrada',
      ARCHIVED: 'Archivada',
      PENDING: 'Pendiente',
      REVIEWED: 'Revisado',
      PRESELECTED: 'Preseleccionado',
      REJECTED: 'Rechazado',
      HIRED: 'Contratado',
    };
    return map[status] || status;
  }
}
