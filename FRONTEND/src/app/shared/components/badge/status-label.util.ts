/**
 * Traduce los 9 valores de JobOfferStatus/JobApplicationStatus a su texto en
 * español. Complementa a statusToTone (que resuelve el color) — evita repetir
 * el mismo mapping status->texto en cada componente que lista ofertas o
 * postulaciones.
 */
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  CLOSED: 'Cerrada',
  ARCHIVED: 'Archivada',
  PENDING: 'Pendiente',
  REVIEWED: 'Revisado',
  PRESELECTED: 'Preseleccionado',
  REJECTED: 'Rechazado',
  HIRED: 'Contratado',
};

export function statusToLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
