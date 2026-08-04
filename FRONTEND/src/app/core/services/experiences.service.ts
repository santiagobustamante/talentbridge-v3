import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Experience } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/** CRUD de experiencia laboral del perfil del candidato (endpoints `/experiences` del gateway). */
@Injectable({ providedIn: 'root' })
export class ExperiencesService {
  private readonly api = `${environment.apiUrl}/experiences`;

  constructor(private http: HttpClient) {}

  /** Obtiene todas las experiencias del candidato autenticado. */
  getAll(): Observable<Experience[]> {
    return this.http.get<Experience[]>(this.api);
  }

  /** Crea una nueva experiencia laboral. */
  create(data: Partial<Experience>): Observable<Experience> {
    return this.http.post<Experience>(this.api, data);
  }

  /** Actualiza una experiencia existente. */
  update(id: number, data: Partial<Experience>): Observable<Experience> {
    return this.http.patch<Experience>(`${this.api}/${id}`, data);
  }

  /** Elimina una experiencia laboral. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /** Catálogos de opciones (modalidad de trabajo/tipo de contrato) para el formulario — administrables desde el panel admin, ver `SystemCatalog` (Fase 10). */
  getCatalogs(): Observable<{
    workMode: { value: string; label: string }[];
    contractType: { value: string; label: string }[];
  }> {
    return this.http.get<{ workMode: { value: string; label: string }[]; contractType: { value: string; label: string }[] }>(`${this.api}/catalogs`);
  }
}
