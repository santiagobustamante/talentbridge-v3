# AGENTS.md — TalentBridge V3

Este proyecto documenta sus instrucciones para agentes IA en [`CLAUDE.md`](./CLAUDE.md) — es la fuente única, este archivo es solo un puntero para herramientas que buscan específicamente `AGENTS.md` en la raíz.

Leer `CLAUDE.md` completo antes de tocar código. Resumen mínimo si no podés abrirlo:
- No hacer cambios destructivos, no borrar datos ni volúmenes Docker, no commit automático.
- Docker: proyecto `version3` únicamente (`docker compose -p version3 ...`) — nunca tocar "version1".
- `git status` antes y después de cualquier cambio.
- Build correspondiente después de cada cambio (frontend: `ng build`; backend: `build:<servicio>`; Prisma: `validate` + `generate`).
- Documentar en `docs/` (`CHANGELOG.md` como mínimo) cada tarea con cambios reales.
- Checklist completo antes de dar una tarea por terminada: ver `CLAUDE.md`, última sección.
