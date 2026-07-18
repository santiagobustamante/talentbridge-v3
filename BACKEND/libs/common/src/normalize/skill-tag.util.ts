import { collapseSpaces } from './text.util';

/** Clave de deduplicación case-insensitive: "Angular", "angular", "ANGULAR" -> "angular". */
export function normalizeSkillKey(raw: string): string {
  return collapseSpaces(raw).toLocaleLowerCase('es-CO');
}

/** Nombre "canónico" a guardar/mostrar: solo recorta y colapsa espacios, sin forzar
 *  Title Case (rompería siglas como "AWS", "CSS", ".NET"). */
export function normalizeSkillDisplay(raw: string): string {
  return collapseSpaces(raw);
}
