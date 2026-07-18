import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, of, catchError } from 'rxjs';
import { User, Profile } from './auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly _currentUser = signal<User | null>(null);
  private readonly _authReady = signal<boolean>(false);

  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isCandidate = computed(() => this._currentUser()?.role === 'CANDIDATE');
  readonly isCompany = computed(() => this._currentUser()?.role === 'COMPANY');
  readonly authReady = computed(() => this._authReady());

  constructor(private http: HttpClient, private router: Router) {}

  updateCurrentProfile(profile: Profile): void {
    const current = this._currentUser();
    if (!current) return;
    this._currentUser.set({ ...current, profile });
  }

  register(email: string, password: string, confirmPassword: string): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.api}/auth/register`, { email, password, confirmPassword }, { withCredentials: true })
      .pipe(tap((res) => this._currentUser.set(res.user)));
  }

  login(email: string, password: string): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.api}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => this._currentUser.set(res.user)));
  }

  loginCompany(email: string, password: string): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.api}/auth/login-company`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => this._currentUser.set(res.user)));
  }

  registerCompany(
    email: string,
    password: string,
    confirmPassword: string,
    companyName: string,
    sector?: string,
    city?: string
  ): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.api}/auth/register-company`, {
        email, password, confirmPassword, companyName, sector, city
      }, { withCredentials: true })
      .pipe(tap((res) => this._currentUser.set(res.user)));
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this._currentUser.set(null);
          this._authReady.set(true);
          this.router.navigate(['/']);
        }),
      );
  }

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
