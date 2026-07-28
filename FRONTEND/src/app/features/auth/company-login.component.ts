import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
 * Formulario de login para empresas (ruta "/company/login"). Autentica
 * contra el backend y redirige al dashboard de empresa; si el visitante
 * llegó desde la landing con un término de búsqueda (query param "q",
 * ver `HomeComponent.onSearch`), lo manda directo a Candidatos con esa
 * búsqueda ya aplicada en vez de al dashboard.
 */
@Component({
  selector: 'app-company-login',
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
  styleUrl: './company-login.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <mat-icon>work</mat-icon>
          </div>
          <p class="brand-name">TalentBridge</p>
        </div>

        <h1 class="auth-title">Acceso para empresas</h1>
        <p class="auth-subtitle">Encuentra talento profesional filtrando por habilidades, profesi&oacute;n y ubicaci&oacute;n.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" placeholder="tu@empresa.com" />
            <mat-error *ngIf="form.get('email')?.hasError('email')">Correo no válido</mat-error>
            <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••" />
            <mat-error *ngIf="form.get('password')?.hasError('required')">Requerida</mat-error>
          </mat-form-field>

          <p class="auth-forgot"><a routerLink="/forgot-password">¿Olvidaste tu contraseña?</a></p>

          <div class="auth-progress" *ngIf="loading">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          </div>

          <button
            appButton="primary"
            size="lg"
            type="submit"
            [disabled]="form.invalid || loading"
            class="full-width">
            <span class="btn-content" *ngIf="!loading">Iniciar Sesión</span>
            <span class="btn-content" *ngIf="loading">Iniciando sesión...</span>
          </button>
        </form>

        <p class="auth-alt">
          ¿Eres candidato?
          <a routerLink="/login">Ingresa aquí</a>
        </p>

        <p class="auth-alt">
          ¿No tienes cuenta de empresa?
          <a routerLink="/company/register">Registrar empresa</a>
        </p>
      </div>
    </div>
  `,
})
export class CompanyLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /**
   * Autentica a la empresa y decide a dónde redirigir: si venía con una
   * búsqueda pendiente desde la landing (query param "q") va a Candidatos
   * con esa búsqueda precargada; si no, al dashboard normal. Si el rechazo
   * es por correo sin confirmar (verificación bloqueante), ofrece reenviar
   * el correo desde el mismo snackbar en vez del mensaje de error genérico.
   */
  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const email = normalizeEmail(this.form.value.email!);
    const password = this.form.value.password!;
    this.auth.loginCompany(email, password).subscribe({
      next: () => {
        const q = this.route.snapshot.queryParamMap.get('q');
        if (q) {
          this.router.navigate(['/company/candidates'], { queryParams: { q } });
        } else {
          this.router.navigate(['/company/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403 && err.error?.message?.includes('correo todavía no fue confirmado')) {
          const ref = this.snackBar.open(err.error.message, 'Reenviar correo', { duration: 8000 });
          ref.onAction().subscribe(() => this.resendVerification(email));
        } else {
          this.snackBar.open(err.error?.message || 'Error al iniciar sesión', 'Cerrar', { duration: 5000 });
        }
      },
    });
  }

  private resendVerification(email: string) {
    this.auth.resendVerification(email).subscribe({
      next: (res) => this.snackBar.open(res.message, 'Cerrar', { duration: 5000 }),
      error: (err) => this.snackBar.open(err.error?.message || 'No se pudo reenviar el correo', 'Cerrar', { duration: 4000 }),
    });
  }
}
