import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOffer, JobApplication, PaginatedJobs } from '../models/jobs.models';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  searchJobs(params: {
    q?: string; city?: string; modality?: string;
    contractType?: string; skills?: string; page?: number; limit?: number;
  }): Observable<PaginatedJobs> {
    return this.http.get<PaginatedJobs>(`${this.api}/jobs`, { params });
  }

  getJob(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.api}/jobs/${id}`);
  }

  applyToJob(jobId: number, payload?: { coverMessage?: string }): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.api}/jobs/${jobId}/apply`, payload || {});
  }

  getMyApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.api}/jobs/my-applications`);
  }

  getCompanyJobs(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.api}/company/jobs`);
  }

  getCompanyJob(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.api}/company/jobs/${id}`);
  }

  createJob(payload: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.post<JobOffer>(`${this.api}/company/jobs`, payload);
  }

  updateJob(id: number, payload: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}`, payload);
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/company/jobs/${id}`);
  }

  publishJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/publish`, {});
  }

  closeJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/close`, {});
  }

  archiveJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/archive`, {});
  }

  restoreJob(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.api}/company/jobs/${id}/restore`, {});
  }

  getJobApplications(jobId: number): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.api}/company/jobs/${jobId}/applications`);
  }

  updateApplicationStatus(applicationId: number, status: string): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.api}/company/applications/${applicationId}/status`, { status });
  }
}
