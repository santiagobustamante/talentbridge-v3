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
import { GithubWarningComponent } from '../../shared/components/github-warning/github-warning.component';
import {
  normalizePhoneStorage,
  formatPhoneDisplay,
  titleCaseText,
  trimText,
  normalizeUrl,
} from '../../shared/utils/normalize';

type VisibilityField = 'showPhone' | 'showCity' | 'showLinkedin' | 'showGithub' | 'showWebsite';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatSlideToggleModule, MatSnackBarModule, MatTooltipModule,
    ButtonDirective, GithubWarningComponent,
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

  onSummaryBlur(): void {
    const control = this.form.get('summary');
    const value = control?.value || '';
    const trimmed = trimText(value);
    if (trimmed !== value) {
      control?.setValue(trimmed);
    }
  }

  onUrlBlur(controlName: 'linkedinUrl' | 'githubUrl' | 'websiteUrl'): void {
    const control = this.form.get(controlName);
    const value = control?.value || '';
    if (!value.trim()) return;
    const formatted = normalizeUrl(value);
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  displayPhone(value: unknown): string {
    const text = String(value ?? '').trim();
    return text ? formatPhoneDisplay(text) : 'No agregado todavía';
  }

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

  isVisible(field: VisibilityField): boolean {
    return Boolean(this.form.get(field)?.value);
  }

  toggleLocalVisibility(field: VisibilityField): void {
    const control = this.form.get(field);
    if (!control) return;
    control.setValue(!Boolean(control.value));
    control.markAsDirty();
    control.markAsTouched();
  }

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

  editProfile(): void {
    this.isEditing = true;
    this.saved = false;
  }

  cancelEdit(): void {
    const source = this.lastSavedProfile ?? this.profile;
    if (source) {
      this.patchForm(source);
    }
    this.isEditing = false;
    this.saved = false;
  }

  displayValue(value: unknown, fallback = 'No agregado todavía'): string {
    const text = String(value ?? '').trim();
    return text.length ? text : fallback;
  }

  getInitials(name: unknown): string {
    const clean = String(name ?? '').trim();
    if (!clean) return 'P';
    return clean.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }

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

  get currentSlug(): string {
    return this.form.get('slug')?.value?.toLowerCase().replace(/\s+/g, '-') || '';
  }

  get publicUrl(): string {
    return this.currentSlug ? `${window.location.origin}/portfolio/${this.currentSlug}` : '';
  }

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

  private normalizeSlug(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
  }

  private cleanString(value: unknown): string | null {
    const text = trimText(String(value ?? ''));
    return text.length ? text : null;
  }

  private cleanTitleCase(value: unknown): string | null {
    const text = titleCaseText(String(value ?? ''));
    return text.length ? text : null;
  }

  private cleanPhone(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? normalizePhoneStorage(text) : null;
  }

  private cleanUrl(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? normalizeUrl(text) : null;
  }
}
