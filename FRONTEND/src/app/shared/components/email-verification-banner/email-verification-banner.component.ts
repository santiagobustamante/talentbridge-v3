import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Aviso en el shell (candidato/empresa) cuando el correo de la cuenta
 * todavía no fue confirmado. Desde el cambio a verificación bloqueante,
 * esto ya no debería ser alcanzable para una sesión nueva (login la
 * rechaza hasta confirmar el correo) — se mantiene como red de seguridad
 * para sesiones que ya estaban activas de antes de ese cambio. No se
 * muestra si no hay sesión, si ya está verificado, o mientras el perfil
 * todavía no cargó (evita un parpadeo del aviso antes de que
 * `currentUser()` tenga el dato real).
 *
 * `currentUser()` se carga una sola vez al arrancar la app (APP_INITIALIZER)
 * y no se refresca solo — si la cuenta se verifica por otra vía mientras la
 * pestaña sigue abierta (ej. el backfill de una cuenta vieja, o el usuario
 * confirma el correo en OTRA pestaña), el aviso se queda mostrando el dato
 * viejo indefinidamente hasta recargar. Por eso, al montar el banner, se
 * refresca `currentUser()` contra `/auth/me` una vez — así el aviso nunca
 * queda mintiendo sobre una cuenta que en realidad ya está verificada.
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
export class EmailVerificationBannerComponent implements OnInit {
  auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  sending = false;

  ngOnInit(): void {
    if (this.auth.currentUser()?.emailVerified === false) {
      this.auth.fetchMe().subscribe({ error: () => {} });
    }
  }

  resend() {
    const email = this.auth.currentUser()?.email;
    if (this.sending || !email) return;
    this.sending = true;
    this.auth.resendVerification(email).subscribe({
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
