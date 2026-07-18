import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz de la aplicación (standalone, sin NgModule). Su único rol
 * es renderizar el `<router-outlet>` para que Angular Router monte ahí el
 * componente correspondiente a la ruta activa (definidas en app.routes.ts).
 * Toda la UI real vive en los componentes cargados de forma lazy por el
 * router, no acá.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
