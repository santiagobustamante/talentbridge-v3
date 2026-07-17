import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { formatAppDate, AppDateFormat } from '../utils/format-date.util';

export type { AppDateFormat };

@Pipe({ name: 'appDate', standalone: true, pure: true })
export class AppDatePipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  transform(value: string | Date | null | undefined, format: AppDateFormat = 'short'): string {
    return formatAppDate(value, format, this.locale);
  }
}
