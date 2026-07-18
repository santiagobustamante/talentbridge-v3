import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOffer, JobApplication, PaginatedJobs, PaginatedApplications } from '../models/jobs.models';
import { environment } from '../../../environments/environment';

/**
 * Servicio de ofertas laborales, usado tanto por el lado candidato (buscar,
 * postularse, ver mis postulaciones) como por el lado empresa (publicar,
 * gestionar el ciclo de vida de una oferta, revisar postulaciones
 * recibidas). El ciclo de vida de una oferta sigue el estado
 * `JobOfferStatus`: DRAFT → PUBLISHED → CLOSED/ARCHIVED, reflejado en los
 * métodos publish/close/archive/restore de más abajo.
 */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Búsqueda pública de ofertas publicadas, con filtros combinados y paginación (lado candidato). */
  searchJobs(params: {
    q?: string; city?: string; modality?: string;
    contractType?: string; skills?: string; page?: number; limit?: number;
  }): Observable<PaginatedJobs> {
    return this.http.get<PaginatedJobs>(`${this.api}/jobs`, { params });
  }

  /** Obtiene el detalle de una oferta puntual, incluyendo si el candidato ya se postuló y su % de match de skills. */
  getJob(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.api}/jobs/${id}`);
  }

  /** El candidato autenticado se postula a una oferta, opcionalmente con un mensaje de presentación. */
  applyToJob(jobId: number, payload?: { coverMessage?: string }): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.api}/jobs/${jobId}/apply`, payload || {});
  }

  /** Lista las postulaciones del candidato autenticado, con filtros opcionales de estado y rango de fechas. */
  getMyApplications(params?: {
    page?: number; limit?: number; status?: string; fromDate?: string; toDate?: string;
  }): Observable<PaginatedApplications> {
    return this.http.get<PaginatedApplications>(`${this.api}/jobs/my-applications`, { params });
  }

  /** Lista todas las ofertas (en cualquier estado) creadas por la empresa autenticada. */
  getCompanyJobs(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.api}/company/jobs`);
  }

  /** Obtiene el detalle de una oferta propia de la empresa (incluye borradores, a diferencia de getJob). */
  getCompanyJob(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.api}/company/jobs/${id}`);
  }

  /** Crea una nueva oferta laboral en estado DRAFT. */
  createJob(payload: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.post<JobOffer>(`${this.api}/company/jobs`, payload);
  }

  /** Actualiza los datos de una oferta existente. */
  updateJob(id: number, payload: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}`, payload);
  }

  /** Elimina una oferta (solo aplica a borradores; una vez publicada se cierra/archiva, no se borra). */
  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/company/jobs/${id}`);
  }

  /** Publica una oferta en DRAFT, haciéndola visible en la búsqueda pública. */
  publishJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/publish`, {});
  }

  /** Cierra una oferta publicada (deja de recibir postulaciones nuevas, pero queda visible en el historial). */
  closeJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/close`, {});
  }

  /** Archiva una oferta cerrada, sacándola de las vistas activas de la empresa. */
  archiveJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/archive`, {});
  }

  /** Restaura una oferta archivada a su estado anterior. */
  restoreJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/restore`, {});
  }

  /** Lista las postulaciones recibidas para una oferta puntual de la empresa. */
  getJobApplications(jobId: number): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.api}/company/jobs/${jobId}/applications`);
  }

  /** Cambia el estado de una postulación (por ejemplo a PRESELECTED, REJECTED o HIRED) desde el lado empresa. */
  updateApplicationStatus(applicationId: number, status: string): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.api}/company/applications/${applicationId}/status`, { status });
  }
}
