import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface Municipio {
  codigoDivipola: string;
  nombre: string;
  departamentoCodigo: string;
  departamento: string;
  /** "Nombre, Departamento" — es el valor exacto que se guarda en `city` en el backend. */
  label: string;
}

export const REMOTE_LABEL = 'Remoto';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Catálogo de los 1.122 municipios de Colombia (DIVIPOLA/DANE), servido como
 * asset estático (`public/assets/data/municipios-colombia.json`, generado
 * junto con BACKEND/prisma/data/municipios-colombia.json — misma fuente, para
 * que frontend y backend nunca queden desincronizados). Se carga una sola vez
 * por sesión (`shareReplay`) y se busca en memoria — 1.122 filas no ameritan
 * ida y vuelta al backend por cada tecla escrita en el autocomplete.
 */
@Injectable({ providedIn: 'root' })
export class MunicipioCatalogService {
  private http = inject(HttpClient);
  private municipios$?: Observable<Municipio[]>;

  private load(): Observable<Municipio[]> {
    if (!this.municipios$) {
      this.municipios$ = this.http
        .get<Municipio[]>('/assets/data/municipios-colombia.json')
        .pipe(shareReplay(1));
    }
    return this.municipios$;
  }

  /** Lista completa (para armar el listado de departamentos u otros usos puntuales). */
  getAll(): Observable<Municipio[]> {
    return this.load();
  }

  /**
   * Filtra por substring del label, sin distinguir mayúsculas/tildes (para que
   * "bogota" o "Bogotá" encuentren lo mismo). Devuelve como mucho `limit`
   * resultados — con 1.122 filas no tiene sentido renderizar todas a la vez.
   */
  search(query: string, opts?: { allowRemote?: boolean; limit?: number }): Observable<(Municipio | { label: string; remote: true })[]> {
    const limit = opts?.limit ?? 30;
    const q = normalize(query.trim());
    return new Observable((subscriber) => {
      this.load().subscribe({
        next: (all) => {
          if (!q) {
            subscriber.next([]);
            subscriber.complete();
            return;
          }
          const results: (Municipio | { label: string; remote: true })[] = [];
          if (opts?.allowRemote && normalize(REMOTE_LABEL).includes(q)) {
            results.push({ label: REMOTE_LABEL, remote: true });
          }
          for (const m of all) {
            if (results.length >= limit) break;
            if (normalize(m.label).includes(q)) results.push(m);
          }
          subscriber.next(results);
          subscriber.complete();
        },
        error: (e) => subscriber.error(e),
      });
    });
  }

  /** Válido si es exactamente el label de un municipio real, o "Remoto" cuando se permite. */
  isValidLabel(label: string, opts?: { allowRemote?: boolean }): Observable<boolean> {
    if (opts?.allowRemote && label === REMOTE_LABEL) {
      return new Observable((s) => { s.next(true); s.complete(); });
    }
    return new Observable((subscriber) => {
      this.load().subscribe({
        next: (all) => { subscriber.next(all.some((m) => m.label === label)); subscriber.complete(); },
        error: (e) => subscriber.error(e),
      });
    });
  }
}
