import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Experience } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExperiencesService {
  private readonly api = `${environment.apiUrl}/experiences`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Experience[]> {
    return this.http.get<Experience[]>(this.api);
  }

  create(data: Partial<Experience>): Observable<Experience> {
    return this.http.post<Experience>(this.api, data);
  }

  update(id: number, data: Partial<Experience>): Observable<Experience> {
    return this.http.patch<Experience>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
