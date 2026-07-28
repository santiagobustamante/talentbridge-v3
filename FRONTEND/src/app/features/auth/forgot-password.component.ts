import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { normalizeEmail } from '../../shared/utils/normalize';

/**
 * Pide el correo para enviar un enlace de recuperación de contraseña (ruta
 * "/forgot-password"). El backend responde siempre el mismo mensaje
 * genérico, exista o no la cuenta — este formulario nunca revela si un
 * correo está registrado.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatIconModule,
    ButtonDirective,
  ],
  styleUrl: './forgot-password.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <mat-icon>work</mat-icon>
          </div>
          <p class="brand-name">TalentBridge</p>
        </div>

        @if (!sent) {
          <h1 class="auth-title">Recuperar contraseña</h1>
          <p class="auth-subtitle">Te enviamos un enlace a tu correo para elegir una nueva contraseña</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com" />
              <mat-error *ngIf="form.get('email')?.hasError('email')">Correo no válido</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
            </mat-form-field>

            <div class="auth-progress" *ngIf="loading">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            </div>

            <button appButton="primary" size="lg" type="submit" [disabled]="form.invalid || loading" class="full-width">
              <span class="btn-content" *ngIf="!loading">Enviar enlace</span>
              <span class="btn-content" *ngIf="loading">Enviando...</span>
            </button>
          </form>
        } @else {
          <div class="auth-sent">
            <mat-icon class="sent-icon">mark_email_read</mat-icon>
            <p>{{ sentMessage }}</p>
          </div>
        }

        <p class="auth-alt">
          <a routerLink="/login">Volver a iniciar sesión</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = false;
  sent = false;
  sentMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const email = normalizeEmail(this.form.value.email!);
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading = false;
        this.sent = true;
        this.sentMessage = res.message;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Error al solicitar el enlace', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
