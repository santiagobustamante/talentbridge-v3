import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Education } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/** CRUD de formación académica del perfil del candidato (endpoints `/education` del gateway). */
@Injectable({ providedIn: 'root' })
export class EducationService {
  private readonly api = `${environment.apiUrl}/education`;

  constructor(private http: HttpClient) {}

  /** Obtiene toda la formación académica del candidato autenticado. */
  getAll(): Observable<Education[]> {
    return this.http.get<Education[]>(this.api);
  }

  /** Crea un nuevo registro de formación académica. */
  create(data: Partial<Education>): Observable<Education> {
    return this.http.post<Education>(this.api, data);
  }

  /** Actualiza un registro de formación existente. */
  update(id: number, data: Partial<Education>): Observable<Education> {
    return this.http.patch<Education>(`${this.api}/${id}`, data);
  }

  /** Elimina un registro de formación académica. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /** Catálogos de opciones (tipo/nivel de formación) para el formulario — administrables desde el panel admin, ver `SystemCatalog` (Fase 10). */
  getCatalogs(): Observable<{
    educationType: { value: string; label: string }[];
    formationLevel: { value: string; label: string }[];
  }> {
    return this.http.get<{ educationType: { value: string; label: string }[]; formationLevel: { value: string; label: string }[] }>(`${this.api}/catalogs`);
  }
}
