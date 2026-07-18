import { collapseSpaces } from './text.util';

/** Clave de deduplicación case-insensitive: "Angular", "angular", "ANGULAR" -> "angular". */
export function normalizeSkillKey(raw: string): string {
  return collapseSpaces(raw).toLocaleLowerCase('es-CO');
}

/**
 * Versión a mostrar/guardar como nombre "canónico" de la habilidad. No es un Title Case
 * genérico (rompería siglas como "AWS", "CSS", ".NET") — solo recorta y colapsa espacios,
 * dejando la capitalización que el usuario (o el primer registro de esa skill) haya usado.
 */
export function normalizeSkillDisplay(raw: string): string {
  return collapseSpaces(raw);
}
