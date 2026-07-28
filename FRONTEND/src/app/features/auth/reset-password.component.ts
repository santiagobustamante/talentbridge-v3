import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';

/** Confirma que `newPassword` y `confirmPassword` coincidan, igual que el registro. */
function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const a = control.get('newPassword')?.value;
  const b = control.get('confirmPassword')?.value;
  return a && b && a !== b ? { mismatch: true } : null;
}

/**
 * Formulario de nueva contraseña (ruta "/reset-password?token=..."). Sin
 * token en la URL no tiene sentido mostrar el formulario — se avisa y se
 * ofrece volver a pedir el enlace.
 */
@Component({
  selector: 'app-reset-password',
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
  styleUrl: './reset-password.component.scss',
  template: `
    <div class="auth">
      <div class="auth-card animate-fade-in-scale">
        <div class="auth-brand">
          <div class="brand-mark">
            <mat-icon>work</mat-icon>
          </div>
          <p class="brand-name">TalentBridge</p>
        </div>

        @if (!token) {
          <div class="auth-sent">
            <mat-icon class="sent-icon warn">error_outline</mat-icon>
            <p>Este enlace no es válido. Pedí uno nuevo desde la pantalla de recuperación.</p>
          </div>
          <p class="auth-alt"><a routerLink="/forgot-password">Solicitar enlace nuevo</a></p>
        } @else if (done) {
          <div class="auth-sent">
            <mat-icon class="sent-icon">check_circle</mat-icon>
            <p>{{ doneMessage }}</p>
          </div>
          <p class="auth-alt"><a routerLink="/login">Iniciar sesión</a></p>
        } @else {
          <h1 class="auth-title">Elige una nueva contraseña</h1>
          <p class="auth-subtitle">Debe tener al menos 8 caracteres, con letras y números</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nueva contraseña</mat-label>
              <input matInput type="password" formControlName="newPassword" autocomplete="new-password" placeholder="••••••••" />
              <mat-error *ngIf="form.get('newPassword')?.hasError('required')">Requerida</mat-error>
              <mat-error *ngIf="form.get('newPassword')?.hasError('minlength')">Mínimo 8 caracteres</mat-error>
              <mat-error *ngIf="form.get('newPassword')?.hasError('pattern')">Debe incluir al menos una letra y un número</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirmar contraseña</mat-label>
              <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" placeholder="••••••••" />
              <mat-error *ngIf="form.get('confirmPassword')?.hasError('required')">Requerida</mat-error>
              <mat-error *ngIf="form.hasError('mismatch') && !form.get('confirmPassword')?.hasError('required')">Las contraseñas no coinciden</mat-error>
            </mat-form-field>

            <div class="auth-progress" *ngIf="loading">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            </div>

            <button appButton="primary" size="lg" type="submit" [disabled]="form.invalid || loading" class="full-width">
              <span class="btn-content" *ngIf="!loading">Guardar nueva contraseña</span>
              <span class="btn-content" *ngIf="loading">Guardando...</span>
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  token: string | null = null;
  loading = false;
  done = false;
  doneMessage = '';

  form = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/(?=.*[A-Za-z])(?=.*\d)/)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  onSubmit() {
    if (this.form.invalid || !this.token) return;
    this.loading = true;
    const { newPassword, confirmPassword } = this.form.value;
    this.auth.resetPassword(this.token, newPassword!, confirmPassword!).subscribe({
      next: (res) => {
        this.loading = false;
        this.done = true;
        this.doneMessage = res.message;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Error al restablecer la contraseña', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
