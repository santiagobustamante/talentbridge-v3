import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PublicPortfolioService } from '../../core/services/public-portfolio.service';
import { Profile } from '../../core/auth/auth.models';

@Component({
  selector: 'app-public-portfolio',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
  ],
  styleUrl: './public-portfolio.component.scss',
  template: `
    <ng-container *ngIf="profile === null && !notFound; else content">
      <div class="loading-state">
        <div class="loading-skeleton">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-40"></div>
          <div class="skeleton-line w-80"></div>
        </div>
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      </div>
    </ng-container>

    <ng-template #notFoundTmpl>
      <div class="error-state animate-fade-in">
        <div class="error-card">
          <div class="error-icon">
            <mat-icon>person_off</mat-icon>
          </div>
          <h2>Portafolio no encontrado</h2>
          <p>El perfil que buscas no existe o no está disponible públicamente.</p>
              </div>

              <div *ngIf="profile?.showGithub && profile?.githubUrl" class="github-warning">
                <mat-icon>info</mat-icon>
                <p>Antes de compartir repositorios o enlaces de GitHub, verifica que no contengan credenciales, información privada, secretos, datos de clientes, código protegido por acuerdos de confidencialidad ni material restringido por políticas de tu empresa, cliente o institución. La información publicada o compartida mediante estos enlaces es responsabilidad del usuario.</p>
              </div>
            </div>
    </ng-template>

    <ng-template #content>
      <ng-container *ngIf="profile; else notFoundTmpl">
          <div class="public-backbar">
            <button type="button" class="back-button" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Volver
            </button>
          </div>
          <div class="portfolio animate-fade-in">

          <header class="hero">
            <div class="hero-bg"></div>
            <div class="hero-content animate-fade-in-up">
              <h1 class="hero-name">{{ profile.fullName || 'Sin nombre' }}</h1>
              <p class="hero-title">{{ profile.professionalTitle || 'Sin título profesional' }}</p>
              <p class="hero-location" *ngIf="profile.showCity && profile.city">
                <mat-icon>location_on</mat-icon>
                {{ profile.city }}
              </p>
              <p class="hero-contact" *ngIf="profile.showPhone && profile.phone">
                <mat-icon>phone</mat-icon>
                {{ profile.phone }}
              </p>
              <p class="hero-summary" *ngIf="profile.summary">{{ profile.summary }}</p>

              <div class="hero-links" *ngIf="(profile.showLinkedin && profile.linkedinUrl) || (profile.showGithub && profile.githubUrl) || (profile.showWebsite && profile.websiteUrl)">
                <a *ngIf="profile.showLinkedin && profile.linkedinUrl" [href]="profile.linkedinUrl" target="_blank" class="link-btn linkedin animate-fade-in-up stagger-1">
                  <mat-icon>link</mat-icon>
                  LinkedIn
                </a>
                <a *ngIf="profile.showGithub && profile.githubUrl" [href]="profile.githubUrl" target="_blank" class="link-btn github animate-fade-in-up stagger-2">
                  <mat-icon>code</mat-icon>
                  GitHub
                </a>
                <a *ngIf="profile.showWebsite && profile.websiteUrl" [href]="profile.websiteUrl" target="_blank" class="link-btn website animate-fade-in-up stagger-3">
                  <mat-icon>language</mat-icon>
                  Sitio Web
                </a>
              </div>
            </div>
          </header>

          <section class="section skills-section" *ngIf="profile.showSkills && profile.skills?.length">
            <h2 class="section-heading animate-fade-in-up">
              <mat-icon>bolt</mat-icon>
              Habilidades
            </h2>
            <div class="skills-grid animate-fade-in-up stagger-1">
              <div class="skill-pill" *ngFor="let s of profile.skills" [class]="'skill-pill level-' + levelClass(s.level)">
                <span class="skill-name">{{ s.name }}</span>
                <span class="skill-level">{{ s.level }}</span>
              </div>
            </div>
          </section>

          <section class="section experience-section" *ngIf="profile.showExperience && profile.experiences?.length">
            <h2 class="section-heading animate-fade-in-up">
              <mat-icon>work</mat-icon>
              Experiencia profesional
            </h2>
            <div class="timeline">
              <div class="timeline-line"></div>
              <div class="timeline-card glass-card animate-fade-in-up" *ngFor="let e of profile.experiences; let i = index" [style.animation-delay]="(i * 0.08) + 's'">
                <div class="timeline-dot">
                  <div class="dot-inner" [class.current]="e.isCurrent"></div>
                </div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <h3>{{ e.position }}</h3>
                    <span class="current-badge" *ngIf="e.isCurrent">Actual</span>
                  </div>
                  <p class="timeline-company">{{ e.company }}</p>
                  <div class="timeline-meta" *ngIf="e.city || e.workMode || e.contractType">
                    <span class="meta-pill" *ngIf="e.city">{{ e.city }}</span>
                    <span class="meta-pill" *ngIf="e.workMode">{{ workModeLabel(e.workMode) }}</span>
                    <span class="meta-pill" *ngIf="e.contractType">{{ contractTypeLabel(e.contractType) }}</span>
                  </div>
                  <p class="timeline-dates">
                    {{ e.startDate | date:'MMM y' }} —
                    {{ e.isCurrent ? 'Actualidad' : (e.endDate | date:'MMM y') }}
                  </p>
                  <p class="timeline-desc" *ngIf="e.description">{{ e.description }}</p>
                  <p class="timeline-desc" *ngIf="e.functions"><strong>Funciones:</strong> {{ e.functions }}</p>
                  <p class="timeline-desc" *ngIf="e.achievements"><strong>Logros:</strong> {{ e.achievements }}</p>
                  <div class="learned-chips" *ngIf="e.learnedSkills?.length">
                    <span class="learned-chip" *ngFor="let s of e.learnedSkills">{{ s }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="section education-section" *ngIf="profile.showEducation && profile.educations?.length">
            <h2 class="section-heading animate-fade-in-up">
              <mat-icon>school</mat-icon>
              Formación académica
            </h2>
            <div class="edu-grid">
              <div class="edu-card glass-card animate-fade-in-scale" *ngFor="let e of profile.educations; let i = index" [style.animation-delay]="(i * 0.08) + 's'">
                <div class="edu-icon">
                  <mat-icon>school</mat-icon>
                </div>
                <div class="edu-content">
                  <div class="edu-badges">
                    <span class="edu-type-badge" *ngIf="e.educationType">{{ e.educationType === 'FORMAL' ? 'Formal' : 'No formal' }}</span>
                    <span class="edu-level-badge" *ngIf="e.formationLevel">{{ e.formationLevel }}</span>
                  </div>
                  <h3>{{ e.institution }}</h3>
                  <p class="edu-degree">{{ e.degree }}</p>
                  <p class="edu-field" *ngIf="e.fieldOfStudy">{{ e.fieldOfStudy }}</p>
                  <p class="edu-dates">
                    {{ e.startDate | date:'MMM y' }} —
                    {{ e.isCurrent ? 'Actualidad' : (e.endDate | date:'MMM y') }}
                  </p>
                  <p class="edu-desc" *ngIf="e.description">{{ e.description }}</p>
                </div>
              </div>
            </div>
          </section>

          <section class="section projects-section" *ngIf="profile.showProjects && profile.projects?.length">
            <h2 class="section-heading animate-fade-in-up">
              <mat-icon>rocket_launch</mat-icon>
              Proyectos
            </h2>
            <div class="projects-grid">
              <div class="project-card glass-card animate-fade-in-scale" *ngFor="let p of profile.projects; let i = index" [style.animation-delay]="(i * 0.08) + 's'">
                <div class="project-header">
                  <mat-icon>folder</mat-icon>
                  <h3>{{ p.name }}</h3>
                </div>
                <div class="project-badges" *ngIf="p.projectType || p.status">
                  <span class="proj-badge" *ngIf="p.projectType">{{ p.projectType === 'INDIVIDUAL' ? 'Individual' : 'En equipo' }}</span>
                  <span class="proj-badge proj-status" *ngIf="p.status">{{ projectStatusLabel(p.status) }}</span>
                </div>
                <p class="proj-role" *ngIf="p.role"><strong>Rol:</strong> {{ p.role }}</p>
                <p class="proj-responsibilities" *ngIf="p.responsibilities">{{ p.responsibilities }}</p>
                <p class="project-desc" *ngIf="p.description">{{ p.description }}</p>
                <div class="project-tech" *ngIf="p.technologies?.length">
                  <span class="tech-chip" *ngFor="let t of p.technologies">{{ t }}</span>
                </div>
                <div class="project-links" *ngIf="p.repositoryUrl || p.demoUrl">
                  <a *ngIf="p.repositoryUrl" [href]="p.repositoryUrl" target="_blank" class="proj-link">
                    <mat-icon>code</mat-icon> Repositorio
                  </a>
                  <a *ngIf="p.demoUrl" [href]="p.demoUrl" target="_blank" class="proj-link demo">
                    <mat-icon>open_in_new</mat-icon> Demo
                  </a>
                </div>
              </div>
            </div>
          </section>

          <footer class="portfolio-footer animate-fade-in">
            <div class="footer-line"></div>
            <p>Portafolio generado con Portafolio Profesional Inteligente</p>
          </footer>
        </div>
      </ng-container>
    </ng-template>
  `,
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

  levelClass(level: string): string {
    const l = (level || '').toLowerCase();
    if (l.includes('avanzado') || l.includes('experto') || l.includes('advanced') || l.includes('expert')) return 'high';
    if (l.includes('intermedio') || l.includes('intermediate')) return 'mid';
    return 'low';
  }

  workModeLabel(mode: string): string {
    const map: Record<string, string> = { ONSITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' };
    return map[mode] || mode;
  }

  contractTypeLabel(type: string): string {
    const map: Record<string, string> = { FULL_TIME: 'Tiempo completo', PART_TIME: 'Medio tiempo', CONTRACTOR: 'Contratista', INTERNSHIP: 'Prácticas', FREELANCE: 'Freelance', TEMPORARY: 'Temporal', OTHER: 'Otro' };
    return map[type] || type;
  }

  projectStatusLabel(status: string): string {
    const map: Record<string, string> = { PLANNED: 'Planificado', IN_PROGRESS: 'En progreso', COMPLETED: 'Completado' };
    return map[status] || status;
  }
}
