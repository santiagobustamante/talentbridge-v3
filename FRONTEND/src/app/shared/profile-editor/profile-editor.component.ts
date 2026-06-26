import { Component, OnInit, inject, ViewEncapsulation, Output, EventEmitter } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../core/auth/auth.models';

type VisibilityField = 'showPhone' | 'showCity' | 'showLinkedin' | 'showGithub' | 'showWebsite';

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatSlideToggleModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './profile-editor.component.html',
  styleUrl:    './profile-editor.component.scss',
})
export class ProfileEditorComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private snackBar       = inject(MatSnackBar);
  private clipboard      = inject(Clipboard);

  @Output() profileSaved = new EventEmitter<Profile>();

  isEditing  = false;
  loading    = false;
  saving     = false;
  saved      = false;
  copied     = false;
  loadError: string | null = null;
  profile: Profile | null = null;
  lastSavedProfile: Profile | null = null;

  showPhone    = false;
  showCity     = true;
  showLinkedin = true;
  showGithub   = true;
  showWebsite  = true;

  form = this.fb.group({
    fullName:          [''],
    professionalTitle: [''],
    profession:        [''],
    summary:           [''],
    phone:             [''],
    city:              [''],
    linkedinUrl:       [''],
    githubUrl:         [''],
    websiteUrl:        [''],
    slug:              [''],
  });

  get summaryProfile(): any {
    return this.profile ?? this.lastSavedProfile ?? {};
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.loadError = null;

    this.profileService.getProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.lastSavedProfile = { ...p };
        this.patchForm(p);
        this.showPhone    = p.showPhone    ?? false;
        this.showCity     = p.showCity     ?? true;
        this.showLinkedin = p.showLinkedin ?? true;
        this.showGithub   = p.showGithub   ?? true;
        this.showWebsite  = p.showWebsite  ?? true;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.message || err?.message || 'No se pudo cargar el perfil';
      },
    });
  }

  private patchForm(p: Profile): void {
    this.form.patchValue({
      fullName:          p.fullName          || '',
      professionalTitle: p.professionalTitle || '',
      profession:        (p as any).profession || p.professionalTitle || '',
      summary:           p.summary           || '',
      phone:             p.phone             || '',
      city:              p.city              || '',
      linkedinUrl:       p.linkedinUrl       || '',
      githubUrl:         p.githubUrl         || '',
      websiteUrl:        p.websiteUrl        || '',
      slug:              p.slug              || '',
    });
  }

  isVisible(field: VisibilityField): boolean {
    return (this as any)[field] === true;
  }

  editProfile(): void {
    this.isEditing = true;
    this.saved = false;
  }

  cancelEdit(): void {
    const source = this.lastSavedProfile ?? this.profile;
    if (source) {
      this.patchForm(source);
      this.showPhone    = source.showPhone    ?? false;
      this.showCity     = source.showCity     ?? true;
      this.showLinkedin = source.showLinkedin ?? true;
      this.showGithub   = source.showGithub   ?? true;
      this.showWebsite  = source.showWebsite  ?? true;
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
    return clean.split(/\s+/).slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
  }

  toggleVisibility(event: any, field: string): void {
    const prev = (this as any)[field];
    (this as any)[field] = event.checked;
    this.profileService.updateProfile({ [field]: event.checked } as any).subscribe({
      next: () => {},
      error: () => {
        (this as any)[field] = prev;
        this.snackBar.open('Error al actualizar visibilidad', 'Cerrar', { duration: 3000 });
      },
    });
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    this.saved   = false;

    const v = this.form.getRawValue();
    const data: Record<string, unknown> = {};

    const stringFields = [
      'fullName', 'professionalTitle', 'summary',
      'phone', 'city', 'linkedinUrl', 'githubUrl', 'websiteUrl', 'slug',
    ];
    for (const f of stringFields) {
      const val = String((v as any)[f] ?? '').trim();
      data[f] = val.length ? val : null;
    }

    data['showPhone']    = this.showPhone;
    data['showCity']     = this.showCity;
    data['showLinkedin'] = this.showLinkedin;
    data['showGithub']   = this.showGithub;
    data['showWebsite']  = this.showWebsite;

    this.profileService.updateProfile(data as any).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.lastSavedProfile = { ...profile };
        this.patchForm(profile);
        this.showPhone    = profile.showPhone    ?? false;
        this.showCity     = profile.showCity     ?? true;
        this.showLinkedin = profile.showLinkedin ?? true;
        this.showGithub   = profile.showGithub   ?? true;
        this.showWebsite  = profile.showWebsite  ?? true;
        this.saving = false;
        this.saved = true;
        this.isEditing = false;
        this.profileSaved.emit(profile);
        this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 2500 });
        setTimeout(() => (this.saved = false), 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || 'Error al guardar los cambios';
        this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
      },
    });
  }

  generateSlug(): void {
    const name = this.form.get('fullName')?.value || '';
    const s = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
    this.form.patchValue({ slug: s });
    this.form.get('slug')?.markAsDirty();
  }

  get currentSlug(): string {
    const raw = this.form.get('slug')?.value || '';
    return raw
      .toLowerCase()
      .replace(/\s+/g, '-');
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
}
