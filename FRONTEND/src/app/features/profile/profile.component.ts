import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/auth/auth.service';
import { Profile } from '../../core/auth/auth.models';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { GithubWarningComponent } from '../../shared/components/github-warning/github-warning.component';
import {
  normalizePhoneStorage,
  formatPhoneDisplay,
  titleCaseText,
  trimText,
  normalizeUrl,
} from '../../shared/utils/normalize';

/** Campos del perfil que el candidato puede ocultar/mostrar de forma independiente en su portafolio público. */
type VisibilityField = 'showPhone' | 'showCity' | 'showLinkedin' | 'showGithub' | 'showWebsite';

/**
 * Pantalla de edición del perfil del candidato (ruta "/app/profile").
 * Maneja los datos personales/profesionales (nombre, título, resumen,
 * contacto, redes), el slug que define la URL publica del portafolio,
 * y los toggles de visibilidad por campo (qué se muestra públicamente).
 * Normaliza los datos (teléfono, capitalización de nombres, URLs) tanto
 * al perder foco de cada input como antes de guardar en el backend.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatSlideToggleModule, MatSnackBarModule, MatTooltipModule,
    ButtonDirective, CardComponent, GithubWarningComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);

  isEditing = false;
  loading = false;
  saving = false;
  saved = false;
  copied = false;
  loadError: string | null = null;
  profile: Profile | null = null;
  lastSavedProfile: Profile | null = null;

  form = this.fb.group({
    fullName: [''],
    professionalTitle: [''],
    summary: [''],
    phone: [''],
    city: [''],
    linkedinUrl: [''],
    githubUrl: [''],
    websiteUrl: [''],
    slug: [''],
    showPhone: [false],
    showCity: [true],
    showLinkedin: [true],
    showGithub: [true],
    showWebsite: [true],
  });

  /** Perfil a mostrar en la vista de resumen (modo lectura): el actual, o el último guardado como respaldo. */
  get summaryProfile(): any {
    return this.profile ?? this.lastSavedProfile ?? {};
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  /**
   * Formatea el teléfono al salir del campo, no en cada tecla — reformatear
   * en vivo movía el cursor al final del texto en cada pulsación (vía
   * setValue), lo que hacía imposible editar un número ya escrito porque
   * el cursor "saltaba" apenas se tocaba una tecla en el medio del texto.
   */
  onPhoneBlur(): void {
    const control = this.form.get('phone');
    const value = control?.value || '';
    const formatted = value ? formatPhoneDisplay(normalizePhoneStorage(value)) : '';
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  /** Mismo patrón que el teléfono: solo se reformatea al salir del campo, nunca
   *  mientras se escribe, para no repetir el bug del cursor saltando al final. */
  onNameLikeBlur(controlName: 'fullName' | 'professionalTitle' | 'city'): void {
    const control = this.form.get(controlName);
    const value = control?.value || '';
    const formatted = titleCaseText(value);
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  /** Normaliza el texto libre del resumen (recorta espacios) al perder el foco del campo. */
  onSummaryBlur(): void {
    const control = this.form.get('summary');
    const value = control?.value || '';
    const trimmed = trimText(value);
    if (trimmed !== value) {
      control?.setValue(trimmed);
    }
  }

  /** Normaliza una URL (LinkedIn/GitHub/sitio web) al salir del campo, ej. agregando el esquema https:// si falta. */
  onUrlBlur(controlName: 'linkedinUrl' | 'githubUrl' | 'websiteUrl'): void {
    const control = this.form.get(controlName);
    const value = control?.value || '';
    if (!value.trim()) return;
    const formatted = normalizeUrl(value);
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  /** Formatea un teléfono almacenado (formato crudo) a su forma legible para mostrar en pantalla. */
  displayPhone(value: unknown): string {
    const text = String(value ?? '').trim();
    return text ? formatPhoneDisplay(text) : 'No agregado todavía';
  }

  /** Carga el perfil del candidato autenticado desde el backend y precarga el formulario. */
  loadProfile(): void {
    this.loading = true;
    this.loadError = null;

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.lastSavedProfile = { ...profile };
        this.patchForm(profile);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.message || err?.message || 'No se pudo cargar el perfil';
      },
    });
  }

  /** Vuelca los datos de un perfil (del backend o el último guardado) al formulario reactivo, formateando el teléfono para lectura. */
  private patchForm(data: any): void {
    this.form.patchValue({
      fullName: data?.fullName ?? '',
      professionalTitle: data?.professionalTitle ?? '',
      summary: data?.summary ?? '',
      phone: data?.phone ? formatPhoneDisplay(data.phone) : '',
      city: data?.city ?? '',
      linkedinUrl: data?.linkedinUrl ?? '',
      githubUrl: data?.githubUrl ?? '',
      websiteUrl: data?.websiteUrl ?? '',
      slug: data?.slug ?? '',
      showPhone: Boolean(data?.showPhone),
      showCity: Boolean(data?.showCity),
      showLinkedin: Boolean(data?.showLinkedin),
      showGithub: Boolean(data?.showGithub),
      showWebsite: Boolean(data?.showWebsite),
    });
  }

  /** Lee el valor actual (en el formulario) de un toggle de visibilidad. */
  isVisible(field: VisibilityField): boolean {
    return Boolean(this.form.get(field)?.value);
  }

  /** Invierte un toggle de visibilidad solo en el formulario (modo edición), sin guardar todavía en el backend. */
  toggleLocalVisibility(field: VisibilityField): void {
    const control = this.form.get(field);
    if (!control) return;
    control.setValue(!Boolean(control.value));
    control.markAsDirty();
    control.markAsTouched();
  }

  /**
   * Invierte un toggle de visibilidad directamente desde la vista de
   * resumen (fuera de modo edición) y lo guarda al instante en el
   * backend, de forma optimista: aplica el cambio ya mismo y lo revierte
   * si la llamada falla, para no obligar al usuario a entrar a editar
   * solo para cambiar qué campos se ven en su portafolio público.
   */
  toggleSummaryVisibility(field: VisibilityField): void {
    if (!this.profile || this.saving) return;

    const previous = Boolean(this.profile[field]);
    const next = !previous;

    (this.profile as any)[field] = next;

    this.form.patchValue({ [field]: next }, { emitEvent: false });

    this.profileService.updateProfile({ [field]: next } as any).subscribe({
      next: (updatedProfile) => {
        const merged: Profile = {
          ...(this.profile as Profile),
          ...(updatedProfile ?? {}),
          [field]: next,
        };
        this.profile = merged;
        this.lastSavedProfile = { ...merged };
        this.patchForm(merged);
        this.auth.updateCurrentProfile(merged);
        this.snackBar.open('Visibilidad actualizada', 'Cerrar', { duration: 1800 });
      },
      error: (error) => {
        (this.profile as any)[field] = previous;
        this.form.patchValue({ [field]: previous }, { emitEvent: false });

        const message = error?.error?.message || error?.message || 'No se pudo actualizar la visibilidad';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      },
    });
  }

  /** Entra en modo edición del perfil. */
  editProfile(): void {
    this.isEditing = true;
    this.saved = false;
  }

  /** Descarta los cambios sin guardar y vuelve al formulario a los últimos datos guardados. */
  cancelEdit(): void {
    const source = this.lastSavedProfile ?? this.profile;
    if (source) {
      this.patchForm(source);
    }
    this.isEditing = false;
    this.saved = false;
  }

  /** Texto a mostrar para un campo del perfil, o un texto por defecto si está vacío. */
  displayValue(value: unknown, fallback = 'No agregado todavía'): string {
    const text = String(value ?? '').trim();
    return text.length ? text : fallback;
  }

  /** Iniciales (hasta 2) del nombre del candidato, usadas en el avatar cuando no hay foto. */
  getInitials(name: unknown): string {
    const clean = String(name ?? '').trim();
    if (!clean) return 'P';
    return clean.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }

  /**
   * Guarda el formulario completo: normaliza cada campo (capitalización
   * de nombre/título/ciudad, formato de teléfono, URLs) antes de enviarlo
   * al backend, y sincroniza el perfil actualizado en el AuthService para
   * que el resto de la app (ej. el shell) refleje los cambios al instante.
   */
  save(): void {
    if (this.saving) return;
    this.saving = true;
    this.saved = false;

    const raw = this.form.getRawValue();

    const payload: any = {
      fullName: this.cleanTitleCase(raw.fullName),
      professionalTitle: this.cleanTitleCase(raw.professionalTitle),
      summary: this.cleanString(raw.summary),
      phone: this.cleanPhone(raw.phone),
      city: this.cleanTitleCase(raw.city),
      linkedinUrl: this.cleanUrl(raw.linkedinUrl),
      githubUrl: this.cleanUrl(raw.githubUrl),
      websiteUrl: this.cleanUrl(raw.websiteUrl),
      showPhone: Boolean(raw.showPhone),
      showCity: Boolean(raw.showCity),
      showLinkedin: Boolean(raw.showLinkedin),
      showGithub: Boolean(raw.showGithub),
      showWebsite: Boolean(raw.showWebsite),
    };

    this.profileService.updateProfile(payload as any).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.lastSavedProfile = { ...profile };
        this.auth.updateCurrentProfile(profile);
        this.patchForm(profile);
        this.saving = false;
        this.saved = true;
        this.isEditing = false;
        this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 2500 });
        setTimeout(() => (this.saved = false), 2500);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || 'Error al guardar los cambios';
        this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
      },
    });
  }

  /**
   * Genera un slug (URL amigable) sugerido a partir del nombre completo:
   * pasa a minusculas, quita tildes/diacriticos (normalize NFD + strip),
   * reemplaza cualquier caracter no alfanumerico por guiones y recorta
   * guiones sobrantes en los extremos, limitando a 80 caracteres.
   */
  generateSlug(): void {
    const fullName = this.form.get('fullName')?.value || '';
    const slug = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
    this.form.patchValue({ slug });
    this.form.get('slug')?.markAsDirty();
  }

  /** Slug actual del formulario, normalizado a minusculas y sin espacios sueltos. */
  get currentSlug(): string {
    return this.form.get('slug')?.value?.toLowerCase().replace(/\s+/g, '-') || '';
  }

  /** URL publica completa del portafolio, construida a partir del slug actual. */
  get publicUrl(): string {
    return this.currentSlug ? `${window.location.origin}/portfolio/${this.currentSlug}` : '';
  }

  /** Copia la URL publica del portafolio al portapapeles, si ya hay un slug configurado. */
  copyLink(): void {
    if (!this.currentSlug) {
      this.snackBar.open('Completa tu slug primero', 'Cerrar', { duration: 2000 });
      return;
    }
    this.clipboard.copy(this.publicUrl);
    this.copied = true;
    this.snackBar.open('Enlace copiado al portapapeles', 'Cerrar', { duration: 2000 });
    setTimeout(() => (this.copied = false), 2500);
  }

  /** Normaliza un valor arbitrario al mismo formato de slug que `generateSlug` (no se usa como input directo del usuario). */
  private normalizeSlug(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
  }

  /** Recorta espacios de un texto libre antes de guardar; devuelve null si queda vacio (para no mandar strings vacios al backend). */
  private cleanString(value: unknown): string | null {
    const text = trimText(String(value ?? ''));
    return text.length ? text : null;
  }

  /** Aplica capitalizacion tipo "Titulo" antes de guardar; devuelve null si queda vacio. */
  private cleanTitleCase(value: unknown): string | null {
    const text = titleCaseText(String(value ?? ''));
    return text.length ? text : null;
  }

  /** Convierte el telefono ingresado al formato de almacenamiento (sin espacios/guiones) antes de guardar; null si esta vacio. */
  private cleanPhone(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? normalizePhoneStorage(text) : null;
  }

  /** Normaliza una URL antes de guardar (esquema, formato); null si esta vacia. */
  private cleanUrl(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? normalizeUrl(text) : null;
  }
}
