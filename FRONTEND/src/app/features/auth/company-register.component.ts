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
import { normalizeEmail } from '../../shared/utils/normalize';
import { notBlank } from '../../shared/utils/validators/not-blank.validator';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DepartamentoCiudadInputComponent } from '../../shared/components/departamento-ciudad-input/departamento-ciudad-input.component';

/**
 * Formulario de registro para empresas (ruta "/company/register"). Crea
 * una cuenta empresarial (nombre, sector y ciudad opcionales, contraseña
 * con confirmación). La cuenta no queda utilizable hasta confirmar el
 * correo (verificación bloqueante) — al tener éxito, muestra un aviso de
 * "revisa tu correo" con opción de reenviarlo, en vez de entrar directo.
 */
@Component({
  selector: 'app-company-register',
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
    DepartamentoCiudadInputComponent,
  ],
  styleUrl: './company-register.component.scss',
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
          <h1 class="auth-title">Registra tu empresa</h1>
          <p class="auth-subtitle">Crea tu cuenta empresarial y encuentra el talento que necesitas</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre de la empresa</mat-label>
              <input matInput formControlName="companyName" autocomplete="organization" placeholder="Ej. Tech Solutions S.A." />
              <mat-error *ngIf="form.get('companyName')?.hasError('required')">Requerido</mat-error>
              <mat-error *ngIf="form.get('companyName')?.hasError('notBlank')">No puede ser solo espacios</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" placeholder="tu@empresa.com" />
              <mat-error *ngIf="form.get('email')?.hasError('email')">Correo no válido</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Sector</mat-label>
              <input matInput formControlName="sector" placeholder="Ej. Tecnología, Salud, Educación" />
            </mat-form-field>

            <div class="full-width municipio-field">
              <app-departamento-ciudad-input [value]="form.value.city ?? null" (valueChange)="form.patchValue({ city: $event })" />
            </div>

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
              <span class="btn-content" *ngIf="!loading">Registrar empresa</span>
              <span class="btn-content" *ngIf="loading">Creando cuenta...</span>
            </button>
          </form>
        }

        <p class="auth-alt">
          ¿Eres candidato?
          <a routerLink="/register">Registrarse como candidato</a>
        </p>

        <p class="auth-alt">
          ¿Ya tienes cuenta?
          <a routerLink="/company/login">Iniciar Sesión</a>
        </p>
      </div>
    </div>
  `,
})
export class CompanyRegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = false;
  resending = false;
  registeredEmail = '';
  form = this.fb.group(
    {
      companyName: ['', [Validators.required, notBlank]],
      email: ['', [Validators.required, Validators.email]],
      sector: [''],
      city: [''],
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

  /** Envía el registro de empresa al backend (email normalizado) y, si tiene éxito, muestra el aviso de confirmación en vez de entrar a la app. */
  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password, confirmPassword, companyName, sector, city } = this.form.value;
    this.auth
      .registerCompany(
        normalizeEmail(email!),
        password!,
        confirmPassword!,
        companyName!,
        sector || undefined,
        city || undefined,
      )
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.registeredEmail = res.email;
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.message || 'Error al registrar empresa', 'Cerrar', { duration: 5000 });
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
