import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of, filter, take, switchMap, map, catchError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/**
 * Guards de ruta para separar los dos roles del sistema (candidato/empresa).
 *
 * TalentBridge tiene un único backend de autenticación pero dos "shells" de
 * frontend completamente distintos (`/app/*` para candidatos, `/company/*`
 * para empresas). En vez de un solo guard genérico que solo verifique
 * "¿está logueado?", se usan guards separados por rol para que, si un
 * usuario autenticado con el rol equivocado intenta entrar a la sección del
 * otro rol, sea redirigido a SU propio panel en lugar de a un error o al
 * login (por ejemplo: una empresa logueada que navega a `/app/inicio` es
 * mandada a `/company/dashboard`, no deslogueada).
 *
 * Los tres guards comparten el mismo patrón: si `authReady()` ya resolvió
 * (el `APP_INITIALIZER` de app.config.ts ya corrió `fetchMe()` al bootstrap),
 * deciden en el momento con el estado en memoria; si no, vuelven a llamar
 * `fetchMe()` como fallback (cubre recargas de página en rutas profundas
 * donde el guard se ejecuta antes de que el initializer termine).
 */
@Injectable({ providedIn: 'root' })
export class CandidateGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  /** Permite el acceso solo a usuarios con rol CANDIDATE; redirige empresas a su dashboard y no autenticados a /login. */
  canActivate(): Observable<boolean | UrlTree> {
    if (this.auth.authReady()) {
      if (this.auth.isCandidate()) {
        return of(true);
      }
      if (this.auth.isCompany()) {
        return of(this.router.createUrlTree(['/company/dashboard']));
      }
      if (!this.auth.isAuthenticated()) {
        return of(this.router.createUrlTree(['/login']));
      }
    }

    if (this.auth.isAuthenticated() && !this.auth.authReady()) {
    }

    return this.auth.fetchMe().pipe(
      map(() => {
        if (this.auth.isCandidate()) {
          return true;
        }
        if (this.auth.isCompany()) {
          return this.router.createUrlTree(['/company/dashboard']);
        }
        return this.router.createUrlTree(['/login']);
      }),
      catchError(() => of(this.router.createUrlTree(['/login']))),
    );
  }
}

/** Guard simétrico a CandidateGuard: solo deja pasar usuarios con rol COMPANY, redirige candidatos a /app/inicio. */
@Injectable({ providedIn: 'root' })
export class CompanyGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  /** Permite el acceso solo a usuarios con rol COMPANY; redirige candidatos a su inicio y no autenticados a /company/login. */
  canActivate(): Observable<boolean | UrlTree> {
    if (this.auth.authReady()) {
      if (this.auth.isCompany()) {
        return of(true);
      }
      if (this.auth.isCandidate()) {
        return of(this.router.createUrlTree(['/app/inicio']));
      }
      if (!this.auth.isAuthenticated()) {
        return of(this.router.createUrlTree(['/company/login']));
      }
    }

    return this.auth.fetchMe().pipe(
      map(() => {
        if (this.auth.isCompany()) {
          return true;
        }
        if (this.auth.isCandidate()) {
          return this.router.createUrlTree(['/app/inicio']);
        }
        return this.router.createUrlTree(['/company/login']);
      }),
      catchError(() => of(this.router.createUrlTree(['/company/login']))),
    );
  }
}

/** Guard genérico que solo exige estar autenticado, sin importar el rol (candidato o empresa). No usado en las rutas de app.routes.ts actuales, que prefieren los guards específicos por rol, pero queda disponible para rutas neutrales. */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  /** Deja pasar a cualquier usuario autenticado; si no lo está, redirige a /login. */
  canActivate(): Observable<boolean | UrlTree> {
    if (this.auth.authReady() && this.auth.isAuthenticated()) {
      return of(true);
    }

    return this.auth.fetchMe().pipe(
      map(() => {
        if (this.auth.isAuthenticated()) return true;
        return this.router.createUrlTree(['/login']);
      }),
      catchError(() => of(this.router.createUrlTree(['/login']))),
    );
  }
}
