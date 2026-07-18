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
import { normalizeEmail } from '../../shared/utils/normalize';
import { ButtonDirective } from '../../shared/components/button/button.directive';

/**
 * Formulario de registro para empresas (ruta "/company/register"). Crea
 * una cuenta empresarial (nombre, sector y ciudad opcionales, contraseña
 * con confirmación) y redirige al dashboard de empresa si el registro
 * es exitoso.
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

        <h1 class="auth-title">Registra tu empresa</h1>
        <p class="auth-subtitle">Crea tu cuenta empresarial y encuentra el talento que necesitas</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre de la empresa</mat-label>
            <input matInput formControlName="companyName" autocomplete="organization" placeholder="Ej. Tech Solutions S.A." />
            <mat-error *ngIf="form.get('companyName')?.hasError('required')">Requerido</mat-error>
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

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Ciudad</mat-label>
            <input matInput formControlName="city" autocomplete="address-level2" placeholder="Ej. Bogotá, Colombia" />
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
            <span class="btn-content" *ngIf="!loading">Registrar empresa</span>
            <span class="btn-content" *ngIf="loading">Creando cuenta...</span>
          </button>
        </form>

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
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = false;
  form = this.fb.group(
    {
      companyName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      sector: [''],
      city: [''],
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

  /** Envía el registro de empresa al backend (email normalizado) y redirige al dashboard si tiene éxito. */
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
        next: () => this.router.navigate(['/company/dashboard']),
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.message || 'Error al registrar empresa', 'Cerrar', { duration: 5000 });
        },
      });
  }
}
