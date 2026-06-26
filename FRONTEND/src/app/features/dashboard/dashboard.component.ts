import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { CvService } from '../../core/services/cv.service';
import { Profile, CvAnalysis } from '../../core/auth/auth.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatTooltipModule, MatSnackBarModule,
  ],
  styleUrl: './dashboard.component.scss',
  template: `
    <div class="dashboard">

      <!-- Hero Card -->
      <section class="hero-card">
        <div class="hero-content">
          <div class="hero-left">
            <span class="hero-badge">
              <mat-icon>dashboard</mat-icon> Mi perfil
            </span>
            <h1 class="hero-greeting">
              Bienvenido de vuelta,
              <span class="hero-name">
                {{ profile?.fullName || auth.currentUser()?.email || 'Usuario' }}
              </span>
            </h1>
            <p class="hero-date">{{ today | date:'EEEE, d MMMM y':'':'es' }}</p>
            <div class="hero-stats" *ngIf="profileViews !== null">
              <mat-icon>visibility</mat-icon>
              <strong>{{ profileViews }}</strong> empresas han visto tu perfil
            </div>
          </div>
          <div class="hero-actions">
            <a *ngIf="profile?.slug" class="btn-primary"
               [routerLink]="'/portfolio/' + profile?.slug" target="_blank">
              <mat-icon>visibility</mat-icon> Ver perfil público
            </a>
            <button *ngIf="profile?.slug" class="btn-secondary"
                    type="button" (click)="copyLink()"
                    [matTooltip]="copied ? 'Copiado' : 'Copiar enlace'">
              <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              {{ copied ? 'Copiado' : 'Copiar enlace' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Mejoras recomendadas -->
      <section class="rec-card" *ngIf="recommendations.length">
        <div class="rec-header">
          <mat-icon>tips_and_updates</mat-icon>
          <h3>Mejoras recomendadas</h3>
        </div>
        <div class="rec-bar-wrap">
          <div class="rec-bar">
            <div class="rec-bar-fill" [style.width.%]="percent"></div>
          </div>
          <span class="rec-pct">{{ percent }}% completado</span>
        </div>
        <a *ngFor="let r of recommendations" class="rec-item" [routerLink]="r.route">
          <mat-icon>{{ r.icon }}</mat-icon>
          <span class="rec-title">{{ r.title }}</span>
          <span class="rec-action">{{ r.action }}</span>
        </a>
      </section>

      <!-- Accesos rápidos -->
      <section class="quick-links">
        <h3>Accesos rápidos</h3>
        <div class="ql-grid">
          <a class="ql-card" routerLink="/app/profile">
            <div class="ql-icon pf-icon"><mat-icon>person</mat-icon></div>
            <div class="ql-info"><span>Perfil</span><span>Editar</span></div>
          </a>
          <a class="ql-card" routerLink="/app/skills">
            <div class="ql-icon s-icon"><mat-icon>psychology</mat-icon></div>
            <div class="ql-info">
              <strong>{{ profile?.skills?.length || 0 }}</strong>
              <span>Habilidades</span>
            </div>
          </a>
          <a class="ql-card" routerLink="/app/experience">
            <div class="ql-icon e-icon"><mat-icon>work</mat-icon></div>
            <div class="ql-info">
              <strong>{{ profile?.experiences?.length || 0 }}</strong>
              <span>Experiencias</span>
            </div>
          </a>
          <a class="ql-card" routerLink="/app/education">
            <div class="ql-icon ed-icon"><mat-icon>school</mat-icon></div>
            <div class="ql-info">
              <strong>{{ profile?.educations?.length || 0 }}</strong>
              <span>Educación</span>
            </div>
          </a>
          <a class="ql-card" routerLink="/app/projects">
            <div class="ql-icon p-icon"><mat-icon>code</mat-icon></div>
            <div class="ql-info">
              <strong>{{ profile?.projects?.length || 0 }}</strong>
              <span>Proyectos</span>
            </div>
          </a>
          <a class="ql-card" routerLink="/app/cv-analysis">
            <div class="ql-icon cv-icon"><mat-icon>analytics</mat-icon></div>
            <div class="ql-info"><span>CV</span><span>Análisis</span></div>
          </a>
        </div>
      </section>

      <!-- CV Analysis -->
      <section *ngIf="lastAnalysis; else noAnalysis" class="analysis-card">
        <div class="rec-header">
          <mat-icon>description</mat-icon>
          <h3>Análisis de CV</h3>
          <span class="analysis-date">
            {{ lastAnalysis.createdAt | date:'mediumDate':'':'es' }}
          </span>
        </div>
        <div class="analysis-score-row">
          <span class="score-big">{{ lastAnalysis.score }}</span>
          <span class="score-total">/100</span>
          <div class="analysis-bar">
            <div class="analysis-bar-fill" [style.width.%]="lastAnalysis.score"></div>
          </div>
        </div>
        <a class="analysis-link" routerLink="/app/cv-analysis">
          Ver análisis completo <mat-icon>arrow_forward</mat-icon>
        </a>
      </section>
      <ng-template #noAnalysis>
        <section class="analysis-empty-card">
          <mat-icon>description</mat-icon>
          <h3>Aún no has analizado tu CV</h3>
          <a routerLink="/app/cv-analysis">
            <mat-icon>upload</mat-icon> Analizar CV ahora
          </a>
        </section>
      </ng-template>

    </div>
  `,
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private cvService = inject(CvService);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);

  profile: Profile | null = null;
  lastAnalysis: CvAnalysis | null = null;
  profileViews: number | null = null;
  copied = false;
  percent = 0;

  get today(): Date { return new Date(); }

  get recommendations(): { icon: string; title: string; action: string; route: string }[] {
    if (!this.profile) return [];
    const r = [];
    if (!this.profile.summary)
      r.push({ icon: 'article', title: 'Sin resumen', action: 'Agrega un resumen', route: '/app/dashboard' });
    if ((this.profile.skills?.length || 0) < 5)
      r.push({ icon: 'psychology', title: 'Pocas habilidades', action: 'Agrega al menos 5', route: '/app/skills' });
    if (!this.profile.city)
      r.push({ icon: 'location_on', title: 'Sin ciudad', action: 'Agrega tu ciudad', route: '/app/dashboard' });
    if (!this.profile.experiences?.length)
      r.push({ icon: 'work', title: 'Sin experiencia', action: 'Agrega experiencia', route: '/app/experience' });
    if (!this.profile.educations?.length)
      r.push({ icon: 'school', title: 'Sin formación', action: 'Agrega formación', route: '/app/education' });
    if (!this.profile.projects?.length)
      r.push({ icon: 'code', title: 'Sin proyectos', action: 'Agrega proyectos', route: '/app/projects' });
    if (!this.profile.linkedinUrl && !this.profile.githubUrl)
      r.push({ icon: 'link', title: 'Sin enlaces', action: 'Agrega enlaces', route: '/app/dashboard' });
    return r;
  }

  ngOnInit() {
    this.profileService.getProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.percent = this.calcPercent(p);
      },
    });

    this.profileService.getProfileViews().subscribe({
      next: (res) => { this.profileViews = res.count; },
      error: () => { this.profileViews = null; },
    });

    this.cvService.getAll().subscribe({
      next: (docs) => {
        const all = docs
          .flatMap(d => d.analyses ?? [])
          .sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        this.lastAnalysis = all[0] ?? null;
      },
    });
  }

  calcPercent(p: Profile): number {
    let f = 0;
    if (p.fullName) f++;
    if (p.professionalTitle) f++;
    if (p.summary) f++;
    if (p.phone) f++;
    if (p.city) f++;
    if (p.linkedinUrl || p.githubUrl) f++;
    if ((p.skills?.length || 0) > 0) f++;
    return Math.round((f / 7) * 100);
  }

  copyLink() {
    if (!this.profile?.slug) return;
    this.clipboard.copy(`${window.location.origin}/portfolio/${this.profile.slug}`);
    this.copied = true;
    this.snackBar.open('Enlace copiado', 'Cerrar', { duration: 2000 });
    setTimeout(() => (this.copied = false), 2500);
  }
}
