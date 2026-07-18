import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, of, catchError } from 'rxjs';
import { User, Profile } from './auth.models';
import { environment } from '../../../environments/environment';

/**
 * Servicio central de autenticación y estado de sesión del frontend.
 *
 * Mantiene el usuario actual en signals (no en un BehaviorSubject) para que
 * los componentes puedan leer `isAuthenticated()`, `isCandidate()`, etc. de
 * forma reactiva y sincrónica en templates y guards.
 *
 * La sesión se sostiene con DOS mecanismos en paralelo: la cookie HttpOnly
 * que setea el backend (funciona en la mayoría de los navegadores) y un
 * token JWT guardado en localStorage, enviado como header `Authorization:
 * Bearer` por auth.interceptor.ts. El token es el respaldo real: en
 * despliegues cross-domain (frontend en Vercel, backend en Render, dominios
 * distintos) varios navegadores (Safari, Chrome/Firefox con protección de
 * cookies de terceros activada) bloquean silenciosamente la cookie
 * `SameSite=None` — el login parece funcionar (responde 200/201) pero la
 * cookie nunca se guarda, y el siguiente request cae en 401. El token en
 * localStorage no depende de política de cookies de terceros, así que
 * garantiza que la sesión funcione en cualquier navegador.
 *
 * `authReady` distingue "todavía no sabemos si hay sesión" de "sabemos que
 * no hay sesión" — es clave para que los guards no redirijan a /login antes
 * de que el `APP_INITIALIZER` (ver app.config.ts) termine de consultar
 * `/auth/me` al arrancar la app.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly _currentUser = signal<User | null>(null);
  private readonly _authReady = signal<boolean>(false);
  private readonly TOKEN_KEY = 'talentbridge_token';

  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isCandidate = computed(() => this._currentUser()?.role === 'CANDIDATE');
  readonly isCompany = computed(() => this._currentUser()?.role === 'COMPANY');
  readonly authReady = computed(() => this._authReady());

  constructor(private http: HttpClient, private router: Router) {}

  /** Token JWT guardado en localStorage (respaldo de la cookie, ver comentario de la clase). Leído por auth.interceptor.ts en cada request. */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /** Actualiza el perfil del usuario en memoria sin volver a pedirlo al backend (evita un round-trip tras editar el perfil). */
  updateCurrentProfile(profile: Profile): void {
    const current = this._currentUser();
    if (!current) return;
    this._currentUser.set({ ...current, profile });
  }

  /** Registra un nuevo candidato; el backend responde con la cookie de sesión ya seteada más el token en el body, que se guarda en localStorage como respaldo (ver comentario de la clase). */
  register(email: string, password: string, confirmPassword: string): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.api}/auth/register`, { email, password, confirmPassword }, { withCredentials: true })
      .pipe(tap((res) => { this._currentUser.set(res.user); this.setToken(res.token); }));
  }

  /** Login de candidato con email/contraseña. */
  login(email: string, password: string): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.api}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => { this._currentUser.set(res.user); this.setToken(res.token); }));
  }

  /** Login de empresa; usa un endpoint distinto al de candidatos porque valida contra el modelo CompanyProfile. */
  loginCompany(email: string, password: string): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.api}/auth/login-company`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => { this._currentUser.set(res.user); this.setToken(res.token); }));
  }

  /** Registro de empresa, con los campos propios de su perfil (nombre, sector, ciudad) además de las credenciales. */
  registerCompany(
    email: string,
    password: string,
    confirmPassword: string,
    companyName: string,
    sector?: string,
    city?: string
  ): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.api}/auth/register-company`, {
        email, password, confirmPassword, companyName, sector, city
      }, { withCredentials: true })
      .pipe(tap((res) => { this._currentUser.set(res.user); this.setToken(res.token); }));
  }

  /** Cierra sesión: pide al backend que invalide la cookie, limpia el token local y el estado, y redirige a la home. */
  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this._currentUser.set(null);
          this._authReady.set(true);
          this.setToken(null);
          this.router.navigate(['/']);
        }),
      );
  }

  /** Consulta al backend quién es el usuario de la cookie actual (si la hay) y actualiza el estado en memoria. Usado por los guards como fallback y por initAuth() al arrancar. */
  fetchMe(): Observable<User> {
    return this.http.get<User>(`${this.api}/auth/me`, { withCredentials: true }).pipe(
      tap((user) => {
        if (user && user.id) {
          this._currentUser.set(user);
        }
        this._authReady.set(true);
      }),
    );
  }

  /**
   * Punto de entrada llamado por el APP_INITIALIZER (app.config.ts) antes de
   * que Angular termine de arrancar. Resuelve siempre (nunca rechaza),
   * incluso si no hay sesión o el backend falla, para que el bootstrap de la
   * app no quede bloqueado esperando una petición que puede fallar.
   */
  initAuth(): Observable<User | null> {
    this._authReady.set(false);
    return this.fetchMe().pipe(
      catchError(() => {
        this._authReady.set(true);
        return of(null);
      }),
    );
  }
}
