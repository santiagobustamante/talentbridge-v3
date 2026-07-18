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
 * TalentBridge autentica con una cookie HttpOnly (seteada por el backend en
 * login/register), no con un token JWT guardado en el cliente y enviado en
 * el header `Authorization`. Por eso, en vez de adjuntar un token, este
 * interceptor clona cada request saliente con `withCredentials: true` para
 * que el navegador incluya esa cookie automáticamente. Este enfoque evita
 * guardar el token en `localStorage` (vulnerable a robo vía XSS) a costa de
 * necesitar CORS configurado con `credentials: true` en el backend.
 *
 * Se registra en app.config.ts vía `HTTP_INTERCEPTORS` (multi-provider).
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private auth: AuthService) {}

  /**
   * Clona el request para incluir la cookie de sesión y, si el backend
   * responde 401 (sesión inválida o expirada), fuerza un logout local.
   * El logout se omite en rutas de login/registro y en rutas públicas
   * (home, portafolio público) para no generar un loop de redirección ni
   * cerrar sesión por un 401 esperado en una página que ni la necesita.
   * `authReady()` evita disparar el logout mientras el `APP_INITIALIZER`
   * todavía está resolviendo el estado inicial de sesión.
   */
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
