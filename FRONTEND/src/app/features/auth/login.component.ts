import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
  styleUrl: './login.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <span class="brand-letters">PI</span>
          </div>
          <p class="brand-name">Portafolio Inteligente</p>
        </div>

        <h1 class="auth-title">Ingresa a tu portafolio profesional</h1>
        <p class="auth-subtitle">Accede a tu cuenta para continuar</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com" />
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
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || loading"
            class="full-width submit-btn">
            <span class="btn-content" *ngIf="!loading">Iniciar Sesión</span>
            <span class="btn-content" *ngIf="loading">Iniciando sesión...</span>
          </button>
        </form>

        <p class="auth-alt">
          ¿No tienes cuenta?
          <a routerLink="/register">Registrarse</a>
        </p>

        <p class="auth-alt">
          ¿Eres empresa?
          <a routerLink="/company/login">Ingresa aquí</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
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
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/app/inicio']),
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Error al iniciar sesión', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
