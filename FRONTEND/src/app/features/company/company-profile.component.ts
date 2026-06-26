import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompanyService } from '../../core/services/company.service';
import { CompanyProfile } from '../../core/auth/auth.models';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule, MatSnackBarModule],
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
      nit: profile?.nit ?? '',
      sector: profile?.sector ?? '',
      city: profile?.city ?? '',
      phone: profile?.phone ?? '',
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
      companyName: this.cleanString(raw.companyName),
      nit: this.cleanString(raw.nit),
      sector: this.cleanString(raw.sector),
      city: this.cleanString(raw.city),
      phone: this.cleanString(raw.phone),
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
    const text = String(value ?? '').trim();
    return text.length ? text : null;
  }

  private cleanUrl(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text.length ? text : null;
  }
}
