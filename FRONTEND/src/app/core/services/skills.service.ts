import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Skill } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/** CRUD de habilidades del perfil del candidato autenticado (endpoints `/skills` del gateway). Cada método mapea 1 a 1 a una operación REST estándar sobre el recurso. */
@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly api = `${environment.apiUrl}/skills`;

  constructor(private http: HttpClient) {}

  /** Obtiene todas las skills del candidato autenticado. */
  getAll(): Observable<Skill[]> {
    return this.http.get<Skill[]>(this.api);
  }

  /** Agrega una nueva skill al perfil. */
  create(data: Partial<Skill>): Observable<Skill> {
    return this.http.post<Skill>(this.api, data);
  }

  /** Actualiza una skill existente (por ejemplo su nivel). */
  update(id: number, data: Partial<Skill>): Observable<Skill> {
    return this.http.patch<Skill>(`${this.api}/${id}`, data);
  }

  /** Elimina una skill del perfil. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
