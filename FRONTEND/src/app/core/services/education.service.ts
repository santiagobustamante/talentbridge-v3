import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Education } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class EducationService {
  private readonly api = 'http://localhost:3000/api/education';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Education[]> {
    return this.http.get<Education[]>(this.api);
  }

  create(data: Partial<Education>): Observable<Education> {
    return this.http.post<Education>(this.api, data);
  }

  update(id: number, data: Partial<Education>): Observable<Education> {
    return this.http.patch<Education>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
