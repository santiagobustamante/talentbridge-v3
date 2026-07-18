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

/**
 * Interceptor HTTP global que agrega credenciales a cada request y reacciona
 * a sesiones expiradas.
 *
 * TalentBridge autentica con dos mecanismos en paralelo: una cookie HttpOnly
 * (seteada por el backend en login/register) y un token JWT en localStorage
 * enviado como header `Authorization: Bearer`. El interceptor agrega ambos
 * a cada request: `withCredentials: true` para que el navegador mande la
 * cookie, y el header Authorization si hay un token guardado. El token es
 * el respaldo real — en despliegues cross-domain (frontend/backend en
 * dominios distintos) varios navegadores bloquean la cookie `SameSite=None`
 * silenciosamente (Safari ITP, protección de cookies de terceros en Chrome/
 * Firefox), y sin el header Authorization la sesión se rompería en esos
 * casos aunque el login haya respondido 200/201 sin error visible.
 *
 * Se registra en app.config.ts vía `HTTP_INTERCEPTORS` (multi-provider).
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private auth: AuthService) {}

  /**
   * Clona el request para incluir la cookie de sesión y, si hay un token en
   * localStorage, el header `Authorization: Bearer`. Si el backend responde
   * 401 (sesión inválida o expirada), fuerza un logout local. El logout se
   * omite en rutas de login/registro y en rutas públicas (home, portafolio
   * público) para no generar un loop de redirección ni cerrar sesión por un
   * 401 esperado en una página que ni la necesita. `authReady()` evita
   * disparar el logout mientras el `APP_INITIALIZER` todavía está
   * resolviendo el estado inicial de sesión.
   */
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();
    const authReq = req.clone({
      withCredentials: true,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

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
