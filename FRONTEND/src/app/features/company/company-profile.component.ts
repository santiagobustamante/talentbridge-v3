import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompanyService } from '../../core/services/company.service';
import { CompanyProfile } from '../../core/auth/auth.models';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import {
  normalizePhoneStorage,
  formatPhoneDisplay,
  normalizeNitStorage,
  formatNitDisplay,
  titleCaseText,
  trimText,
  normalizeUrl,
} from '../../shared/utils/normalize';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule, MatSnackBarModule, ButtonDirective],
  templateUrl: './company-profile.component.html',
  styleUrl: './company-profile.component.scss',
})
export class CompanyProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private snackBar = inject(MatSnackBar);

  isEditing = false;
  loading = false;
  saving = false;
  loadError: string | null = null;
  companyProfile: CompanyProfile | null = null;
  lastSavedProfile: CompanyProfile | null = null;

  form = this.fb.group({
    companyName: [''],
    nit: [''],
    sector: [''],
    city: [''],
    phone: [''],
    websiteUrl: [''],
    description: [''],
    logoUrl: [''],
  });

  get summaryProfile(): any {
    return this.companyProfile ?? this.lastSavedProfile ?? {};
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  /**
   * Formatea al salir del campo, no en cada tecla — reformatear en vivo movía
   * el cursor al final del texto en cada pulsación (vía setValue), impidiendo
   * editar un número/NIT ya escrito porque el cursor "saltaba" apenas se
   * tocaba una tecla en el medio del texto.
   */
  onPhoneBlur(): void {
    const control = this.form.get('phone');
    const value = control?.value || '';
    const formatted = value ? formatPhoneDisplay(normalizePhoneStorage(value)) : '';
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  onNitBlur(): void {
    const control = this.form.get('nit');
    const value = control?.value || '';
    const formatted = value ? formatNitDisplay(normalizeNitStorage(value)) : '';
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  onNameLikeBlur(controlName: 'companyName' | 'sector' | 'city'): void {
    const control = this.form.get(controlName);
    const value = control?.value || '';
    const formatted = titleCaseText(value);
    if (formatted !== value) {
      control?.setValue(formatted);
    }
  }

  onDescriptionBlur(): void {
    const control = this.form.get('description');
    const value = control?.value || '';
    const trimmed = trimText(value);
    if (trimmed !== value) {
      control?.setValue(trimmed);
    }
  }

  onWebsiteBlur(): void {
    const control = this.form.get('websiteUrl');
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

  displayNit(value: unknown): string {
    const text = String(value ?? '').trim();
    return text ? formatNitDisplay(text) : 'No agregado todavía';
  }

  loadProfile(): void {
    this.loading = true;
    this.loadError = null;

    this.companyService.getProfile().subscribe({
      next: (profile) => {
        this.companyProfile = profile;
        this.lastSavedProfile = { ...profile };
        this.patchForm(profile);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.message || err?.message || 'No se pudo cargar el perfil empresarial';
      },
    });
  }

  private patchForm(profile: any): void {
    this.form.patchValue({
      companyName: profile?.companyName ?? '',
      nit: profile?.nit ? formatNitDisplay(profile.nit) : '',
      sector: profile?.sector ?? '',
      city: profile?.city ?? '',
      phone: profile?.phone ? formatPhoneDisplay(profile.phone) : '',
      websiteUrl: profile?.websiteUrl ?? '',
      description: profile?.description ?? '',
      logoUrl: profile?.logoUrl ?? '',
    });
  }

  editProfile(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    const source = this.lastSavedProfile ?? this.companyProfile;
    if (source) {
      this.patchForm(source);
    }
    this.isEditing = false;
  }

  displayValue(value: unknown, fallback = 'No agregado todavía'): string {
    const text = String(value ?? '').trim();
    return text.length ? text : fallback;
  }

  getInitials(name: unknown): string {
    const clean = String(name ?? '').trim();
    if (!clean) return 'E';
    return clean.split(/\s+/).slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;

    const raw = this.form.getRawValue();
    const payload: any = {
      companyName: this.cleanTitleCase(raw.companyName),
      nit: this.cleanNit(raw.nit),
      sector: this.cleanTitleCase(raw.sector),
      city: this.cleanTitleCase(raw.city),
      phone: this.cleanPhone(raw.phone),
      websiteUrl: this.cleanUrl(raw.websiteUrl),
      description: this.cleanString(raw.description),
      logoUrl: this.cleanUrl(raw.logoUrl),
    };

    this.companyService.updateProfile(payload as any).subscribe({
      next: (profile) => {
        this.companyProfile = profile;
        this.lastSavedProfile = { ...profile };
        this.patchForm(profile);
        this.saving = false;
        this.isEditing = false;
        this.snackBar.open('Perfil empresarial actualizado correctamente', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || 'No se pudo guardar el perfil empresarial';
        this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
      },
    });
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

  private cleanNit(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? normalizeNitStorage(text) : null;
  }

  private cleanUrl(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? normalizeUrl(text) : null;
  }
}
