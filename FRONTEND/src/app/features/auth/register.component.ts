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
import { notBlank } from '../../shared/utils/validators/not-blank.validator';

/**
 * Formulario de registro para candidatos (ruta "/register"). Crea una
 * cuenta nueva con email + contraseña (con confirmación de contraseña). La
 * cuenta no queda utilizable hasta confirmar el correo (verificación
 * bloqueante) — al tener éxito, en vez de entrar directo a la app, esta
 * pantalla muestra un aviso de "revisa tu correo" con opción de reenviarlo.
 * Ofrece enlace cruzado hacia el registro de empresa.
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

        @if (registeredEmail) {
          <div class="auth-sent">
            <mat-icon class="sent-icon">mark_email_read</mat-icon>
            <p>Te enviamos un correo a <strong>{{ registeredEmail }}</strong> para confirmar tu cuenta. Tienes que confirmarlo antes de poder iniciar sesión.</p>
            <button
              appButton="secondary"
              size="lg"
              type="button"
              [disabled]="resending"
              (click)="resend()">
              {{ resending ? 'Reenviando...' : 'Reenviar correo' }}
            </button>
          </div>
        } @else {
          <h1 class="auth-title">Crea tu portafolio profesional</h1>
          <p class="auth-subtitle">Comienza a construir tu portafolio profesional</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre completo</mat-label>
              <input matInput formControlName="fullName" autocomplete="name" placeholder="Ej. María García López" />
              <mat-error *ngIf="form.get('fullName')?.hasError('required')">Requerido</mat-error>
              <mat-error *ngIf="form.get('fullName')?.hasError('notBlank')">No puede ser solo espacios</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com" />
              <mat-error *ngIf="form.get('email')?.hasError('email')">Correo no válido</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres, con letra y número" />
              <mat-error *ngIf="form.get('password')?.hasError('minlength')">Mínimo 8 caracteres</mat-error>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Requerida</mat-error>
              <mat-error *ngIf="form.get('password')?.hasError('pattern')">Debe incluir al menos una letra y un número</mat-error>
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
        }

        <p class="auth-alt">
          ¿Ya tienes cuenta?
          <a routerLink="/login">Iniciar Sesión</a>
        </p>

        @if (!registeredEmail) {
          <p class="auth-alt">
            ¿Eres empresa?
            <a routerLink="/company/register">Registrar empresa</a>
          </p>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = false;
  resending = false;
  registeredEmail = '';
  form = this.fb.group(
    {
      fullName: ['', [Validators.required, notBlank]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/(?=.*[A-Za-z])(?=.*\d)/)]],
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

  /** Envía el registro al backend (email normalizado) y, si tiene éxito, muestra el aviso de confirmación en vez de entrar a la app. */
  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { fullName, email, password, confirmPassword } = this.form.value;
    this.auth.register(fullName!, normalizeEmail(email!), password!, confirmPassword!).subscribe({
      next: (res) => {
        this.loading = false;
        this.registeredEmail = res.email;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Error al registrarse', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /** Reenvía el correo de confirmación a la cuenta recién creada. */
  resend() {
    if (this.resending || !this.registeredEmail) return;
    this.resending = true;
    this.auth.resendVerification(this.registeredEmail).subscribe({
      next: (res) => {
        this.resending = false;
        this.snackBar.open(res.message, 'Cerrar', { duration: 5000 });
      },
      error: (err) => {
        this.resending = false;
        this.snackBar.open(err.error?.message || 'No se pudo reenviar el correo', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
