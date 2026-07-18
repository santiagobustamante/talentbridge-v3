# Checklist de pruebas — TalentBridge V3

Manual, en navegador real (esta sesión no tiene forma de verificarlo por sí misma) — usar con los [usuarios demo](./PROJECT_OVERVIEW.md#usuarios-demo). Marcar `[x]` a medida que se confirma, dejar `[ ]` lo que falte y anotar la fecha de la última pasada completa al final del archivo.

## Landing (`/`)
- [ ] Navbar: links a secciones (`Candidatos`/`Empresas`/`Trabajos`/`Cómo funciona`) hacen scroll suave a la sección correcta.
- [x] Buscador hero: placeholder completo visible (no cortado), texto largo no se recorta de forma abrupta. *(2026-07-17, verificado en vivo)*
- [ ] Buscar sin estar logueado → redirige a `/company/login` con `?q=...` → tras login lleva a `/company/candidates?q=...` **con la búsqueda ya ejecutada** (BUG-001, verificar que quedó resuelto).
- [ ] Cards de "Profesiones destacadas" → cada una navega a `/company/candidates?q=<profesión>` con resultados filtrados.
- [ ] CTAs "Soy candidato"/"Soy empresa" → `/register` y `/company/register`.
- [ ] Responsive: navbar colapsa, buscador se apila en mobile.
- [x] Sección "¿A quién está dirigido?" (cards candidato/empresa) renderiza contenido completo — *falso positivo descartado 2026-07-17, ver `DECISIONS.md`.*

## Login candidato (`/login`)
- [x] Login con `bustamantemolinasantiago@gmail.com` / `Santiago.123` → redirige a `/app/inicio`. *(2026-07-17, verificado en vivo)*
- [ ] Login con credenciales de empresa (`empresa001@demo.com`) → rechazado con 403 / mensaje claro (el login de candidato no debe aceptar cuentas `COMPANY`).
- [x] Botón de submit usa el estilo `appButton` del sistema (no el look de Material sin estilizar) — ver Fase 10. *(2026-07-17, verificado en vivo)*
- [ ] Validaciones de formulario (email inválido, campo requerido) muestran mensaje en español.

## Login empresa (`/company/login`)
- [x] Login con `empresa001@demo.com` / `Empresa.123` → redirige a `/company/dashboard`. *(2026-07-17, verificado en vivo)*
- [ ] Login con credenciales de candidato → rechazado.
- [ ] Si se llegó con `?q=...` en la URL, tras login exitoso redirige a `/company/candidates?q=...` (no a `/company/dashboard`) — BUG-001.

## Dashboard candidato (`/app/inicio`)
- [ ] Checklist "Completá tu perfil" (anillo de progreso) aparece si el perfil no está al 100%, con los 4 ítems correctos y links funcionales. *(no probado — el perfil demo ya está al 100%, se confirmó que el checklist se oculta correctamente en ese caso)*
- [x] Checklist **desaparece** si el perfil llega al 100%. *(2026-07-17, verificado en vivo)*
- [x] Ofertas recientes, postulaciones recientes, mensajes recientes: estado vacío usa `<app-empty-state>` (ícono+texto), no texto plano. *(no aplicable en esta pasada — el perfil demo tiene datos en las 3 secciones; estructura del componente revisada, no el estado vacío en vivo)*
- [ ] Contador de mensajes no leídos se actualiza al volver a esta pantalla desde otra ruta.
- [x] Menú lateral sin texto duplicado (título corto + descripción, no el mismo texto dos veces) — BUG-009, corregido y verificado 2026-07-17.

## Perfil candidato (`/app/profile`)
- [ ] Guardar cambios de datos básicos persiste y refresca el resumen.
- [ ] Campos e íconos alineados, misma altura entre sí y contra los formularios con `mat-form-field` (Experiencia/Educación/Proyectos) — Fase 15, 2026-07-17.
- [ ] Generar slug produce una URL válida y sin caracteres raros.
- [x] URL pública mostrada usa el dominio real (`window.location.origin`), no `localhost:4200` hardcodeado — BUG-005. *(verificado en sesión anterior, no reprobado esta vez)*
- [x] Aviso de GitHub (`<app-github-warning>`) aparece junto al campo GitHub. *(2026-07-17, verificado en vivo)*
- [x] Switches de visibilidad (`showPhone`, `showCity`, etc.) reflejan el estado real y se guardan. *(2026-07-17, verificado visualmente que reflejan el estado; guardado no reprobado esta vez)*

## Trabajos (`/app/jobs`)
- [x] Listado de ofertas publicadas carga con filtros aplicables. *(2026-07-17, verificado en vivo)*
- [x] Barra de coincidencia de habilidades (%) se muestra en cada oferta con `matchedSkills`, con los chips de skills coincidentes debajo. *(2026-07-17, verificado en vivo, incluida corrección de mayúsculas — BUG-011)*
- [ ] Ofertas sin `skillsRequired` permiten aplicar sin restricción.
- [x] Ofertas donde el candidato no matchea ninguna skill requerida: botón "Aplicar" deshabilitado + mensaje "No coincides con los requisitos principales". *(2026-07-17, verificado en vivo)*
- [ ] Aplicar dos veces a la misma oferta → error 409 claro, no un fallo genérico.
- [ ] Filtros (búsqueda, ciudad, rango de fechas) con la misma altura de campo; textarea del mensaje de postulación con tamaño razonable, no gigante — Fase 15, 2026-07-17.

## Mis postulaciones
- [x] Estado de cada postulación (`Pendiente/Revisado/Preseleccionado/Rechazado/Contratado`) se muestra en español con el color correcto (`statusToLabel`/`statusToTone`). *(2026-07-17, verificado en vivo)*
- [x] Fecha de postulación en formato `dd/MM/yyyy` en español (no en inglés — BUG-002). *(2026-07-17, verificado en vivo)*
- [x] Filtros por estado y por rango de fecha + botón limpiar, con paginación. *(2026-07-17, verificado en vivo)*

## Habilidades (`/app/skills`)
- [x] Agregar/editar/eliminar habilidad funciona visualmente (cards limpias, sin superposición). *(2026-07-17, verificado en vivo; flujo de eliminar con confirmación no reprobado esta vez)*
- [ ] Si el backend falla al eliminar, aparece un snackbar de error (no falla en silencio — BUG-007).
- [ ] Autocompletado de nombre de skill sugiere del catálogo normalizado.

## Experiencia (`/app/experience`)
- [ ] CRUD completo funciona; fechas de rango en formato `mes año` en español (`monthYear`).
- [ ] Eliminar pide confirmación; error de red muestra snackbar (BUG-007).
- [ ] Bloque "Periodo": al tildar "Trabajo actual", "Fecha Fin" se oculta de forma limpia y el checkbox queda alineado junto a "Fecha Inicio" (sin columna vacía ni salto de layout) — Fase 15, 2026-07-17.

## Educación (`/app/education`)
- [ ] CRUD completo funciona (incluido **guardar**, que no tenía manejo de error — BUG-007, verificar que ahora sí).
- [ ] Eliminar pide confirmación con `ConfirmDialogComponent`.
- [ ] Al tildar "Cursando actualmente", "Fecha Fin" se oculta y el checkbox queda en la misma fila que las fechas (ya no aparece suelto después de la descripción) — Fase 15, 2026-07-17.

## Proyectos (`/app/projects`)
- [ ] CRUD completo funciona.
- [ ] Aviso legal de repositorio (`<app-github-warning>`) visible en el formulario.
- [ ] Eliminar pide confirmación; error de red muestra snackbar.
- [ ] Fecha inicio/Fecha fin forman una fila de 2 columnas propia, sin celda huérfana junto a "Estado" — Fase 15, 2026-07-17.

## CV (`/app/cv-analysis`)
- [x] Subida de PDF (≤5MB) funciona; archivo >5MB rechazado con mensaje claro. *(2026-07-17: verificado que la pantalla y el documento ya subido se ven correctamente; no se reprobó una subida nueva ni el rechazo por tamaño)*
- [ ] Analizar CV produce score + fortalezas + recomendaciones.
- [x] Fecha de subida/análisis en formato `datetime` en español (confirmado "p. m." en vez de "PM"). *(2026-07-17, verificado en vivo)*

## Vista pública (`/app/public-view` y `/portfolio/:slug`)
- [x] `/app/public-view` (autenticada) muestra el portafolio completo con estilo profesional. *(2026-07-17, verificado en vivo)*
- [ ] `/portfolio/:slug` (pública, sin login) — no reprobado esta vez.
- [ ] Switches de visibilidad del perfil se respetan en `/portfolio/:slug` (una sección oculta no debe aparecer).
- [x] Copiar enlace público visible y con botón funcional en la UI. *(2026-07-17, verificado visualmente; no se probó el clipboard en sí)*
- [ ] Slug inexistente → estado "Portafolio no encontrado", no una pantalla en blanco ni error crudo.

## Dashboard empresa (`/company/dashboard`)
- [x] Logo de la empresa se muestra si existe (SVG real, no `ui-avatars` ni placeholder) — BUG-006 + Fase 9 confirmados. *(2026-07-17, verificado en vivo)*
- [x] Vacantes/postulaciones/mensajes recientes: métricas y tabla se ven ordenadas, sin huecos visuales. *(2026-07-17, verificado en vivo)*
- [x] No muestra "Accesos rápidos" (sección eliminada según Fase 6 del plan UX). *(2026-07-17, confirmado — solo existe "Búsqueda rápida de talento" con chips, que es una feature distinta y sí debe estar)*

## Perfil empresa (`/company/profile`)
- [ ] Guardar cambios persiste.
- [x] Logo se muestra correctamente (SVG real). *(2026-07-17, verificado en vivo)*
- [ ] Campos con altura/radio consistentes con el resto de la app, foco en violeta (identidad "empresa", no el teal de candidato) — Fase 15, 2026-07-17.

## Vacantes publicadas (`/company/jobs`)
- [x] Tabla de ofertas alineada correctamente en desktop (columna Contrato ya no se corta — BUG-010, corregido y verificado 2026-07-17). Tablet/mobile no re-verificados esta pasada.
- [ ] Cerrar/Archivar/Eliminar oferta usan `ConfirmDialogComponent` con el texto de botón correcto (no dice "Eliminar" al cerrar/archivar).
- [ ] Publicar oferta cambia su estado y la hace visible en `/app/jobs` del lado candidato.
- [x] Ver postulaciones de una oferta y cambiar su estado funciona (modal con candidato, mensaje, dropdown de estado, "Ver portafolio"/"Contactar"). *(2026-07-17, verificado en vivo)*
- [x] "Nueva oferta": formulario abre con todos los campos (título, descripción, ciudad, modalidad, tipo de contrato, carga horaria, moneda, salario, requisitos, responsabilidades). *(2026-07-17, verificado en vivo; guardado y opción "Otro" no reprobados esta vez)*
- [ ] Campos del formulario (título, salario mín/máx, textareas) con altura/radio consistentes, fila de habilidades requeridas alineada — Fase 15, 2026-07-17.

## Candidatos (`/company/candidates`)
- [x] Búsqueda por texto devuelve resultados reales con cards completas (avatar, título, ciudad, experiencia, resumen, skills). *(2026-07-17, verificado en vivo — el primer intento pareció "sin resultados" por un selector de prueba incorrecto, no un bug de la app, ver `DECISIONS.md`)*
- [x] Chips de habilidades con mayúsculas consistentes — BUG-011, corregido y verificado 2026-07-17.
- [ ] Panel de filtros avanzados (ciudad, experiencia mínima, etc.): campos con la misma altura entre sí, grilla de 2 columnas colapsa a 1 en tablet/mobile — Fase 15, 2026-07-17.

## Chat (`/app/messages` y `/company/messages`)
- [x] Lista de conversaciones carga; muestra logo/avatar, nombre y último mensaje. *(2026-07-17, verificado en vivo, ambos lados)*
- [x] Enviar mensaje por WebSocket sin recargar la página, y que aparezca **una sola vez** (no duplicado/triplicado) en la pantalla del remitente. *(2026-07-17 — encontró y corrigió BUG-012: aparecía 2-3 veces antes del fix; reverificado tras el fix, 1 sola vez)*
- [ ] Recibir un mensaje del otro lado en tiempo real (no probado — requiere dos sesiones simultáneas).
- [ ] Marcar como leído actualiza el contador de no leídos.
- [ ] Bloquear conversación usa `ConfirmDialogComponent` (no el overlay hecho a mano que existía antes).
- [x] Asistente "Joaquín" (widget flotante) **no aparece** dentro de `/app/messages` ni `/company/messages`. *(2026-07-17, verificado en vivo, ambos lados)*
- [x] Timestamps de mensajes en formato `time` (hora corta) en español (ej. "11:57 p. m."). *(2026-07-17, verificado en vivo)*

## Registro candidato (`/register`) y empresa (`/company/register`)
- [x] Ambos formularios cargan sin errores, con los campos esperados (candidato: email+contraseña; empresa: nombre, email, sector, ciudad, contraseña). *(2026-07-17, verificado en vivo; envío real de un registro nuevo no probado para no ensuciar la base con una cuenta de prueba)*
- [ ] Enviar el formulario crea la cuenta y redirige correctamente.
- [ ] Validaciones (contraseñas no coinciden, email duplicado) muestran mensaje claro.

## Editar oferta (empresa, dentro de `/company/jobs`)
- [x] El modal abre con todos los campos precargados con los valores reales de la oferta, incluida la jornada ("Carga horaria") ya completada por el backfill de datos. *(2026-07-17, verificado en vivo)*
- [ ] Guardar cambios persiste y se refleja en la tabla.

## Responsive (repetir en las pantallas de arriba que aplique)
- [x] Mobile (390px, candidato): dashboard y trabajos revisados — sin overlap real del asistente flotante (un supuesto overlap resultó falso positivo de la herramienta de captura, ver `DECISIONS.md`); agregado `padding-bottom` defensivo de todas formas. *(2026-07-17)*
- [ ] Tablet (~768px) — no verificado esta pasada.
- [ ] Menú hamburguesa de `AppShellComponent`/`CompanyShellComponent` abre/cierra correctamente en mobile.
- [x] Asistente flotante no tapa contenido ni otros modales (z-index 900-902, por debajo de diálogos en ≥1000) — confirmado con scroll real hasta el final del contenido. *(2026-07-17)*

## Build frontend
```bash
cd FRONTEND
npm run lint:css   # debe terminar sin errores
ng build            # debe terminar sin errores (warnings de presupuesto de bundle preexistentes son aceptables, no nuevos)
```
- [ ] `lint:css` limpio.
- [ ] `ng build` limpio (comparar warnings contra la lista conocida en `NEXT_STEPS.md` — si aparece uno nuevo, investigar antes de continuar).

## Build backend
```bash
cd BACKEND
npx prisma validate
npx prisma generate
npm run build:<servicio-tocado>   # o npm run build para todos
```
- [ ] `prisma validate` limpio (si se tocó el schema).
- [ ] Build del/de los servicio(s) tocado(s) sin error TypeScript.
- [ ] Servicio arranca (`npm run start:<servicio>`) sin excepción al bootstrap.

---
**Última pasada completa registrada:** parcial, 2026-07-17 — primera ronda con navegador real (Playwright + Edge local), cubrió la mayoría de las pantallas de candidato y empresa listadas arriba pero no el 100% de los sub-ítems de cada una (ver marcas `[x]` con fecha). Quedan pendientes de una próxima ronda: registro (candidato/empresa), editar oferta, envío de mensajes en tiempo real, accesibilidad, tablet, y varios sub-ítems de detalle marcados como no reprobados esta vez. Ver Fase 11/12 en `PHASES.md` y `NEXT_STEPS.md` #4.
