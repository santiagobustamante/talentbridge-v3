import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule, ReactiveFormsModule],
  styleUrl: './home.component.scss',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private router = inject(Router);

  searchCtrl = new FormControl('');

  scrollToSection(sectionId: string, event?: Event): void {
    event?.preventDefault();

    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  onSearch(): void {
    const q = this.searchCtrl.value?.trim();
    if (q) {
      this.router.navigate(['/company/login'], { queryParams: { q } });
    } else {
      this.router.navigate(['/company/login']);
    }
  }
}
