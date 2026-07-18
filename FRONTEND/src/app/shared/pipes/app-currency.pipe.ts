import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrencyDisplay, formatNumberDisplay } from '../utils/normalize';

/**
 * Reemplaza los `toLocaleString()` sueltos que había repartidos por pantallas de
 * ofertas laborales — un solo lugar para el formato de moneda ("$2.500.000").
 * `symbol: false` da solo el número con separador de miles, sin el símbolo de moneda.
 */
@Pipe({ name: 'appCurrency', standalone: true, pure: true })
export class AppCurrencyPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    currency = 'COP',
    locale = 'es-CO',
    symbol: boolean = true,
  ): string {
    return symbol
      ? formatCurrencyDisplay(value, currency, locale)
      : formatNumberDisplay(value, locale);
  }
}
