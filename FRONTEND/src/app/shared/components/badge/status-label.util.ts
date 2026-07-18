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

/**
 * Traduce un status del backend (en inglés/mayúsculas, ej. "PUBLISHED") a su
 * etiqueta en español para mostrar en la UI. Si el status no está mapeado,
 * devuelve el valor original tal cual en vez de esconder el dato.
 */
export function statusToLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
