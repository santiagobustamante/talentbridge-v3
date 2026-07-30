import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
 * Login del panel de administración — ruta separada ("/admin/login") de
 * candidato/empresa a propósito: menor superficie de descubrimiento para el
 * login más sensible del sistema. No tiene enlace de registro (no existe
 * registro público para ADMIN) ni de recuperación de contraseña todavía.
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatIconModule,
    ButtonDirective,
  ],
  styleUrl: '../auth/login.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <mat-icon>admin_panel_settings</mat-icon>
          </div>
          <p class="brand-name">TalentBridge Admin</p>
        </div>

        <h1 class="auth-title">Panel de administración</h1>
        <p class="auth-subtitle">Acceso restringido</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" placeholder="admin@talentbridge.com" />
            <mat-error *ngIf="form.get('email')?.hasError('email')">Correo no válido</mat-error>
            <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••" />
            <mat-error *ngIf="form.get('password')?.hasError('required')">Requerida</mat-error>
          </mat-form-field>

          <div class="auth-progress" *ngIf="loading">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          </div>

          <button
            appButton="primary"
            size="lg"
            type="submit"
            [disabled]="form.invalid || loading"
            class="full-width">
            <span class="btn-content" *ngIf="!loading">Iniciar sesión</span>
            <span class="btn-content" *ngIf="loading">Iniciando sesión...</span>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const email = normalizeEmail(this.form.value.email!);
    const password = this.form.value.password!;
    this.auth.loginAdmin(email, password).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Error al iniciar sesión', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
