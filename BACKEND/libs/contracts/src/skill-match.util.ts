export type SkillLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

const LEVEL_RANK: Record<SkillLevel, number> = {
  BASIC: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function parseLevel(raw?: string): SkillLevel | null {
  const upper = (raw || '').trim().toUpperCase();
  return upper in LEVEL_RANK ? (upper as SkillLevel) : null;
}

export interface RequiredSkill {
  name: string;
  normalizedName: string;
  requiredLevel: SkillLevel | null;
}

export interface SkillMatchEntry {
  name: string;
  requiredLevel: SkillLevel | null;
  candidateLevel: SkillLevel | null;
  status: 'met' | 'insufficient' | 'missing';
}

export interface SkillMatchResult {
  breakdown: SkillMatchEntry[];
  matchedCount: number;
  totalCount: number;
  matchPercent: number;
  /** Presencia únicamente (sin mirar nivel) — es la regla de elegibilidad real, sin cambios. */
  hasAnyMatch: boolean;
}

/**
 * `JobOffer.skillsRequired` sigue siendo el mismo string separado por comas de
 * siempre ("Angular, PostgreSQL"). Para pedir un nivel puntual por habilidad,
 * sin migrar el schema, se admite opcionalmente "Nombre:NIVEL" por entrada
 * ("Angular:ADVANCED, PostgreSQL"). Las entradas sin ":NIVEL" quedan con
 * requiredLevel = null → "cualquier nivel sirve", igual que hoy.
 */
export function parseSkillsRequired(raw: string | null | undefined): RequiredSkill[] {
  return (raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [namePart, levelPart] = entry.split(':');
      const name = (namePart || '').trim();
      return {
        name,
        normalizedName: name.toLowerCase(),
        requiredLevel: parseLevel(levelPart),
      };
    })
    .filter((r) => r.name.length > 0);
}

export function stringifySkillsRequired(items: Array<{ name: string; requiredLevel?: SkillLevel | null }>): string {
  return items.map((i) => (i.requiredLevel ? `${i.name}:${i.requiredLevel}` : i.name)).join(',');
}

/**
 * Compara los requisitos de una oferta contra las skills del candidato.
 * `matchPercent` es honesto con el nivel (si la oferta lo pide); `hasAnyMatch`
 * se mantiene solo por presencia de nombre, igual que la regla de elegibilidad
 * de hoy (no bloquea de más — decisión tomada con el usuario).
 */
export function computeSkillMatch(
  requiredRaw: string | null | undefined,
  candidateSkills: Array<{ normalizedName: string; level: string }>,
): SkillMatchResult {
  const required = parseSkillsRequired(requiredRaw);
  const candidateByName = new Map<string, SkillLevel | null>(
    candidateSkills.map((s) => [s.normalizedName.toLowerCase(), parseLevel(s.level)]),
  );

  const breakdown: SkillMatchEntry[] = required.map((r) => {
    const candidateLevel = candidateByName.has(r.normalizedName) ? candidateByName.get(r.normalizedName)! : null;
    const present = candidateByName.has(r.normalizedName);

    let status: SkillMatchEntry['status'];
    if (!present) {
      status = 'missing';
    } else if (r.requiredLevel && (!candidateLevel || LEVEL_RANK[candidateLevel] < LEVEL_RANK[r.requiredLevel])) {
      status = 'insufficient';
    } else {
      status = 'met';
    }

    return { name: r.name, requiredLevel: r.requiredLevel, candidateLevel, status };
  });

  const matchedCount = breakdown.filter((b) => b.status === 'met').length;
  const totalCount = breakdown.length;

  return {
    breakdown,
    matchedCount,
    totalCount,
    matchPercent: totalCount === 0 ? 100 : Math.round((matchedCount / totalCount) * 100),
    hasAnyMatch: totalCount === 0 || breakdown.some((b) => b.status !== 'missing'),
  };
}
