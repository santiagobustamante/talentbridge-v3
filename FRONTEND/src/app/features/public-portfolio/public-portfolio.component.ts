import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PublicPortfolioService } from '../../core/services/public-portfolio.service';
import { Profile } from '../../core/auth/auth.models';
import { PortfolioContentComponent } from '../../shared/components/portfolio-content/portfolio-content.component';

/**
 * Portafolio público de un candidato (ruta "/portfolio/:slug").
 * Es la pantalla que ve cualquier visitante externo (sin sesión, ej. un
 * reclutador con el link compartido) para conocer el perfil profesional
 * completo de un candidato. El contenido visual real lo delega en
 * `PortfolioContentComponent`; este componente solo resuelve el slug de
 * la URL contra el backend y maneja el caso de perfil no encontrado.
 */
@Component({
  selector: 'app-public-portfolio',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatIconModule, PortfolioContentComponent],
  templateUrl: './public-portfolio.component.html',
  styleUrl: './public-portfolio.component.scss',
})
export class PublicPortfolioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PublicPortfolioService);
  private location = inject(Location);
  private router = inject(Router);

  profile: Profile | null = null;
  notFound = false;

  /**
   * Al cargar la ruta, toma el slug de la URL y busca el perfil público
   * asociado. Si el servicio falla (slug inexistente o perfil no publicado),
   * marca `notFound` para que la vista muestre el estado de error en vez
   * de quedarse cargando indefinidamente.
   */
  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.service.getBySlug(slug).subscribe({
        next: (p) => (this.profile = p),
        error: () => {
          this.profile = null;
          this.notFound = true;
        },
      });
    }
  }

  /**
   * Vuelve a la página anterior si el visitante llegó navegando dentro
   * de la app; si el portafolio fue abierto directo (ej. link compartido,
   * sin historial previo), lo manda a la landing en vez de dejarlo varado.
   */
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/']);
  }
}
