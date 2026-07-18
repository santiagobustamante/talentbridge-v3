import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Landing page pública de TalentBridge (ruta "/").
 * No requiere sesión: es la primera pantalla que ve cualquier visitante
 * (candidato o empresa) antes de registrarse o iniciar sesión.
 * Combina navegación por anclas (scroll suave a secciones) con una barra
 * de búsqueda que redirige al login de empresa como llamado a la acción.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule, ReactiveFormsModule],
  styleUrl: './home.component.scss',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private router = inject(Router);

  searchCtrl = new FormControl('');

  /**
   * Hace scroll suave hasta la sección indicada por su id de DOM.
   * Se usa en los links del menú de la landing (ej. "Cómo funciona", "Precios")
   * para navegar dentro de la misma página sin recargar.
   */
  scrollToSection(sectionId: string, event?: Event): void {
    event?.preventDefault();

    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  /**
   * Maneja el submit del buscador de la landing. Si el visitante escribió
   * un término de búsqueda, lo pasa como query param al login de empresa
   * (para precargar/filtrar); si no escribió nada, igual redirige al login.
   */
  onSearch(): void {
    const q = this.searchCtrl.value?.trim();
    if (q) {
      this.router.navigate(['/company/login'], { queryParams: { q } });
    } else {
      this.router.navigate(['/company/login']);
    }
  }
}
