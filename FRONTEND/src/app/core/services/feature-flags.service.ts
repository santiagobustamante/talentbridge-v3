import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Feature flags (Fase 8 del panel admin) — endpoint accesible a cualquier
 * usuario autenticado (no solo ADMIN), ver `feature-flags.controller.ts`.
 * Se cargan una vez por sesión de pestaña y quedan en un signal para que
 * cualquier componente pueda leerlas de forma reactiva y sincrónica.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly api = environment.apiUrl;
  private readonly flags = signal<Record<string, boolean>>({});
  private loaded = false;

  constructor(private http: HttpClient) {}

  /** Llama una vez (típicamente desde el shell) para poblar el signal; no hace nada si ya se cargó. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<Record<string, boolean>>(`${this.api}/feature-flags`).subscribe({
      next: (data) => this.flags.set(data),
      error: () => {},
    });
  }

  /** Lee un flag — `true` por defecto si todavía no cargó o no existe (evita ocultar una función real por un fallo de red puntual). */
  isEnabled(key: string): boolean {
    const value = this.flags()[key];
    return value === undefined ? true : value;
  }
}
