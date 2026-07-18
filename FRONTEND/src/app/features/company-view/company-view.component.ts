import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CompanyService, PublicCompany } from '../../core/services/company.service';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { formatPhoneDisplay } from '../../shared/utils/normalize';

/**
 * Vista de perfil publico de una empresa desde la perspectiva de un
 * candidato autenticado (ej. abierta desde Mensajes al tocar el nombre
 * de la empresa con la que se esta chateando). Solo lectura: muestra
 * los datos de contacto/descripcion de la empresa correspondiente al id
 * de la URL.
 */
@Component({
  selector: 'app-company-view',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, AppDatePipe, ButtonDirective],
  templateUrl: './company-view.component.html',
  styleUrl: './company-view.component.scss',
})
export class CompanyViewComponent implements OnInit {
  private companyService = inject(CompanyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  company = signal<PublicCompany | null>(null);
  loading = signal(true);
  error = signal(false);

  /** Formatea un telefono almacenado (formato crudo) a su forma legible para mostrar en pantalla. */
  displayPhone(value: unknown): string {
    const text = String(value ?? '').trim();
    return text ? formatPhoneDisplay(text) : '';
  }

  /** Resuelve el id de empresa desde la URL y carga sus datos publicos. */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.companyService.getPublicCompany(parseInt(id, 10)).subscribe({
      next: (data) => {
        this.company.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Vuelve a la bandeja de mensajes del candidato. */
  goBack(): void {
    this.router.navigate(['/app/messages']);
  }

  /** Inicial del nombre de la empresa, usada en el avatar cuando no hay logo. */
  initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
