import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompanyService, CandidateResult, FilterOptions } from '../../core/services/company.service';
import { ChatService } from '../../core/services/chat.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';

@Component({
  selector: 'app-company-candidates',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatIconModule, MatTooltipModule, MatProgressBarModule, MatSnackBarModule,
    BadgeComponent, ButtonDirective,
  ],
  styleUrl: './company-candidates.component.scss',
  templateUrl: './company-candidates.component.html',
})
export class CompanyCandidatesComponent implements OnInit {
  private companyService = inject(CompanyService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  filtersOpen = signal(false);

  qCtrl = new FormControl('');
  cityCtrl = new FormControl('');
  professionCtrl = new FormControl('');
  selectedSkills: string[] = [];
  skillMatch: 'any' | 'all' = 'any';

  skillInput = '';
  cityInput = '';
  professionInput = '';
  contactingCandidateId: number | null = null;
  endorsingSkillId: number | null = null;

  filterOptions = signal<FilterOptions>({ skills: [], cities: [], professions: [] });

  candidates: CandidateResult[] = [];
  page = 1;
  limit = 12;
  total = 0;
  totalPages = 1;
  hasSearched = false;

  get filteredSkillSuggestions(): string[] {
    const input = this.skillInput.trim().toLowerCase();
    if (!input) return [];
    return this.filterOptions().skills
      .filter((s) => s.toLowerCase().includes(input) && !this.selectedSkills.includes(s))
      .slice(0, 8);
  }

  get filteredCitySuggestions(): string[] {
    const input = this.cityInput.trim().toLowerCase();
    if (!input) return [];
    return this.filterOptions().cities
      .filter((c) => c.toLowerCase().includes(input))
      .slice(0, 6);
  }

  get filteredProfessionSuggestions(): string[] {
    const input = this.professionInput.trim().toLowerCase();
    if (!input) return [];
    return this.filterOptions().professions
      .filter((p) => p.toLowerCase().includes(input))
      .slice(0, 6);
  }

  ngOnInit(): void {
    this.companyService.getFilterOptions().subscribe({
      next: (opts) => this.filterOptions.set(opts),
      error: () => {},
    });

    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.qCtrl.setValue(q);
      this.doSearch();
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  contactCandidate(candidateId: number): void {
    if (this.contactingCandidateId === candidateId) return;

    this.contactingCandidateId = candidateId;

    this.chatService.createConversation(candidateId).subscribe({
      next: (conv) => {
        this.contactingCandidateId = null;
        this.router.navigate(['/company/messages'], { queryParams: { conversationId: conv.id } });
      },
      error: (err) => {
        this.contactingCandidateId = null;
        const msg = err?.error?.message || err?.message || 'No se pudo iniciar la conversación';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  toggleEndorse(candidate: CandidateResult, skill: { id: number; endorsedByMe?: boolean; endorsementCount?: number }): void {
    if (this.endorsingSkillId === skill.id) return;
    this.endorsingSkillId = skill.id;

    const wasEndorsed = !!skill.endorsedByMe;
    const request = wasEndorsed
      ? this.companyService.unendorseSkill(skill.id)
      : this.companyService.endorseSkill(skill.id);

    request.subscribe({
      next: () => {
        this.endorsingSkillId = null;
        skill.endorsedByMe = !wasEndorsed;
        skill.endorsementCount = (skill.endorsementCount || 0) + (wasEndorsed ? -1 : 1);
      },
      error: (err) => {
        this.endorsingSkillId = null;
        const msg = err?.error?.message || 'No se pudo avalar esta habilidad';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }

  addSkill(skill: string): void {
    const clean = skill.trim();
    if (!clean || this.selectedSkills.includes(clean)) return;
    this.selectedSkills = [...this.selectedSkills, clean];
    this.skillInput = '';
  }

  removeSkill(skill: string): void {
    this.selectedSkills = this.selectedSkills.filter((s) => s !== skill);
  }

  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.skillInput.trim()) {
        this.addSkill(this.skillInput);
      }
    }
    if (event.key === 'Backspace' && !this.skillInput && this.selectedSkills.length > 0) {
      this.removeSkill(this.selectedSkills[this.selectedSkills.length - 1]);
    }
  }

  selectCity(suggestion: string): void {
    this.cityCtrl.setValue(suggestion);
    this.cityInput = '';
  }

  selectProfession(suggestion: string): void {
    this.professionCtrl.setValue(suggestion);
    this.professionInput = '';
  }

  doSearch(): void {
    this.page = 1;
    this.hasSearched = true;
    this.fetchResults();
  }

  clearFilters(): void {
    this.qCtrl.setValue('');
    this.cityCtrl.setValue('');
    this.professionCtrl.setValue('');
    this.selectedSkills = [];
    this.skillMatch = 'any';
    this.skillInput = '';
    this.cityInput = '';
    this.professionInput = '';
    this.filtersOpen.set(false);
    this.candidates = [];
    this.hasSearched = false;
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.fetchResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private fetchResults(): void {
    this.loading.set(true);
    this.candidates = [];

    const params: any = { page: this.page, limit: this.limit };
    const q = this.qCtrl.value?.trim();
    const city = this.cityCtrl.value?.trim();
    const profession = this.professionCtrl.value?.trim();

    if (q) params.q = q;
    if (city) params.city = city;
    if (profession) params.profession = profession;
    if (this.selectedSkills.length > 0) {
      params.skills = this.selectedSkills.join(',');
      params.skillMatch = this.skillMatch;
    }

    this.companyService.searchCandidates(params).subscribe({
      next: (res) => {
        this.candidates = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'No pudimos cargar los candidatos en este momento. Intenta nuevamente.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }

  get pagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages; }
    pages.push(1);
    let start = Math.max(2, this.page - 1);
    let end = Math.min(total - 1, this.page + 1);
    if (this.page <= 3) end = Math.min(5, total - 1);
    if (this.page >= total - 2) start = Math.max(total - 4, 2);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  }
}
