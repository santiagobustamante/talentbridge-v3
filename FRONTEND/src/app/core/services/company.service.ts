import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyProfile, CandidateSearchResult, PaginatedResponse } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

export interface FilterOptions {
  skills: string[];
  cities: string[];
  professions: string[];
}

export interface CandidateResult extends CandidateSearchResult {
  experiencesCount?: number;
  projectsCount?: number;
  educationCount?: number;
  matchedSkills?: string[];
  matchScore?: number;
}

export interface CandidateSearchResponse {
  data: CandidateResult[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicCompany {
  id: number;
  companyName: string;
  sector: string | null;
  city: string | null;
  phone: string | null;
  websiteUrl: string | null;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.api}/company/profile`);
  }

  getPublicCompany(id: number): Observable<PublicCompany> {
    return this.http.get<PublicCompany>(`${this.api}/company/public/${id}`);
  }

  updateProfile(data: Partial<CompanyProfile>): Observable<CompanyProfile> {
    return this.http.patch<CompanyProfile>(`${this.api}/company/profile`, data);
  }

  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.api}/company/candidates/filter-options`);
  }

  searchCandidates(params: {
    q?: string; city?: string; profession?: string;
    skills?: string; skillMatch?: string;
    page?: number; limit?: number;
  }): Observable<CandidateSearchResponse> {
    return this.http.get<CandidateSearchResponse>(
      `${this.api}/company/candidates/search`,
      { params },
    );
  }

  endorseSkill(skillId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/skills/${skillId}/endorse`, {});
  }

  unendorseSkill(skillId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/skills/${skillId}/endorse`);
  }
}
