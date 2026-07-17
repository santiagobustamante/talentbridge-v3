# Guía de Frontend — TalentBridge V3

Angular 19, standalone components (sin `NgModule`), Angular Material, SCSS con tokens de diseño. Antes de escribir CSS o un componente nuevo, leé también [`FRONTEND/src/styles/README.md`](../FRONTEND/src/styles/README.md) — es la fuente de verdad del sistema de diseño (tokens de color, tipografía, componentes compartidos) y este documento no la duplica, la complementa con estructura y flujos.

## 1. Estructura

```
FRONTEND/src/app/
├── core/
│   ├── auth/              AuthService, auth.models.ts (interfaces Profile/Skill/Experience/...)
│   ├── guards/             CandidateGuard, CompanyGuard, AuthGuard
│   ├── interceptors/       AuthInterceptor (cookies + logout automático en 401)
│   ├── services/           Un servicio HTTP por dominio (profile, skills, jobs, chat, dashboard...)
│   └── models/             Interfaces que no viven en auth.models.ts (jobs, chat)
├── features/               Un directorio por pantalla. Convención: <feature>.component.ts(+html+scss)
├── shared/
│   ├── layout/              AppShellComponent (candidato) — nav + topbar + <router-outlet>
│   ├── components/          Primitivas reusables (ver sección 4)
│   ├── pipes/                appDate
│   ├── utils/                 formatAppDate
│   ├── constants/             legal-warnings.ts (texto legal de GitHub)
│   └── assistant/             AssistantChatComponent — widget flotante de "Joaquín"
└── app.routes.ts            Todas las rutas (ver sección 2)
```
`features/company/company-shell.component.ts` (no en `shared/`) cumple el mismo rol que `AppShellComponent` pero para el lado empresa — están separados a propósito porque tienen nav distinto, no es un descuido a unificar.

## 2. Rutas principales

| Ruta | Guard | Componente | Rol |
|---|---|---|---|
| `/` | — | `HomeComponent` | público (landing) |
| `/login`, `/register` | — | `LoginComponent`, `RegisterComponent` | público |
| `/company/login`, `/company/register` | — | `CompanyLoginComponent`, `CompanyRegisterComponent` | público |
| `/portfolio/:slug` | — | `PublicPortfolioComponent` | público |
| `/app/*` | `CandidateGuard` | `AppShellComponent` + hijos | candidato |
| `/app/inicio` | — | `HomeCandidateComponent` (dashboard) | candidato |
| `/app/profile`, `/skills`, `/experience`, `/education`, `/projects`, `/cv-analysis` | — | edición de portafolio | candidato |
| `/app/public-view` | — | `PublicPreviewComponent` (previsualización autenticada) | candidato |
| `/app/jobs` | — | `CandidateJobsComponent` (listado + mis postulaciones) | candidato |
| `/app/messages` | — | `MessagesComponent` | candidato |
| `/app/company-view/:id` | — | `CompanyViewComponent` (perfil público de una empresa) | candidato |
| `/company/*` | `CompanyGuard` | `CompanyShellComponent` + hijos | empresa |
| `/company/dashboard`, `/profile`, `/candidates`, `/jobs`, `/messages` | — | — | empresa |

Los guards redirigen (no bloquean con error) cuando el rol no coincide: candidato logueado que entra a `/company/*` → `/app/inicio`, y viceversa. Ver `core/guards/auth.guard.ts`.

## 3. Layouts

- **`AppShellComponent`** / **`CompanyShellComponent`**: nav lateral + topbar + `<router-outlet>`. Manejan el estado de menú móvil (`toggleMobile`/`closeMobile`) y el logout. Los íconos de ese chrome de navegación (hamburguesa, cerrar, logout) **no** usan el sistema de botones `appButton` — son un patrón visual distinto (icon-only), no una omisión (ver Fase 10 en `plan-mejoras-frontend-ux.md`).
  - Cada ítem de `navItems` necesita **los dos campos**: `label` (texto descriptivo, se usa siempre como subtítulo pequeño) y `subtitle` (texto corto, se usa como título en negrita si existe — si falta, el template cae a repetir `label` en ambos, duplicando el texto visualmente). Si agregás un ítem de menú nuevo, definí ambos — ver BUG-009 en `BUGS_AND_FIXES.md`.
- **`AssistantChatComponent`**: widget flotante, `z-index` en la escala 900-902 (por debajo de cualquier modal, que están en 1000). Oculto por completo en `/app/messages` para no tapar el chat real.

## 4. Componentes compartidos (`shared/components/`)

| Componente/util | Uso | Notas |
|---|---|---|
| `[appButton]` | Directiva sobre `<button>`/`<a>` — variantes `primary/secondary/ghost/danger`, tamaños `sm/md/lg` | No envuelve el elemento, no rompe `type="submit"` ni `routerLink`. Si tu botón no calza en ninguna variante (ej. ícono solo, o color de marca-empresa violeta), no lo fuerces — es una excepción real. |
| `<app-badge>` | Chips de estado/skill | `tone`: `neutral/success/warning/danger/info/primary`. Para `JobOfferStatus`/`JobApplicationStatus` usá `statusToTone()` + `statusToLabel()`, no mapees a mano. |
| `<app-card>` | Contenedor flat/elevated | **Cero usos reales todavía** — ver nota de adopción parcial en `styles/README.md`. |
| `ConfirmDialogComponent` (vía `MatDialog`) | Reemplazo de `confirm()` nativo | `data: { title, message, confirmLabel?, confirmColor? }`. Default = "Eliminar"/rojo; pasá `confirmLabel`/`confirmColor` explícitos para acciones no destructivas. |
| `<app-empty-state>` | Estado vacío genérico (ícono+título?+texto+acción?) | `compact` para secciones embebidas. No sirve para estados vacíos con contenido extra no genérico (ej. lista de sugerencias) — ahí seguí armándolo a mano. |
| `<app-github-warning>` | Aviso legal fijo sobre compartir repos/GitHub | Texto único en `shared/constants/legal-warnings.ts` — no lo copies. |
| `<app-portfolio-content>` | Render del portafolio (hero+skills+experiencia+educación+proyectos+footer) | Única fuente de verdad para `public-portfolio` y `public-preview`. `[editable]="true"` agrega links "Editar" por sección. |
| `<app-profile-checklist>` | Checklist "Completá tu perfil" con anillo SVG | Candidato-específico. Sus 4 ítems replican la regla de completitud del backend (`candidate-service/profile.service.ts`) — si esa regla cambia, actualizar acá también. |
| `appDate` (pipe) / `formatAppDate` (función) | Formato de fecha único | `'short'` (`dd/MM/yyyy`) · `'long'` · `'datetime'` · `'time'` · `'monthYear'`. Nunca uses el pipe `date` nativo ni `toLocaleDateString` a mano — `LOCALE_ID` está en `es-CO` (`app.config.ts`). |
| `statusToTone` / `statusToLabel` | Color y texto de `JobOfferStatus`/`JobApplicationStatus` | `shared/components/badge/`. |

## 5. Servicios API (`core/services/`)

Un servicio Angular por dominio backend (`profile.service.ts`, `skills.service.ts`, `jobs.service.ts`, `chat.service.ts`, `dashboard.service.ts`, `company.service.ts`, `cv.service.ts`, `assistant.service.ts`, `public-portfolio.service.ts`). Todos apuntan a `http://localhost:3000/api` (Gateway) hardcodeado en cada servicio — **no hay `environment.ts` con URL configurable todavía** (candidato a mejora si el proyecto se despliega fuera de local). `ProfileService.getProfile()` cachea la respuesta con `shareReplay(1)` e invalida el cache en cada `updateProfile()` — si agregás un flujo nuevo que dependa del perfil actualizado, usá `getProfile()` (no dupliques el fetch) y llamá `invalidateCache()` solo si escribís por fuera del método `updateProfile`.

`ChatSocketService` maneja la conexión WebSocket directa a `chat-service:3008` (namespace `/chat`), separada del resto de los servicios HTTP.

## 6. Guards e interceptors

- **`CandidateGuard`/`CompanyGuard`** (`core/guards/auth.guard.ts`): si `authReady()` ya resolvió, deciden en base al rol cacheado; si no, llaman `fetchMe()` y esperan. Redirigen según rol, no muestran pantalla de error.
- **`AuthGuard`**: guard genérico "cualquier usuario autenticado" — hoy sin uso activo en `app.routes.ts` (los guards por rol lo cubren), queda disponible para una ruta que no necesite distinguir candidato/empresa.
- **`AuthInterceptor`** (`core/interceptors/auth.interceptor.ts`): agrega `withCredentials: true` a toda request y, si el backend responde 401 fuera de rutas públicas/auth, dispara logout automático — evita que la app quede en un estado "logueado a medias".

## 7. Estilos y reglas visuales

- **Regla de oro**: nunca un color/radio/sombra a mano en un `*.component.scss` — todo vive en `styles.scss` como custom properties. `npm run lint:css` lo hace cumplir.
- Paleta de marca: **teal profesional** (`--primary: #0f766e`). Identidad "empresa" separada: `--accent-purple` (violeta) — no mezclar.
- `LOCALE_ID` = `es-CO` (`app.config.ts`, con `registerLocaleData`) — necesario para que `appDate`/pipes de Angular rindan en español.
- Breakpoints: `@use 'breakpoints' as bp;` → `bp.tablet` (≤768px), `bp.mobile` (≤480px), `bp.desktop-up` (≥1024px), `bp.until-desktop` (≤1023px, usado por el menú hamburguesa).

## 8. Patrones de cards

No hay un componente `Card` adoptado (ver tabla de componentes arriba) — el patrón real repetido a mano es: `background: var(--bg-surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg|xl); box-shadow: var(--shadow-xs|sm); padding: var(--space-lg|xl)`. Si creás una card nueva, replicá esos tokens (no un valor hex/px suelto) aunque no uses `<app-card>` — así queda migrable después sin tocar el resultado visual.

## 9. Patrones de modales

Todos vía `MatDialog` + `ConfirmDialogComponent` para confirmaciones sí/no. No hay un modal "de contenido rico" reusable todavía — cada pantalla que necesita uno (ej. detalle de oferta en `candidate-jobs`) lo arma como panel/overlay propio dentro del mismo componente, no como diálogo de Material. Si armás uno nuevo, usá los tokens de `--shadow-lg/xl` y `--overlay-scrim` para el fondo, y `z-index` ≥ 1000 (por encima del asistente flotante, que está en 900-902).

## 10. Manejo de formularios

Reactive Forms (`FormBuilder`, `ReactiveFormsModule`) en todos los formularios de edición. Patrón estándar de guardado:
```ts
save() {
  const data = this.form.value;
  const req = this.editing ? this.service.update(this.editing, data) : this.service.create(data);
  req.subscribe({
    next: () => { this.load(); this.cancel(); this.snackBar.open('Guardado', 'Cerrar', { duration: 2000 }); },
    error: (err: HttpErrorResponse) => {
      const msg = err?.error?.message || err?.message || 'Error al guardar';
      this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
    },
  });
}
```
**Todo `subscribe()` que muta datos necesita callback `error`** — no fue así siempre (ver Fase 6.2 en `plan-mejoras-frontend-ux.md`, se corrigieron 5 casos que solo tenían `next`). Si agregás un `create`/`update`/`delete` nuevo, no repitas ese bug.

## 11. Manejo de errores

`MatSnackBar` para feedback de error/éxito puntual (2-2.5s éxito, 3.5-4s error). Mensaje siempre `err?.error?.message || err?.message || '<fallback en español>'` — nunca mostrar el error crudo del navegador. Nunca `console.error`/`console.log` de depuración dejado en código de producción (se encontró y limpió uno en `messages.component.ts`, Fase 5).

## 12. Manejo de logos

Patrón: `@if (logoUrl; as logo) { <img [src]="logo" ...> } @else { <div class="fallback">{{ iniciales }}</div> }`, con iniciales calculadas de `companyName`/`fullName` (`.split(/\s+/).slice(0,2).map(p => p.charAt(0).toUpperCase()).join('')`). El fondo del fallback usa `--accent-purple` cuando es logo de **empresa** (identidad visual separada del teal de candidato). No asumas que `logoUrl` siempre existe — se encontró un caso (`company-dashboard`) donde faltaba tanto el `@else` como el CSS del propio `<img>` (Fase 5).

## 13. Estados vacíos

Usar `<app-empty-state>` (ver sección 4) salvo que el estado vacío tenga contenido no genérico (hints, ilustraciones específicas). No repitas un `<p>` de texto plano — es exactamente el problema que ese componente vino a resolver.

## 14. Paginación

Patrón manual (no hay componente compartido de paginación todavía): estado `page`/`limit`/`total`/`totalPages` en el componente, botones `page-btn` numerados + prev/next, `goToPage(p)` valida `1 <= p <= totalPages` antes de refetchear. Ver `company-candidates.component.ts` como referencia. Candidato a extraer si aparece una tercera pantalla con el mismo patrón (hoy solo búsqueda de candidatos lo usa con paginación real; jobs/aplicaciones usan scroll o listas completas).

## 15. Filtros

Patrón: `FormControl` por filtro + botón "Buscar"/`(keydown.enter)`, más un botón "Limpiar filtros" que resetea todos los controles y vacía resultados. Los filtros que vienen por query param de otra pantalla (ej. landing → `company/candidates?q=...`) deben leerse en `ngOnInit` vía `ActivatedRoute.snapshot.queryParamMap` **y disparar la búsqueda automáticamente** — se encontró un caso donde el param se pasaba pero nunca se leía del lado receptor (Fase 5, bug del parámetro `q`). Si agregás un nuevo punto de entrada con query params, verificá ambos lados: quién los manda y quién los lee.
