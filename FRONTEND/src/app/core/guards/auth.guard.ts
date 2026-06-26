import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of, filter, take, switchMap, map, catchError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CandidateGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

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

@Injectable({ providedIn: 'root' })
export class CompanyGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

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

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

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
