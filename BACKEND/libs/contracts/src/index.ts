export interface ServiceHealth {
  service: string;
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  statusCode: number;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export {
  parseSkillsRequired,
  stringifySkillsRequired,
  computeSkillMatch,
  type SkillLevel,
  type RequiredSkill,
  type SkillMatchEntry,
  type SkillMatchResult,
} from './skill-match.util';
