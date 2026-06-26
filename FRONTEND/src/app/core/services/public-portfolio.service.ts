import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class PublicPortfolioService {
  private readonly api = 'http://localhost:3000/api/portfolio';

  constructor(private http: HttpClient) {}

  getBySlug(slug: string): Observable<Profile> {
    return this.http.get<Profile>(`${this.api}/${slug}`);
  }
}
