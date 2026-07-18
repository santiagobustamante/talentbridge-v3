import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/** Acceso al portafolio público de un candidato por slug (ruta `/portfolio/:slug`, sin necesidad de sesión iniciada). */
@Injectable({ providedIn: 'root' })
export class PublicPortfolioService {
  private readonly api = `${environment.apiUrl}/portfolio`;

  constructor(private http: HttpClient) {}

  /** Obtiene el perfil público (ya filtrado por los flags `show*`) asociado a un slug. */
  getBySlug(slug: string): Observable<Profile> {
    return this.http.get<Profile>(`${this.api}/${slug}`);
  }
}
