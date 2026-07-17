import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CompanyService, PublicCompany } from '../../core/services/company.service';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ButtonDirective } from '../../shared/components/button/button.directive';

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

  goBack(): void {
    this.router.navigate(['/app/messages']);
  }

  initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
