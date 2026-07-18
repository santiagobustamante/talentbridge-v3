import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { formatAppDate, AppDateFormat } from '../utils/format-date.util';

export type { AppDateFormat };

/**
 * Pipe compartido para mostrar fechas en templates (`{{ date | appDate:'long' }}`),
 * con formato consistente en toda la app en vez de que cada pantalla llame a
 * `formatDate`/`toLocaleDateString` a su manera. Usa el locale inyectado por
 * Angular (`LOCALE_ID`, es-CO) salvo que se sobrescriba. `pure: true` evita
 * recalcular el formato en cada change detection si el valor no cambió.
 */
@Pipe({ name: 'appDate', standalone: true, pure: true })
export class AppDatePipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  /** Convierte `value` al string formateado según `format` (ver `AppDateFormat`). */
  transform(value: string | Date | null | undefined, format: AppDateFormat = 'short'): string {
    return formatAppDate(value, format, this.locale);
  }
}
