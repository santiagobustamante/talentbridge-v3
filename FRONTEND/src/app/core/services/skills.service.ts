import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Skill } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly api = `${environment.apiUrl}/skills`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Skill[]> {
    return this.http.get<Skill[]>(this.api);
  }

  create(data: Partial<Skill>): Observable<Skill> {
    return this.http.post<Skill>(this.api, data);
  }

  update(id: number, data: Partial<Skill>): Observable<Skill> {
    return this.http.patch<Skill>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
