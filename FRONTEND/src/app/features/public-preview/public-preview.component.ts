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

  get publicUrl(): string {
    return this.profile?.slug ? `${window.location.origin}/portfolio/${this.profile.slug}` : '';
  }

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

  openPublicLink(): void {
    if (!this.profile?.slug) {
      this.snackBar.open('Primero configura tu URL pública desde Perfil.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.router.navigate(['/portfolio', this.profile.slug]);
  }
}
