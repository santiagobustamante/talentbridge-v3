import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PublicPortfolioService } from '../../core/services/public-portfolio.service';
import { Profile } from '../../core/auth/auth.models';
import { PortfolioContentComponent } from '../../shared/components/portfolio-content/portfolio-content.component';

@Component({
  selector: 'app-public-portfolio',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatIconModule, PortfolioContentComponent],
  templateUrl: './public-portfolio.component.html',
  styleUrl: './public-portfolio.component.scss',
})
export class PublicPortfolioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PublicPortfolioService);
  private location = inject(Location);
  private router = inject(Router);

  profile: Profile | null = null;
  notFound = false;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.service.getBySlug(slug).subscribe({
        next: (p) => (this.profile = p),
        error: () => {
          this.profile = null;
          this.notFound = true;
        },
      });
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/']);
  }
}
