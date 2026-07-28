import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Aviso no bloqueante en el shell (candidato/empresa) cuando el correo de la
 * cuenta todavía no fue confirmado. Nunca impide usar la app — solo ofrece
 * reenviar el correo de verificación. No se muestra si no hay sesión, si ya
 * está verificado, o mientras el perfil todavía no cargó (evita un parpadeo
 * del aviso antes de que `currentUser()` tenga el dato real).
 */
@Component({
  selector: 'app-email-verification-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  template: `
    @if (auth.currentUser()?.emailVerified === false) {
      <div class="verify-banner">
        <mat-icon>mark_email_unread</mat-icon>
        <span>Todavía no confirmaste tu correo.</span>
        <button type="button" (click)="resend()" [disabled]="sending">
          {{ sending ? 'Enviando...' : 'Reenviar correo' }}
        </button>
      </div>
    }
  `,
  styles: [`
    .verify-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: var(--warning-soft);
      border-bottom: 1px solid var(--warning-border);
      font-size: 0.85rem;
      color: var(--warning-strong);
    }

    .verify-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .verify-banner span {
      flex: 1;
    }

    .verify-banner button {
      border: none;
      background: none;
      color: inherit;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 4px 6px;

      &:disabled {
        cursor: default;
        opacity: 0.6;
      }
    }
  `],
})
export class EmailVerificationBannerComponent {
  auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  sending = false;

  resend() {
    if (this.sending) return;
    this.sending = true;
    this.auth.resendVerification().subscribe({
      next: (res) => {
        this.sending = false;
        this.snackBar.open(res.message, 'Cerrar', { duration: 4000 });
      },
      error: (err) => {
        this.sending = false;
        this.snackBar.open(err.error?.message || 'No se pudo reenviar el correo', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
