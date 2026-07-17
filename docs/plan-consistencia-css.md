# Plan de Consistencia de CSS — TalentBridge V3

**Estado: completo** (Fases 0–5 cerradas el 11/07/2026). Los 968 colores hardcodeados de la línea base quedaron en 0, verificado con `npm run lint:css` sobre `src/**/*.scss`. Guía de uso para features futuras en [`FRONTEND/src/styles/README.md`](../FRONTEND/src/styles/README.md). Falta únicamente el commit de todo lo listado acá (decisión del usuario: un solo commit al final del plan).

## Contexto

Auditoría del CSS del FRONTEND (Angular 19) realizada el 11/07/2026. Existe un sistema de tokens de diseño en `src/styles.scss` (color, radios, sombras, espaciado, transiciones) pero no se respeta fuera de ese archivo: los 27 `*.component.scss` reintroducen valores propios en vez de reutilizar las variables ya definidas.

**Restricciones del proyecto:**
- Desarrollo 100% local durante esta fase. No se despliega ni se conecta a servicios externos de pago hasta nueva indicación.
- Todas las herramientas propuestas en este plan son gratuitas y corren en local (Stylelint, componentes propios de Angular) — ninguna requiere cuenta, licencia ni servicio externo.
- Este documento es la bitácora oficial de seguimiento para el seminario UCC. Se actualiza al cerrar cada fase.

## Diagnóstico (línea base)

| Métrica | Valor |
|---|---|
| Colores hexadecimales hardcodeados fuera de `styles.scss` | 915 |
| De esos, duplicados exactos de tokens ya definidos (`--primary`, `--text-main`, `--border-soft`, `--text-muted`, `--danger`) | 303 |
| `border-radius` hardcodeado vs. usando `var(--radius-*)` | 151 vs. 199 |
| `box-shadow` hardcodeado vs. usando `var(--shadow-*)` | 52 vs. 56 |
| `font-family` redeclarado dentro de componentes | 57 |
| Breakpoints `@media` distintos sin mixin compartido | 6 (768/480/1024/1023/900/600px) |
| Definiciones independientes de `.btn` | 16 archivos |
| Componentes de UI compartidos existentes (`shared/components`) | 2 (confirm-dialog, github-warning) — ninguno es un átomo visual (botón/badge/card) |
| Linter de estilos configurado | No |

**Causa raíz:** no hay componentes de UI compartidos (Button, Badge, Card). Sin ellos, cada feature nueva copia el HTML/CSS del componente "parecido" de otra pantalla y ese copy-paste introduce su propio color.

## Archivos con más hardcodeo (línea base formal, medida con Stylelint — 11/07/2026)

Total de violaciones de la regla `declaration-property-value-disallowed-list` (color hardcodeado): **968**, sobre 26 archivos.

1. `public-preview.component.scss` — 130
2. `profile.component.scss` — 102
3. `company-candidates.component.scss` — 101
4. `company-dashboard.component.scss` — 90
5. `messages.component.scss` — 90
6. `home-candidate.component.scss` — 85
7. `profile-editor.component.scss` — 81
8. `company-profile.component.scss` — 63
9. `candidate-jobs.component.scss` — 52
10. `public-portfolio.component.scss` — 35
11. `assistant-chat.component.scss` — 28
12. `company-jobs.component.scss` — 22
13. resto de archivos (≤16 cada uno: home, cv-analysis, skills, projects, dashboard, education, experiences, app-shell, company-shell, los 4 de auth, company-view)

Comando para reproducir: `npm run lint:css` (o `-- --formatter json` para el detalle por archivo).

## Fases

### Fase 0 — Fundaciones
- [x] **0.1** Instalar y configurar Stylelint (`stylelint` + `stylelint-config-recommended-scss`) con regla que prohíbe hex/rgb hardcodeado en `color`/`background`/`border-color`/`box-shadow`/etc. dentro de `src/app/**/*.scss` (no aplica a `styles.scss`, que es donde viven los tokens). Scripts `lint:css` y `lint:css:fix` en `package.json`.
- [x] **0.2** Corrida completa de Stylelint sobre `src/**/*.scss`: **968 violaciones de color hardcodeado** en 26 archivos — línea base formal (ver tabla de arriba), reemplaza la estimación manual inicial.

### Fase 1 — Ampliar y limpiar el token system
- [x] **1.1** Consolidar los ~30 tonos sueltos (verdes/rojos/azules inventados por componente) en variantes `-soft`/`-strong` de los tokens semánticos existentes (`--success`, `--warning`, `--danger`) + token `--info` nuevo (no existía) + `--accent-purple`/`--brand-github` para los casos que no son semánticos de estado.
- [x] **1.2** Tokens de tipografía (`--font-size-2xs` a `--font-size-3xl`, `--font-weight-*`), tokens de tamaño de ícono (`--icon-size-xs` a `--icon-size-5xl`, distintos de los de texto — los valores en px casi siempre acompañan `mat-icon`, no texto) y mixins de breakpoints (`mobile`/`tablet`/`desktop-up`) en `src/styles/_breakpoints.scss`, habilitados vía `stylePreprocessorOptions.includePaths` en `angular.json`. Los `h1`-`h4` globales ahora usan los tokens en vez de rem sueltos.
- [x] **1.3** Reemplazados los ~35 hex literales de la sección de overrides de Angular Material en `styles.scss` por los tokens correspondientes. De paso, 2 `box-shadow` hardcodeados pasaron a `var(--shadow-md)`/`var(--shadow-xl)` (diferencia de opacidad imperceptible frente al valor original, ver nota abajo). Agregados 2 tokens que faltaban: `--border-strong` (hover de inputs) y `--accent-on-dark` (color del botón de acción del snackbar, que va sobre fondo oscuro).

#### Tabla de mapeo hex → token (para Fase 3)

Investigado por contexto real de uso (no solo por cercanía de valor), corriendo `grep -B1` sobre cada tono ambiguo antes de decidir. Hallazgo clave: los colores sueltos **no eran ruido aleatorio** — success/warning/danger ya se usaban con la intención correcta, solo con 2-3 variantes de hex distintas para la misma intención. El único hueco real era `info` (azul de "pendiente/cargando"), que no tenía token.

| Hex encontrado | Token destino | Nota |
|---|---|---|
| `#ecfdf5`, `#f0fdf4`, `#dcfce7` | `var(--success-soft)` | 3 verdes casi idénticos usados como fondo de badge "éxito" |
| `#059669`, `#16a34a`, `#10b981` | `var(--success)` | |
| `#065f46`, `#166534`, `#047857` | `var(--success-strong)` *(nuevo)* | texto oscuro sobre fondo success-soft |
| `#fef3c7`, `#fffbeb` | `var(--warning-soft)` | |
| `#f59e0b`, `#d97706` | `var(--warning)` | `d97706` es el tono realmente dominante (8 usos vs 3 de `f59e0b`) pero se consolidan en el mismo token |
| `#92400e`, `#b45309` | `var(--warning-strong)` *(nuevo)* | |
| `#fde68a` | `var(--warning-border)` *(nuevo, agregado en 3.2)* | |
| `#a7f3d0` | `var(--success-border)` *(nuevo, agregado en 3.2)* | completa la simetría de las 4 familias semánticas (base/soft/strong/border) |
| `#fef2f2`, `#fee2e2` | `var(--danger-soft)` | token redefinido: era `#fee2e2` (1 uso real), pasa a `#fef2f2` (24 usos reales) |
| `#dc2626`, `#ef4444` | `var(--danger)` | `ef4444` aparece en estados hover/contador de badge, visualmente equivalente |
| `#991b1b` | `var(--danger-strong)` *(nuevo)* | |
| `#fecaca` | `var(--danger-border)` *(nuevo)* | |
| `#eff6ff`, `#e0f2fe`, `#f0f9ff` | `var(--info-soft)` *(nuevo)* | badges PENDING/REVIEWED, `loading-card` |
| `#0369a1` | `var(--info)` *(nuevo)* | |
| `#1e40af`, `#1e3a8a` | `var(--info-strong)` *(nuevo)* | |
| `#bae6fd` | `var(--info-border)` *(nuevo)* | |
| `#0ea5e9` | `var(--info-bright)` *(nuevo)* | ícono de spinner/loading |
| `#4338ca` | `var(--accent-purple)` *(nuevo)* | avatar de ícono en company-profile/company-candidates — decorativo, no es un estado |
| `#3730a3` | `var(--accent-purple-hover)` *(nuevo)* | |
| `#e0e7ff` | `var(--accent-purple-soft)` *(nuevo)* | |
| `#6e5494` | `var(--brand-github)` *(nuevo)* | color de marca oficial de GitHub, no tocar |
| `#0a66c2`, `#074a8f`, `#e8f1fb`, `#f0f6fd` | `var(--primary)` / `var(--primary-hover)` / `var(--primary-soft)` / `var(--primary-ghost)` | ya eran duplicados exactos |
| `#1f2937` | `var(--text-main)` | duplicado exacto |
| `#374151` | `var(--text-main)` | gris cercano, se pliega al mismo token para no fragmentar la escala |
| `#111827` | `var(--text-heading)` *(nuevo)* | negro casi puro, usado para títulos con énfasis |
| `#4b5563` | `var(--text-secondary)` | duplicado exacto |
| `#6b7280` | `var(--text-muted)` | duplicado exacto |
| `#9ca3af` | `var(--text-placeholder)` | duplicado exacto |
| `#e5e7eb` | `var(--border-soft)` | duplicado exacto |
| `#d1d5db` | `var(--border-medium)` | duplicado exacto |
| `#f8fafc` | `var(--bg-surface-soft)` | duplicado exacto |
| `#f9fafb` | `var(--bg-surface-soft)` | gris casi idéntico, se pliega al mismo token |
| `#f1f5f9` | `var(--bg-surface-hover)` | duplicado exacto |
| `#f3f4f6` | `var(--bg-surface-hover)` | gris casi idéntico, se pliega al mismo token |
| `#fff` / `#ffffff` como fondo de superficie | `var(--bg-surface)` | |
| `#fff` / `#ffffff` como texto/ícono sobre fondo de color sólido | `var(--text-on-color)` *(nuevo, agregado durante la migración de 3.1)* | ej. texto de `.app-btn--primary`, avatar circular |
| `rgba(0,0,0,0.4)` / `rgba(0,0,0,0.45)` (fondo detrás de modales) | `var(--overlay-scrim)` *(nuevo, agregado durante la migración de 3.1)* | usado en 3 archivos con opacidad ligeramente distinta (0.4 vs 0.45), imperceptible al consolidar |

### Fase 2 — Componentes de UI compartidos
- [x] **2.1** Creada `shared/components/button/button.directive.ts` — directiva `[appButton]` (no un wrapper) para no romper `type="submit"`, `routerLink` ni foco nativo. Variantes primary/secondary/ghost/danger × tamaños sm/md/lg, en `src/styles/_button.scss`, sumado a `styles.scss` vía `@use`. Basado en el patrón real ya repetido en 16 archivos (`btn-save`≈primary, `btn-outline`/`btn-cancel`≈secondary/danger).
- [x] **2.2** Creada `shared/components/badge/badge.component.ts` (tonos neutral/success/warning/danger/info/primary + soporte opcional `removable` para el caso "chip"). El mapeo de tono sale de auditar los 9 valores reales de `JobOfferStatus`/`JobApplicationStatus` en 6 archivos: todos ya seguían la misma intención semántica (DRAFT/ARCHIVED=neutral, PUBLISHED/PRESELECTED/HIRED=success, CLOSED=warning, REJECTED=danger, PENDING/REVIEWED=info), solo con 2-3 variantes de hex por tono — confirma que los tokens de la Fase 1.1 alcanzan sin agregar nada nuevo.
- [x] **2.3** Creada `shared/components/card/card.component.ts` (variantes `flat`/`elevated`, padding `sm`/`md`/`lg`), tomada del patrón `background:#fff; border:1px solid #e5e7eb; border-radius:18px` repetido en ~15 archivos (`18px` ya coincidía exacto con `--radius-xl`).

### Fase 3 — Migración por orden de impacto
- [x] **3.1** Migrados los 5 archivos con más hardcodeo (public-preview, profile, company-candidates, company-dashboard, messages). Colores 100% tokenizados + adopción de `Button`/`Badge` donde el markup coincidía (botones guardar/cancelar/outline, badges de estado de ofertas/postulaciones vía el nuevo `statusToTone()`, chips de habilidades removibles). 2 tokens nuevos surgidos de la migración: `--text-on-color` y `--overlay-scrim`. `messages.component.scss` se dejó sin adoptar Button/Badge (UI de chat muy bespoke, bajo riesgo/beneficio de forzarlo). Stylelint: 981 → 465. `ng build` limpio.
- [x] **3.2** Migrados los 6 archivos de impacto medio. Hallazgos: `profile-editor` usa `ViewEncapsulation.None` (hubo que prefijar `.profile-editor` en los selectores que tocan `.app-btn` para no filtrar estilos a botones de otras pantallas); `company-profile` mantiene intencionalmente su identidad violeta (`--accent-purple`) en vez de adoptar el primario azul — es una distinción de marca candidato/empresa, no una inconsistencia; `candidate-jobs` y `company-jobs` tenían el mapping de 9 estados duplicado 2-3 veces cada uno (`applied-badge`/`applied-chip`/`status-chip`, `status-badge`) — todo resuelto ahora por `<app-badge [tone]="statusTone(...)">`; se encontró y eliminó `.applied-chip` (CSS muerto, sin uso en ningún template). Agregados `--success-border`/`--warning-border` para completar la simetría de las 4 familias semánticas, y `mat-icon` sizing dentro de `Badge` (con `::ng-deep`, necesario porque el contenido proyectado conserva el scope del padre, no el del hijo).
- [x] **3.3** Migrados los 15 archivos restantes (assistant-chat, home, cv-analysis, skills, dashboard, projects, education, experiences, company-shell, app-shell, los 4 de auth, company-view). **Stylelint: 122 → 0. Migración de colores 100% completa (968 → 0).** De paso se limpiaron 2 issues no relacionados con color que quedaban en `styles.scss` (`font-family` sin fallback genérico, `word-wrap` deprecado) y uno en `_button.scss` (comentario vacío) — Stylelint corre limpio en todo `src/**/*.scss`.

### Fase 4 — Responsive
- [x] **4** Reemplazados 32 de los 34 `@media` por los mixins (`bp.tablet`=768px en 18 archivos, `bp.mobile`=480px en 9, `bp.desktop-up`=min 1024px en 2, `bp.until-desktop`=max 1023px en 4, consolidando también los `max-width:1024px` que estaban a 1px de esa cifra). Se agregó el mixin `until-desktop` (no estaba en el plan original de la 1.2) porque el par 1023/1024 se repetía en 4 archivos. Se dejaron **sin tocar** los 2 `@media` de `company-dashboard.component.scss` (900px/600px): es un grid de 3 columnas con degradación genuina a 3 niveles, único en todo el proyecto — forzarlo a 2 breakpoints habría cambiado el comportamiento real, no solo el nombre.

### Fase 5 — Verificación y documentación
- [x] **5.1** Stylelint en cero (`npm run lint:css`) + `ng build` limpio, confirmados en cada fase. Revisión visual en navegador real (backend + frontend corriendo en local) con sesión de candidato y de empresa: inicio/dashboard, perfil (modo lectura y edición), habilidades, trabajos (listado + "mis postulaciones"), mensajes, dashboard de empresa (KPIs de 6 colores, tabla de ofertas con badges Cerrada=ámbar/Publicada=verde), búsqueda de candidatos (chips, botones Ver/Contactar), portafolio público — en desktop y mobile (375px, incluye el menú hamburguesa de `company-shell`/`app-shell` vía `until-desktop`/`desktop-up`). Sin regresiones visuales encontradas.
- [x] **5.2** Guía de uso creada en [`FRONTEND/src/styles/README.md`](../FRONTEND/src/styles/README.md) — tokens de color/tipografía/íconos/espaciado, breakpoints, cuándo usar cada componente compartido (`Button`/`Badge`/`Card`), y el caso especial de `ViewEncapsulation.None`. Referenciada desde `FRONTEND/README.md`.

## Bitácora de avance

| Fecha | Fase | Resumen | Commit |
|---|---|---|---|
| 11/07/2026 | — | Auditoría inicial y plan de fases definidos. Sin cambios de código todavía. | — |
| 11/07/2026 | 0.1 – 0.2 | Instalado Stylelint (`stylelint` + `stylelint-config-recommended-scss`) con regla anti-hardcode de color. Agregados `.stylelintrc.json`, scripts `lint:css`/`lint:css:fix`. Corrida inicial: 968 violaciones en 26 archivos — línea base formal para medir el resto del plan. | pendiente de commit |
| 11/07/2026 | 1.1 | Ampliados los tokens de `styles.scss`: `-strong` para success/warning/danger, familia `--info-*` nueva, `--accent-purple-*` y `--brand-github` para casos no semánticos. Tabla de mapeo hex→token documentada arriba para que la Fase 3 sea mecánica. `--danger-soft` redefinido de `#fee2e2` a `#fef2f2` (era el valor realmente usado 24 veces vs. 1). | pendiente de commit |
| 11/07/2026 | 1.2 | Agregados tokens `--font-size-*` (alineados a los `h1`-`h4` existentes), `--font-weight-*`, `--icon-size-*` (escala separada para `mat-icon`, que usa px no rem) y mixins de breakpoint en `src/styles/_breakpoints.scss` (habilitado vía `stylePreprocessorOptions` en `angular.json`). `h1`-`h4` globales ahora referencian los tokens. | pendiente de commit |
| 11/07/2026 | 1.3 | Limpiados los ~35 hex del bloque de overrides de Material en `styles.scss`, reemplazados por tokens. Verificado que compila (`npx sass`) y que Stylelint sigue en 968/981 (sin regresiones en componentes). **Fase 1 completa.** | pendiente de commit |
| 11/07/2026 | 2.1 – 2.3 | Creados los 3 átomos de UI compartidos: `ButtonDirective` (`[appButton]`), `BadgeComponent`, `CardComponent`, todos en `shared/components/`, 100% basados en patrones ya repetidos en el código (no inventados). `ng build` completo sin errores y Stylelint sin regresiones (968 violaciones de color siguen exactas — los componentes nuevos no agregan ninguna). **Fase 2 completa.** | pendiente de commit |
| 11/07/2026 | 3.1 | Migrados los 5 archivos con más hardcodeo. Agregado `statusToTone()` compartido (`shared/components/badge/status-tone.util.ts`) para no repetir el mapping estado→color en cada componente. Stylelint 981→465, `ng build` limpio. Verificación visual en navegador queda para la Fase 5.1 (requiere backend corriendo; se decidió no duplicar ese chequeo por archivo). | pendiente de commit |
| 11/07/2026 | 3.2 | Migrados los 6 archivos de impacto medio (home-candidate, profile-editor, company-profile, candidate-jobs, public-portfolio, company-jobs). Encontrado y corregido un riesgo real de fuga de estilos por `ViewEncapsulation.None` en profile-editor. Eliminado CSS muerto (`.applied-chip`). Stylelint 465→122, `ng build` limpio. | pendiente de commit |
| 11/07/2026 | 3.3 | Migrados los 15 archivos restantes. **Stylelint 122→0 — los 968 colores hardcodeados de la línea base quedaron en 0.** `ng build` limpio. **Fase 3 completa.** | pendiente de commit |
| 11/07/2026 | 4 | Unificados 32/34 `@media` en 27 archivos usando los mixins de breakpoint (agregado `until-desktop` sobre la marcha). Los 2 `@media` restantes (company-dashboard, 900px/600px) se dejaron intactos a propósito — degradación real de 3 columnas, no un valor arbitrario. `ng build` y Stylelint limpios, mismo tamaño de `styles.css` (65.91 kB) que antes de la fase, confirmando que no se perdió ni duplicó CSS. **Fase 4 completa.** | pendiente de commit |
| 11/07/2026 | 5.1 | Verificación visual real en navegador (backend + frontend locales, sesiones de candidato y empresa) — dashboards, perfil, jobs, mensajes, búsqueda de candidatos, portafolio público, en desktop y mobile. Sin regresiones. **Fase 5.1 completa.** | pendiente de commit |
| 11/07/2026 | 5.2 | Escrita la guía de uso del sistema de diseño en `FRONTEND/src/styles/README.md`. **Plan completo — las 6 fases (0 a 5) están cerradas.** | pendiente de commit |
