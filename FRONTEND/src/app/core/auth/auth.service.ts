import { Injectable, Injector, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, of, catchError } from 'rxjs';
import { User, Profile } from './auth.models';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../services/profile.service';
import { ChatService } from '../services/chat.service';
import { ChatSocketService } from '../services/chat-socket.service';

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

  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector,
    private profileService: ProfileService,
  ) {}

  /**
   * Limpia todo el estado en memoria/caché de otros servicios que viven como
   * singleton (`providedIn: 'root'`) por el resto de la vida de la pestaña.
   * Sin esto, cambiar de sesión (logout+login, o login de otra cuenta) en la
   * misma pestaña sin recargar la página puede mostrarle a un usuario datos
   * cacheados de la sesión anterior (perfil, contador de no-leídos, socket
   * de chat conectado con el token viejo). `ChatService`/`ChatSocketService`
   * se resuelven vía `Injector` en vez de inyectarse en el constructor
   * porque ambos dependen (indirectamente) de `AuthService`, y la inyección
   * directa por constructor produciría una dependencia circular.
   */
  private clearCrossSessionState(): void {
    this.profileService.invalidateCache();
    this.injector.get(ChatSocketService).disconnect();
    this.injector.get(ChatService).setUnreadCount(0);
  }

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

  /**
   * Registra un nuevo candidato. El backend YA NO establece sesión ni
   * devuelve token: la cuenta queda creada pero inutilizable hasta que se
   * confirme el correo (cambio de decisión — antes la verificación era no
   * bloqueante). Responde solo un mensaje + el correo, para que la pantalla
   * de registro pueda mostrar "revisa tu correo" y ofrecer reenviarlo.
   */
  register(fullName: string, email: string, password: string, confirmPassword: string): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(`${this.api}/auth/register`, { fullName, email, password, confirmPassword });
  }

  /** Login de candidato con email/contraseña. */
  login(email: string, password: string): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.api}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => { this.clearCrossSessionState(); this._currentUser.set(res.user); this.setToken(res.token); }));
  }

  /** Login de empresa; usa un endpoint distinto al de candidatos porque valida contra el modelo CompanyProfile. */
  loginCompany(email: string, password: string): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.api}/auth/login-company`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => { this.clearCrossSessionState(); this._currentUser.set(res.user); this.setToken(res.token); }));
  }

  /** Registro de empresa, con los campos propios de su perfil (nombre, sector, ciudad) además de las credenciales. Igual que `register()`, ya no establece sesión — ver ese comentario. */
  registerCompany(
    email: string,
    password: string,
    confirmPassword: string,
    companyName: string,
    sector?: string,
    city?: string
  ): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(`${this.api}/auth/register-company`, {
      email, password, confirmPassword, companyName, sector, city
    });
  }

  /** Pide el enlace de recuperación de contraseña; el backend responde el mismo mensaje genérico exista o no el correo. */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/forgot-password`, { email });
  }

  /** Establece una nueva contraseña usando el token recibido por correo. */
  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/reset-password`, { token, newPassword, confirmPassword });
  }

  /** Confirma el correo usando el token recibido por email al registrarse. */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/verify-email`, { token });
  }

  /**
   * Pide reenviar el correo de verificación, identificando la cuenta por
   * correo (no por sesión) — un usuario recién registrado bajo la
   * verificación bloqueante todavía no tiene sesión. Mismo mensaje genérico
   * exista o no la cuenta, o ya esté verificada (anti-enumeración, ver `forgotPassword`).
   */
  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/resend-verification`, { email });
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
          this.clearCrossSessionState();
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
