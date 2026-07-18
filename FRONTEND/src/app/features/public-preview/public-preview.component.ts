import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../core/auth/auth.models';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { PortfolioContentComponent } from '../../shared/components/portfolio-content/portfolio-content.component';

/**
 * Pantalla de previsualización del propio portafolio (dentro del shell
 * de candidato autenticado, ruta "/app/public-view"). Le muestra al
 * candidato cómo se ve su portafolio público antes de compartirlo, y le
 * da accesos rápidos para copiar o abrir el link público (`/portfolio/:slug`).
 * Reutiliza el mismo `PortfolioContentComponent` que usa la vista pública real.
 */
@Component({
  selector: 'app-public-preview',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatSnackBarModule, ButtonDirective, PortfolioContentComponent],
  templateUrl: './public-preview.component.html',
  styleUrl: './public-preview.component.scss',
})
export class PublicPreviewComponent implements OnInit {
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);
  private router = inject(Router);

  profile: Profile | null = null;
  loading = true;
  loadError: string | null = null;
  copied = false;

  /** Carga el perfil del candidato autenticado para renderizar la previsualización. */
  ngOnInit(): void {
    this.profileService.getProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.message || err?.message || 'No se pudo cargar el perfil';
      },
    });
  }

  /** Arma la URL pública absoluta del portafolio a partir del slug configurado en Perfil. */
  get publicUrl(): string {
    return this.profile?.slug ? `${window.location.origin}/portfolio/${this.profile.slug}` : '';
  }

  /**
   * Copia el link público al portapapeles. Si el candidato todavía no
   * configuró su slug en la sección Perfil, en vez de copiar un link
   * inválido lo guía hacia allá con una acción en el snackbar.
   */
  copyPublicLink(): void {
    if (!this.publicUrl) {
      this.snackBar.open('Primero configura tu URL pública desde Perfil.', 'Ir a Perfil', { duration: 5000 })
        .onAction().subscribe(() => window.location.href = '/app/profile');
      return;
    }
    this.clipboard.copy(this.publicUrl);
    this.copied = true;
    this.snackBar.open('Enlace copiado al portapapeles', 'Cerrar', { duration: 2000 });
    setTimeout(() => (this.copied = false), 2500);
  }

  /** Abre el portafolio público real en la misma pestaña, si ya tiene slug configurado. */
  openPublicLink(): void {
    if (!this.profile?.slug) {
      this.snackBar.open('Primero configura tu URL pública desde Perfil.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.router.navigate(['/portfolio', this.profile.slug]);
  }
}
