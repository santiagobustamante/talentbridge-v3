import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompanyAnalytics {
  totalJobs: number;
  publishedJobs: number;
  totalApplications: number;
  conversionRate: number;
  statusFunnel: Record<string, number>;
  trend: { date: string; count: number }[];
  topJobs: { id: number; title: string; status: string; applicationsCount: number }[];
}

/** Analítica de postulaciones de la empresa autenticada (panel `/company/analytics`). */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCompanyAnalytics(): Observable<CompanyAnalytics> {
    return this.http.get<CompanyAnalytics>(`${this.api}/company/analytics`);
  }
}
