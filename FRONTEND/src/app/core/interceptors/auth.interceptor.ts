import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authReq = req.clone({ withCredentials: true });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const currentUrl = this.router.url;
          const isAuthEndpoint = currentUrl.startsWith('/login') || currentUrl.startsWith('/register');
          const isPublic = currentUrl === '/' || currentUrl.startsWith('/portfolio/');

          if (!isAuthEndpoint && !isPublic && this.auth.authReady()) {
            this.auth.logout().subscribe();
          }
        }
        return throwError(() => error);
      }),
    );
  }
}
