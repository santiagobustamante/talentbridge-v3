import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';

/**
 * Autenticación en dos pasos (2FA) para la propia cuenta ADMIN (Fase 17).
 * TOTP estándar (Google Authenticator, Authy, etc.) — sin QR todavía, el
 * secreto se muestra en texto para carga manual (ver nota en
 * docs/plan-panel-administrativo.md, Fase 17: agregar QR es un paso
 * separado, no bloqueante). Sin códigos de respaldo — si se pierde el
 * dispositivo, hay que desactivar 2FA a mano contra la base (documentado
 * como limitación conocida, no un olvido).
 */
@Component({
  selector: 'app-admin-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule, CardComponent, BadgeComponent, ButtonDirective],
  template: `
    <div class="admin-security">
      <h1>Seguridad</h1>
      <p class="subtitle">Verificación en dos pasos (2FA) para tu propia cuenta de administrador.</p>

      <app-card variant="elevated" padding="md">
        @if (enabled) {
          <div class="status-row">
            <app-badge tone="success">Activado</app-badge>
            <span>Tu cuenta pide un código de 6 dígitos además de la contraseña al iniciar sesión.</span>
          </div>

          @if (!disabling) {
            <button appButton="secondary" size="sm" (click)="disabling = true">Desactivar 2FA</button>
          } @else {
            <form [formGroup]="disableForm" (ngSubmit)="confirmDisable()" class="code-form">
              <p>Ingresá tu código actual para confirmar la desactivación.</p>
              <input type="text" inputmode="numeric" maxlength="6" formControlName="code" placeholder="000000" />
              <div class="code-actions">
                <button appButton="danger" size="sm" type="submit" [disabled]="disableForm.invalid || saving">Confirmar</button>
                <button appButton="ghost" size="sm" type="button" (click)="disabling = false">Cancelar</button>
              </div>
            </form>
          }
        } @else if (!setupData) {
          <div class="status-row">
            <app-badge tone="neutral">Desactivado</app-badge>
            <span>Cualquiera con tu contraseña puede entrar al panel. Activar 2FA agrega una segunda capa.</span>
          </div>
          <button appButton="primary" size="sm" (click)="startSetup()" [disabled]="saving">Activar 2FA</button>
        } @else {
          <div class="setup-flow">
            <p>1. Agregá esta cuenta a tu app autenticadora (Google Authenticator, Authy, etc.) con este código:</p>
            <code class="secret-code">{{ setupData.secret }}</code>
            <p>2. Ingresá el código de 6 dígitos que te muestra la app para confirmar:</p>
            <form [formGroup]="confirmForm" (ngSubmit)="confirmSetup()" class="code-form">
              <input type="text" inputmode="numeric" maxlength="6" formControlName="code" placeholder="000000" />
              <div class="code-actions">
                <button appButton="primary" size="sm" type="submit" [disabled]="confirmForm.invalid || saving">Confirmar y activar</button>
                <button appButton="ghost" size="sm" type="button" (click)="cancelSetup()">Cancelar</button>
              </div>
            </form>
          </div>
        }
      </app-card>
    </div>
  `,
  styles: [`
    .admin-security { padding: 24px; max-width: 640px; }
    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { margin: 0 0 24px; color: var(--text-secondary); }
    .status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .status-row span { color: var(--text-secondary); font-size: 0.9rem; }
    .setup-flow p { margin: 0 0 8px; font-size: 0.9rem; }
    .secret-code { display: block; margin: 0 0 16px; padding: 10px 12px; background: var(--bg-subtle, #f3f4f6); border-radius: 8px; font-size: 1rem; letter-spacing: 1px; word-break: break-all; }
    .code-form { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; max-width: 220px; }
    .code-form input { padding: 8px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px; font-size: 1.1rem; letter-spacing: 3px; text-align: center; }
    .code-actions { display: flex; gap: 8px; }
  `],
})
export class AdminSecurityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  enabled = false;
  saving = false;
  disabling = false;
  setupData: { secret: string; otpauthUrl: string } | null = null;

  confirmForm = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  disableForm = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });

  ngOnInit(): void {
    this.enabled = !!this.auth.currentUser()?.twoFactorEnabled;
  }

  startSetup() {
    this.saving = true;
    this.auth.setupTwoFactor().subscribe({
      next: (data) => { this.setupData = data; this.saving = false; },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'No se pudo generar el secreto', 'Cerrar', { duration: 4000 });
      },
    });
  }

  confirmSetup() {
    if (this.confirmForm.invalid) return;
    this.saving = true;
    this.auth.confirmTwoFactorSetup(this.confirmForm.value.code!).subscribe({
      next: () => {
        this.saving = false;
        this.enabled = true;
        this.setupData = null;
        this.confirmForm.reset();
        this.snackBar.open('2FA activado', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Código incorrecto', 'Cerrar', { duration: 4000 });
      },
    });
  }

  cancelSetup() {
    this.setupData = null;
    this.confirmForm.reset();
  }

  confirmDisable() {
    if (this.disableForm.invalid) return;
    this.saving = true;
    this.auth.disableTwoFactor(this.disableForm.value.code!).subscribe({
      next: () => {
        this.saving = false;
        this.enabled = false;
        this.disabling = false;
        this.disableForm.reset();
        this.snackBar.open('2FA desactivado', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Código incorrecto', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
