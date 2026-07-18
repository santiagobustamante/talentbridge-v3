import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Profile, ProfileViewsResponse } from '../auth/auth.models';
import { environment } from '../../../environments/environment';

/**
 * Perfil del candidato autenticado (edición propia, distinto del portafolio
 * público que consume public-portfolio.service.ts). Cachea la respuesta de
 * `getProfile()` con `shareReplay(1)` porque varias pantallas del shell
 * candidato (perfil, skills, experiencia, vista previa, etc.) lo piden por
 * separado y no tiene sentido repetir la petición HTTP en cada una; la
 * cache se invalida automáticamente después de cada `updateProfile()` para
 * que la próxima lectura traiga los datos ya actualizados.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = environment.apiUrl;
  private profileCache$: Observable<Profile> | null = null;

  constructor(private http: HttpClient) {}

  /** Devuelve el perfil del candidato autenticado, sirviendo desde cache en memoria si ya se pidió antes. */
  getProfile(): Observable<Profile> {
    if (!this.profileCache$) {
      this.profileCache$ = this.http
        .get<Profile>(`${this.api}/profile`)
        .pipe(shareReplay(1));
    }
    return this.profileCache$;
  }

  /** Descarta la cache en memoria del perfil, forzando que el próximo getProfile() vuelva a pedirlo al backend. */
  invalidateCache(): void {
    this.profileCache$ = null;
  }

  /** Actualiza el perfil e invalida la cache local para que las siguientes lecturas reflejen el cambio. */
  updateProfile(data: Partial<Profile>): Observable<Profile> {
    return this.http
      .patch<Profile>(`${this.api}/profile`, data)
      .pipe(tap(() => this.invalidateCache()));
  }

  /** Obtiene la cantidad de visitas que recibió el portafolio público del candidato. */
  getProfileViews(): Observable<ProfileViewsResponse> {
    return this.http.get<ProfileViewsResponse>(`${this.api}/profile/views`);
  }
}
