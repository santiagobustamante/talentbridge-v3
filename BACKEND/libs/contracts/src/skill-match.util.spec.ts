import { computeSkillMatch, parseSkillsRequired, stringifySkillsRequired } from './skill-match.util';

describe('parseSkillsRequired', () => {
  it('parsea nombres simples sin nivel', () => {
    expect(parseSkillsRequired('Angular, PostgreSQL')).toEqual([
      { name: 'Angular', normalizedName: 'angular', requiredLevel: null },
      { name: 'PostgreSQL', normalizedName: 'postgresql', requiredLevel: null },
    ]);
  });

  it('parsea la convención opcional "Nombre:NIVEL"', () => {
    expect(parseSkillsRequired('Angular:ADVANCED, PostgreSQL')).toEqual([
      { name: 'Angular', normalizedName: 'angular', requiredLevel: 'ADVANCED' },
      { name: 'PostgreSQL', normalizedName: 'postgresql', requiredLevel: null },
    ]);
  });

  it('ignora un nivel que no es uno de los 4 válidos (queda null, no rompe)', () => {
    expect(parseSkillsRequired('Angular:INVENTADO')).toEqual([
      { name: 'Angular', normalizedName: 'angular', requiredLevel: null },
    ]);
  });

  it('devuelve lista vacía para input vacío, null o undefined', () => {
    expect(parseSkillsRequired('')).toEqual([]);
    expect(parseSkillsRequired(null)).toEqual([]);
    expect(parseSkillsRequired(undefined)).toEqual([]);
  });

  it('descarta entradas vacías generadas por comas de más', () => {
    expect(parseSkillsRequired('Angular,, PostgreSQL,')).toHaveLength(2);
  });
});

describe('stringifySkillsRequired', () => {
  it('serializa con nivel cuando está presente', () => {
    expect(stringifySkillsRequired([{ name: 'Angular', requiredLevel: 'ADVANCED' }])).toBe('Angular:ADVANCED');
  });

  it('serializa sin ":" cuando no hay nivel', () => {
    expect(stringifySkillsRequired([{ name: 'Angular', requiredLevel: null }])).toBe('Angular');
  });

  it('es el inverso de parseSkillsRequired para el caso mixto', () => {
    const original = 'Angular:ADVANCED,PostgreSQL';
    const parsed = parseSkillsRequired(original);
    expect(stringifySkillsRequired(parsed)).toBe(original);
  });
});

describe('computeSkillMatch', () => {
  it('sin habilidades requeridas, matchPercent es 100 y hasAnyMatch true (oferta sin requisitos no bloquea a nadie)', () => {
    const result = computeSkillMatch(null, []);
    expect(result.matchPercent).toBe(100);
    expect(result.hasAnyMatch).toBe(true);
    expect(result.totalCount).toBe(0);
  });

  it('marca "missing" una habilidad que el candidato no tiene', () => {
    const result = computeSkillMatch('Angular', []);
    expect(result.breakdown[0].status).toBe('missing');
    expect(result.matchPercent).toBe(0);
    expect(result.hasAnyMatch).toBe(false);
  });

  it('marca "met" cuando la oferta no pide nivel y el candidato tiene la habilidad en cualquier nivel', () => {
    const result = computeSkillMatch('Angular', [{ normalizedName: 'angular', level: 'BASIC' }]);
    expect(result.breakdown[0].status).toBe('met');
    expect(result.matchPercent).toBe(100);
  });

  it('marca "insufficient" cuando el candidato tiene la habilidad pero en un nivel más bajo que el requerido', () => {
    const result = computeSkillMatch('Angular:ADVANCED', [{ normalizedName: 'angular', level: 'BASIC' }]);
    expect(result.breakdown[0].status).toBe('insufficient');
    expect(result.matchPercent).toBe(0);
    // hasAnyMatch mira presencia, no nivel — sigue pudiendo postularse aunque el nivel no alcance.
    expect(result.hasAnyMatch).toBe(true);
  });

  it('marca "met" cuando el nivel del candidato es igual o mayor al requerido', () => {
    const result = computeSkillMatch('Angular:INTERMEDIATE', [{ normalizedName: 'angular', level: 'EXPERT' }]);
    expect(result.breakdown[0].status).toBe('met');
  });

  it('el matching de nombre no distingue mayúsculas/minúsculas', () => {
    const result = computeSkillMatch('Angular', [{ normalizedName: 'ANGULAR', level: 'BASIC' }]);
    expect(result.breakdown[0].status).toBe('met');
  });

  it('calcula matchPercent redondeado sobre múltiples habilidades mixtas', () => {
    const result = computeSkillMatch('Angular,PostgreSQL,Docker', [
      { normalizedName: 'angular', level: 'BASIC' },
      { normalizedName: 'postgresql', level: 'BASIC' },
    ]);
    // 2 de 3 -> 66.67% redondeado a 67
    expect(result.matchedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.matchPercent).toBe(67);
    expect(result.hasAnyMatch).toBe(true);
  });
});
