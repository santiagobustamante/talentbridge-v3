import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import { firstValueFrom, catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

// Angular no trae registrada la configuración regional 'es-CO' por
// default (solo viene con 'en-US' en el core); hay que importar el paquete
// de datos de la locale y registrarlo explícitamente antes de poder usarlo
// como LOCALE_ID. Sin esto, los pipes de fecha/moneda/número fallarían o
// caerían al formato en inglés.
registerLocaleData(localeEsCO);

/**
 * Configuración raíz de la aplicación standalone (reemplaza a AppModule).
 * Puntos no obvios:
 *
 * - `LOCALE_ID: 'es-CO'`: fuerza formato colombiano (fechas, moneda, números)
 *   en toda la app vía los pipes de Angular, en vez del inglés por default.
 *
 * - `HTTP_INTERCEPTORS` con `AuthInterceptor` (multi: true): intercepta
 *   TODAS las llamadas HTTP salientes para adjuntar la cookie de sesión y
 *   manejar 401 (ver auth.interceptor.ts).
 *
 * - `APP_INITIALIZER`: antes de que Angular termine de arrancar, ejecuta
 *   `auth.initAuth()` y espera su resultado (`firstValueFrom`). Esto
 *   garantiza que cuando los guards de rutas corren por primera vez ya se
 *   sabe si hay una sesión activa o no (evita el parpadeo de "no
 *   autenticado" seguido de un redirect cuando en realidad sí había
 *   sesión). `initAuth()` nunca rechaza (atrapa errores internamente), así
 *   que el bootstrap no se cuelga si el backend no responde.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () =>
        firstValueFrom(auth.initAuth()),
      deps: [AuthService],
      multi: true,
    },
  ],
};
