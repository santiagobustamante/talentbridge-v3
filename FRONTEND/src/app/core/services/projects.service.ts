import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/** CRUD de proyectos del portafolio del candidato (endpoints `/projects` del gateway). */
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  /** Obtiene todos los proyectos del candidato autenticado. */
  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(this.api);
  }

  /** Crea un nuevo proyecto en el portafolio. */
  create(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.api, data);
  }

  /** Actualiza un proyecto existente. */
  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${this.api}/${id}`, data);
  }

  /** Elimina un proyecto del portafolio. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
