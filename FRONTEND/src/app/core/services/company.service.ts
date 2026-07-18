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

/**
 * Servicio del lado empresa: perfil de la empresa, búsqueda/filtrado de
 * candidatos y el sistema de "endorsements" (una empresa puede avalar una
 * skill puntual de un candidato, visible en su portafolio público).
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Obtiene el perfil de la empresa autenticada. */
  getProfile(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.api}/company/profile`);
  }

  /** Obtiene el perfil público de una empresa por id (visible para candidatos, por ejemplo desde una oferta laboral). */
  getPublicCompany(id: number): Observable<PublicCompany> {
    return this.http.get<PublicCompany>(`${this.api}/company/public/${id}`);
  }

  /** Actualiza los datos del perfil de la empresa autenticada. */
  updateProfile(data: Partial<CompanyProfile>): Observable<CompanyProfile> {
    return this.http.patch<CompanyProfile>(`${this.api}/company/profile`, data);
  }

  /** Obtiene las opciones disponibles (skills, ciudades, profesiones) para poblar los filtros del buscador de candidatos. */
  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.api}/company/candidates/filter-options`);
  }

  /** Busca candidatos con filtros combinados (texto libre, ciudad, profesión, skills) y paginación. */
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

  /** Una empresa avala (endorsa) una skill puntual de un candidato. */
  endorseSkill(skillId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/skills/${skillId}/endorse`, {});
  }

  /** Retira un aval previamente otorgado a una skill. */
  unendorseSkill(skillId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/skills/${skillId}/endorse`);
  }
}
