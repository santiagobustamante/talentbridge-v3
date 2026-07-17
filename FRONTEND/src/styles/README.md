# Sistema de diseño — FRONTEND

Guía rápida para no reintroducir el problema que motivó el [plan de consistencia de CSS](../../../docs/plan-consistencia-css.md): 915 colores hardcodeados repartidos en 26 archivos porque no había un lugar único ni componentes compartidos para reutilizar.

**Regla de oro: nunca escribas un color, radio o sombra a mano en un `*.component.scss`.** Si Stylelint te frena con *"No hardcodees colores"*, es exactamente por esto — buscá el token de abajo en vez de silenciar la regla.

```bash
npm run lint:css        # falla si hay color hardcodeado fuera de styles.scss
npm run lint:css:fix    # autofix de lo que se pueda (formato, no colores)
```

## 1. Tokens de color

Todos viven en [`src/styles.scss`](../styles.scss) como custom properties (`var(--nombre)`).

| Familia | Tokens | Cuándo usarla |
|---|---|---|
| Marca | `--primary`, `--primary-hover`, `--primary-soft`, `--primary-ghost` | Acción principal. **Teal profesional** (`#0f766e`) — elegido en la [revisión UX](../../../docs/plan-mejoras-frontend-ux.md) entre 3 propuestas visuales. |
| Marca empresa | `--accent-purple`, `--accent-purple-hover`, `--accent-purple-soft` | Identidad visual del lado "empresa" — a propósito distinta del teal de candidato (violeta, `#4338ca`), no la mezcles con `--primary`. |
| Texto | `--text-main`, `--text-secondary`, `--text-muted`, `--text-placeholder`, `--text-heading` | De más a menos énfasis. `--text-heading` es casi negro, para títulos con mucho peso. |
| Texto sobre color | `--text-on-color` | Texto/ícono blanco sobre un fondo sólido de color (botón primario, avatar, badge). No uses `#fff` directo. |
| Superficies | `--bg-page`, `--bg-surface`, `--bg-surface-soft`, `--bg-surface-hover` | Fondos, de la página hacia adentro. |
| Bordes | `--border-soft`, `--border-medium`, `--border-strong`, `--border-focus` | Idem, de más sutil a más marcado. |
| Éxito | `--success`, `--success-soft`, `--success-strong`, `--success-border` | Publicado, contratado, preseleccionado, aprobado. |
| Advertencia | `--warning`, `--warning-soft`, `--warning-strong`, `--warning-border` | Cerrado, en curso, atención sin ser un error. |
| Peligro | `--danger`, `--danger-soft`, `--danger-strong`, `--danger-border` | Rechazado, eliminar, cancelar, error. |
| Información | `--info`, `--info-soft`, `--info-strong`, `--info-border`, `--info-bright` | Pendiente, revisado, cargando, avisos neutrales. |
| Marca externa | `--brand-github` | Solo para el ícono/link de GitHub. No usar para nada más. |
| Overlay | `--overlay-scrim` | Fondo semitransparente detrás de un modal/diálogo. |

Si necesitás un tono que no está: primero revisá si alguno de arriba ya sirve (la mayoría de "necesito otro verde" en realidad era `--success` mal nombrado). Si de verdad falta, agregalo a `styles.scss` con un comentario explicando el caso de uso — no lo dejes suelto en el componente.

## 2. Tipografía, íconos, espaciado

- **Texto**: `--font-size-2xs` (0.7rem) a `--font-size-3xl` (2.25rem, = tamaño de `h1`). `--font-weight-regular/medium/semibold/bold/extrabold`.
- **Íconos** (`mat-icon`): `--icon-size-xs` (16px) a `--icon-size-5xl` (48px). Es una escala aparte de la tipográfica — los íconos casi siempre necesitan `font-size`, `width` y `height` iguales.
- **Espaciado**: `--space-xs` a `--space-3xl`. **Radios**: `--radius-xs` a `--radius-full`. **Sombras**: `--shadow-xs` a `--shadow-xl`.

## 3. Breakpoints

En [`_breakpoints.scss`](./_breakpoints.scss). Importalos con:

```scss
@use 'breakpoints' as bp;

.mi-clase {
  // estilos desktop
  @include bp.tablet { /* ≤768px */ }
  @include bp.mobile { /* ≤480px */ }
}
```

También existe `bp.desktop-up` (≥1024px) y `bp.until-desktop` (≤1023px), usados en `app-shell`/`company-shell` para el menú hamburguesa. No inventes un quinto breakpoint salvo que, como `company-dashboard.component.scss`, tengas una razón real de layout (ver comentario en ese archivo) — si es solo "queda parecido", usá `tablet` o `mobile`.

## 4. Componentes compartidos

Todos en `src/app/shared/components/`. Antes de escribir tu propio `.btn-algo` o `.badge-algo`, revisá si uno de estos ya lo resuelve.

### Button — `[appButton]`

Es una **directiva**, no un componente que envuelve: se aplica directo sobre `<button>` o `<a>`, así no rompe `type="submit"`, `routerLink` ni el foco nativo.

```html
<button appButton="primary" type="submit">Guardar</button>
<button appButton="secondary" size="sm" (click)="cancelar()">Cancelar</button>
<a appButton="danger" (click)="eliminar()">Eliminar</a>
```

- `appButton`: `primary` (acción principal) · `secondary` (acción neutral) · `ghost` (terciaria, sin borde) · `danger` (destructiva, ej. cancelar/eliminar).
- `size`: `sm` · `md` (default) · `lg`.
- Si tu botón necesita un color de marca distinto a `--primary` (como los de `company-profile`, que son violeta), no fuerces la directiva — dejalo bespoke y tokenizado, es una excepción real, no un descuido.

### Badge — `<app-badge>`

```html
<app-badge tone="success">Publicada</app-badge>
<app-badge [tone]="statusTone(job.status)">{{ statusLabel(job.status) }}</app-badge>
<app-badge tone="primary" [removable]="true" (remove)="quitar()">React</app-badge>
```

- `tone`: `neutral` · `success` · `warning` · `danger` · `info` · `primary`.
- `removable`: agrega una × y emite `(remove)` — para chips de filtro/skill, no para badges de solo lectura.
- **Si el badge representa un `JobOfferStatus` o `JobApplicationStatus`**, no mapees el tono a mano: importá `statusToTone` de `shared/components/badge/status-tone.util.ts`. Ya cubre los 9 valores posibles.

### Card — `<app-card>`

```html
<app-card variant="flat" padding="md"> ... </app-card>
```

- `variant`: `flat` (borde, el más común) · `elevated` (sombra, sin borde).
- `padding`: `sm` · `md` (default) · `lg`.
- **Adopción parcial a propósito**: hoy sigue en cero usos reales. Hay ~14 componentes con el mismo patrón visual (fondo + borde + radio + padding) que calzarían, pero cada uno mezcla esa base con layout propio (flex/grid interno, hover, overrides de estado) en el mismo selector — migrarlos exige separar "chrome del contenedor" de "layout de contenido" archivo por archivo, con verificación visual real por pantalla. Se dejó fuera de esta pasada por relación esfuerzo/riesgo; encararlo como tanda dedicada con revisión visual, no como sweep mecánico.

### Confirm dialog — `<app-confirm-dialog>` (vía `MatDialog`)

```ts
private dialog = inject(MatDialog);

const ref = this.dialog.open(ConfirmDialogComponent, {
  data: { title: 'Cerrar oferta', message: '¿Seguro?', confirmLabel: 'Cerrar oferta', confirmColor: 'primary' },
});
ref.afterClosed().subscribe((ok) => { if (ok) { /* ... */ } });
```

- `confirmLabel`/`confirmColor` son opcionales — por defecto dicen "Eliminar" en rojo (`warn`), pensado para borrados. Para una acción no destructiva (cerrar, archivar, bloquear) pasalos explícitos; no reuses el default solo porque "ya existe el diálogo".
- No uses `confirm()` nativo del navegador ni un overlay hecho a mano — ya pasó dos veces (`company-jobs`, `messages`) y es la razón por la que esto está documentado.

### Empty state — `<app-empty-state>`

```html
<app-empty-state compact icon="work_outline" message="Todavía no hay ofertas disponibles." />
<app-empty-state icon="forum" title="Sin conversaciones" message="..." actionLabel="Crear oferta" actionRoute="/company/jobs" />
```

- `compact`: versión reducida para secciones embebidas (tarjetas de dashboard, paneles laterales). Sin el atributo, es la versión de página completa.
- `actionLabel` + `actionRoute` renderiza un link; `actionLabel` solo (sin ruta) renderiza un botón y emitís `(actionClick)`.
- No es para estados vacíos con contenido extra no genérico (ej. una lista de sugerencias) — para eso seguí armándolo a mano, forzar el layout genérico ahí sería peor que no usarlo.

### GitHub warning — `<app-github-warning>`

Aviso legal fijo ("antes de compartir repositorios...") para cualquier campo/sección que muestre un link de GitHub o repositorio. Es el único texto de este tipo — si necesitás editarlo, tocá `GITHUB_RESPONSIBILITY_WARNING` en `shared/constants/legal-warnings.ts`, no copies el párrafo de nuevo en el componente.

## 5. Fecha, estado→texto y otras utilidades compartidas

- **Fecha — pipe `appDate`** (`shared/pipes/app-date.pipe.ts`): `{{ value | appDate:'short' }}` (`dd/MM/yyyy`) · `'long'` (`16 de julio de 2026`) · `'datetime'` (`medium`) · `'time'` (`shortTime`) · `'monthYear'` (`jul 2026`, para rangos de experiencia/educación). Dentro de una clase (no un template) usá la función `formatAppDate` del mismo módulo — es la que el pipe llama por dentro, misma fuente de verdad. No uses el pipe `date` nativo de Angular ni `toLocaleDateString` a mano: `LOCALE_ID` está fijado a `es-CO` en `app.config.ts`, pero un formato inventado ahí te saca de los 5 casos ya cubiertos.
- **Estado→texto — `statusToLabel`** (`shared/components/badge/status-label.util.ts`): traduce los 9 valores de `JobOfferStatus`/`JobApplicationStatus` al español. Complementa a `statusToTone` (mismo carpeta, resuelve el color) — si estás mapeando uno de estos dos enums a mano, ya existen los dos helpers.

## 6. Componentes con `ViewEncapsulation.None`

Ninguno hoy (el único caso, `profile-editor.component.ts`, se eliminó — ver [plan de mejoras UX](../../../docs/plan-mejoras-frontend-ux.md), Fase 4.1). Si agregás uno, **cualquier selector que toque una clase global** (`.app-btn`, `.app-badge`, etc.) tiene que ir prefijado con la clase raíz del componente (ej. `.mi-componente .app-btn { ... }`), o vas a pisar el estilo de esa clase en toda la app.
