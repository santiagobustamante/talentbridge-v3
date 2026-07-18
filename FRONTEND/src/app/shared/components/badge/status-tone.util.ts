import { BadgeTone } from './badge.component';

/**
 * Mapea los 9 valores de JobOfferStatus/JobApplicationStatus al tono de Badge
 * que ya usaban en la práctica (ver tabla en docs/plan-consistencia-css.md, Fase 2.2).
 * Evita repetir el mismo mapping status->color en cada componente que lista
 * ofertas o postulaciones.
 */
const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: 'neutral',
  ARCHIVED: 'neutral',
  PUBLISHED: 'success',
  PRESELECTED: 'success',
  HIRED: 'success',
  CLOSED: 'warning',
  REJECTED: 'danger',
  PENDING: 'info',
  REVIEWED: 'info',
};

/**
 * Devuelve el tono de `BadgeComponent` correspondiente a un status del backend.
 * Si el status no está en el mapa (valor inesperado o nuevo), cae a 'neutral'
 * en vez de romper la UI.
 */
export function statusToTone(status: string): BadgeTone {
  return STATUS_TONE[status] ?? 'neutral';
}
