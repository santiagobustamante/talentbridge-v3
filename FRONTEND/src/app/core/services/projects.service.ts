import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(this.api);
  }

  create(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.api, data);
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
