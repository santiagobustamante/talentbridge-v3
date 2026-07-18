import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
 * Formulario de registro para candidatos (ruta "/register"). Crea una
 * cuenta nueva con email + contraseña (con confirmación de contraseña) y,
 * si tiene éxito, redirige al home del candidato para empezar a armar el
 * perfil. Ofrece enlace cruzado hacia el registro de empresa.
 */
@Component({
  selector: 'app-register',
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
  styleUrl: './register.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <mat-icon>work</mat-icon>
          </div>
          <p class="brand-name">TalentBridge</p>
        </div>

        <h1 class="auth-title">Crea tu portafolio profesional</h1>
        <p class="auth-subtitle">Comienza a construir tu portafolio profesional</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com" />
            <mat-error *ngIf="form.get('email')?.hasError('email')">Correo no válido</mat-error>
            <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
            <mat-error *ngIf="form.get('password')?.hasError('minlength')">Mínimo 8 caracteres</mat-error>
            <mat-error *ngIf="form.get('password')?.hasError('required')">Requerida</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirmar Contraseña</mat-label>
            <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" placeholder="Repite tu contraseña" />
            <mat-error *ngIf="form.hasError('mismatch')">Las contraseñas no coinciden</mat-error>
            <mat-error *ngIf="form.get('confirmPassword')?.hasError('required')">Requerida</mat-error>
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
            <span class="btn-content" *ngIf="!loading">Registrarse</span>
            <span class="btn-content" *ngIf="loading">Creando cuenta...</span>
          </button>
        </form>

        <p class="auth-alt">
          ¿Ya tienes cuenta?
          <a routerLink="/login">Iniciar Sesión</a>
        </p>

        <p class="auth-alt">
          ¿Eres empresa?
          <a routerLink="/company/register">Registrar empresa</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = false;
  form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatch },
  );

  /** Validador a nivel de formulario: exige que contraseña y confirmación coincidan exactamente. */
  private passwordMatch(group: ReturnType<typeof this.fb.group>) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  /** Envía el registro al backend (email normalizado) y redirige al home del candidato si tiene éxito. */
  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password, confirmPassword } = this.form.value;
    this.auth.register(normalizeEmail(email!), password!, confirmPassword!).subscribe({
      next: () => this.router.navigate(['/app/inicio']),
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Error al registrarse', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
