import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Confirma el correo de un usuario recién registrado (ruta
 * "/verify-email?token=..."). Llama al backend apenas carga, sin acción del
 * usuario — la verificación nunca es obligatoria para usar la cuenta, así
 * que esta pantalla es solo informativa (éxito, error, o link inválido).
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatProgressBarModule, MatIconModule],
  styleUrl: './verify-email.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <mat-icon>work</mat-icon>
          </div>
          <p class="brand-name">TalentBridge</p>
        </div>

        @if (state === 'loading') {
          <div class="auth-sent">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <p>Confirmando tu correo...</p>
          </div>
        } @else if (state === 'success') {
          <div class="auth-sent">
            <mat-icon class="sent-icon">check_circle</mat-icon>
            <p>{{ message }}</p>
          </div>
        } @else {
          <div class="auth-sent">
            <mat-icon class="sent-icon warn">error_outline</mat-icon>
            <p>{{ message }}</p>
          </div>
        }

        <p class="auth-alt"><a routerLink="/login">Iniciar sesión</a></p>
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  state: 'loading' | 'success' | 'error' = 'loading';
  message = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.message = 'Este enlace no es válido.';
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: (res) => {
        this.state = 'success';
        this.message = res.message;
      },
      error: (err) => {
        this.state = 'error';
        this.message = err.error?.message || 'No se pudo confirmar el correo.';
      },
    });
  }
}
