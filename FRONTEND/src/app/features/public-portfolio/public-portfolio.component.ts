import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PublicPortfolioService } from '../../core/services/public-portfolio.service';
import { Profile } from '../../core/auth/auth.models';
import { PortfolioContentComponent } from '../../shared/components/portfolio-content/portfolio-content.component';

const DEFAULT_TITLE = 'TalentBridge - Portafolio Profesional';
const DEFAULT_DESCRIPTION =
  'TalentBridge conecta candidatos y empresas a través de portafolios profesionales verificados.';

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
export class PublicPortfolioComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private service = inject(PublicPortfolioService);
  private location = inject(Location);
  private router = inject(Router);
  private titleService = inject(Title);
  private meta = inject(Meta);

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
        next: (p) => {
          this.profile = p;
          this.updateMetaTags(p);
        },
        error: () => {
          this.profile = null;
          this.notFound = true;
        },
      });
    }
  }

  /**
   * Actualiza el <title> y las meta tags (descripción + Open Graph/Twitter
   * Card) con los datos del perfil, para que el portafolio se identifique
   * correctamente al compartirlo (pestaña del navegador, indexación) y no
   * quede con el título/descripción genérico de toda la app.
   * Nota: como el sitio no usa server-side rendering, esto no genera preview
   * enriquecido en apps de mensajería (WhatsApp/Facebook/etc, que no
   * ejecutan JS al leer el link) — sí ayuda a buscadores que sí renderizan
   * JS (Google) y al título mostrado en la pestaña/resultados de búsqueda.
   */
  private updateMetaTags(profile: Profile): void {
    const name = profile.fullName || 'Perfil profesional';
    const role = profile.professionalTitle ? ` — ${profile.professionalTitle}` : '';
    const title = `${name}${role} | TalentBridge`;
    const description = (profile.summary || DEFAULT_DESCRIPTION).slice(0, 160);
    const url = `${window.location.origin}/portfolio/${profile.slug}`;

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'profile' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (profile.photoUrl) {
      this.meta.updateTag({ property: 'og:image', content: profile.photoUrl });
      this.meta.updateTag({ name: 'twitter:image', content: profile.photoUrl });
    }
  }

  /** Restaura el título/descripción genéricos al salir, para no dejarlos pegados en otra pantalla. */
  ngOnDestroy(): void {
    this.titleService.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
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
