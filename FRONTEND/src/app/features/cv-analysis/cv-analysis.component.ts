import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, of, catchError } from 'rxjs';
import { CvService } from '../../core/services/cv.service';
import { SkillsService } from '../../core/services/skills.service';
import { CvDocument, CvAnalysis } from '../../core/auth/auth.models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { SKILL_CATALOG } from '../../core/services/skill-catalog';

interface CvSkillSuggestion {
  name: string;
  selected: boolean;
}

@Component({
  selector: 'app-cv-analysis',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    AppDatePipe,
  ],
  styleUrl: './cv-analysis.component.scss',
  template: `
    <div class="cv-page">
      <!-- ── Page Header ── -->
      <header class="page-header animate-fade-in">
        <div class="header-icon">
          <mat-icon>document_scanner</mat-icon>
        </div>
        <div class="header-text">
          <h1>Análisis inteligente de CV</h1>
          <p>Sube tu hoja de vida y recibe una lectura profesional de mejora</p>
        </div>
      </header>

      <!-- ── Upload Zone ── -->
      <section class="upload-section animate-fade-in-up stagger-1">
        <div class="upload-zone" [class.has-file]="selectedFile" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="$event.preventDefault()">
          <input type="file" accept=".pdf" (change)="onFileSelected($event)" #fileInput style="display:none" />

          <ng-container *ngIf="!selectedFile; else fileSelected">
            <div class="upload-icon">
              <mat-icon>cloud_upload</mat-icon>
            </div>
            <p class="upload-title">Arrastra tu CV en PDF o haz clic para seleccionar</p>
            <p class="upload-hint">PDF máximo 5MB</p>
          </ng-container>

          <ng-template #fileSelected>
            <div class="upload-icon success">
              <mat-icon>picture_as_pdf</mat-icon>
            </div>
            <p class="upload-title file-name">{{ $any(selectedFile).name }}</p>
            <p class="upload-hint">{{ ($any(selectedFile).size / 1024 / 1024).toFixed(2) }} MB</p>
          </ng-template>
        </div>

        <button class="upload-btn" [class.loading]="uploading" [disabled]="!selectedFile || uploading" (click)="upload(); $event.stopPropagation()">
          <mat-icon *ngIf="!uploading">file_upload</mat-icon>
          <span class="spinner" *ngIf="uploading"></span>
          {{ uploading ? 'Subiendo...' : 'Subir CV' }}
        </button>
      </section>

      <!-- ── Empty State ── -->
      <section class="empty-state animate-fade-in-scale" *ngIf="documents.length === 0 && !currentAnalysis">
        <div class="empty-card">
          <div class="empty-icon">
            <mat-icon>description_outlined</mat-icon>
          </div>
          <h3>No has subido ningún CV</h3>
          <p>Sube tu hoja de vida en PDF para comenzar el análisis inteligente</p>
        </div>
      </section>

      <!-- ── Documents List ── -->
      <section class="docs-section animate-fade-in-up stagger-2" *ngIf="documents.length > 0">
        <h2 class="section-title">
          <mat-icon>folder_open</mat-icon>
          Documentos subidos
        </h2>
        <div class="doc-cards">
          <div class="doc-card animate-fade-in-scale" *ngFor="let doc of documents; let i = index" [style.animation-delay]="(i * 0.06) + 's'">
            <div class="doc-info">
              <div class="doc-icon">
                <mat-icon>picture_as_pdf</mat-icon>
              </div>
              <div class="doc-details">
                <span class="doc-name">{{ doc.originalName }}</span>
                <span class="doc-date">Subido {{ doc.uploadedAt | appDate:'datetime' }}</span>
              </div>
            </div>
            <button class="analyze-btn" [class.loading]="analyzingId === doc.id" [disabled]="analyzingId === doc.id" (click)="analyze(doc.id); $event.stopPropagation()">
              <mat-icon>psychology_alt</mat-icon>
              {{ analyzingId === doc.id ? 'Analizando...' : 'Analizar' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ── Analysis Result ── -->
      <section class="result-section animate-fade-in-up" *ngIf="currentAnalysis">
        <h2 class="section-title">
          <mat-icon>insights</mat-icon>
          Resultado del análisis
        </h2>

        <div class="result-grid">
          <!-- Score Ring -->
          <div class="score-card glass-card animate-fade-in-scale">
            <div class="score-ring"
              [class.score-low]="currentAnalysis.score < 50"
              [class.score-mid]="currentAnalysis.score >= 50 && currentAnalysis.score < 70"
              [class.score-good]="currentAnalysis.score >= 70 && currentAnalysis.score < 85"
              [class.score-great]="currentAnalysis.score >= 85">
              <svg viewBox="0 0 120 120">
                <circle class="ring-bg" cx="60" cy="60" r="52" />
                <circle class="ring-fill" cx="60" cy="60" r="52"
                  [style.stroke-dashoffset]="(326.7 - (326.7 * (currentAnalysis.score || 0)) / 100) + 'px'" />
              </svg>
              <div class="score-inner">
                <span class="score-value">{{ currentAnalysis.score }}</span>
                <span class="score-label">/ 100</span>
              </div>
            </div>
            <p class="score-date">Analizado el {{ currentAnalysis.createdAt | appDate:'datetime' }}</p>
          </div>

          <!-- Strengths -->
          <div class="detail-card glass-card strengths animate-fade-in-up stagger-2">
            <h3>
              <mat-icon class="icon-mint">check_circle</mat-icon>
              Fortalezas
            </h3>
            <ul>
              <li *ngFor="let s of currentAnalysis.strengths">
                <mat-icon class="icon-mint">check</mat-icon>
                <span>{{ s }}</span>
              </li>
            </ul>
          </div>

          <!-- Recommendations -->
          <div class="detail-card glass-card recommendations animate-fade-in-up stagger-3">
            <h3>
              <mat-icon class="icon-accent">tips_and_updates</mat-icon>
              Recomendaciones
            </h3>
            <ul>
              <li *ngFor="let r of currentAnalysis.recommendations">
                <mat-icon class="icon-accent">arrow_forward</mat-icon>
                <span>{{ r }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- ── CV Skill Suggestions ── -->
        <div class="detail-card glass-card suggestions animate-fade-in-up stagger-4" *ngIf="cvSuggestions.length > 0">
          <h3>
            <mat-icon class="icon-accent">auto_awesome</mat-icon>
            Detectamos estas tecnologías en tu CV
          </h3>
          <p class="suggestions-hint">No están todavía en tu perfil. Marca las que quieras agregar.</p>
          <div class="suggestion-list">
            <label class="suggestion-item" *ngFor="let s of cvSuggestions">
              <input type="checkbox" [checked]="s.selected" (change)="toggleSuggestion(s)" />
              <span>{{ s.name }}</span>
            </label>
          </div>
          <button
            class="upload-btn"
            [class.loading]="addingSuggestions"
            [disabled]="selectedSuggestionCount === 0 || addingSuggestions"
            (click)="addSelectedSuggestions()"
          >
            <mat-icon *ngIf="!addingSuggestions">add</mat-icon>
            <span class="spinner" *ngIf="addingSuggestions"></span>
            {{ addingSuggestions ? 'Agregando...' : (selectedSuggestionCount > 0 ? 'Agregar ' + selectedSuggestionCount + ' seleccionada(s)' : 'Ninguna seleccionada') }}
          </button>
        </div>
      </section>
    </div>
  `,
})
export class CvAnalysisComponent {
  private cvService = inject(CvService);
  private skillsService = inject(SkillsService);
  private snackBar = inject(MatSnackBar);

  selectedFile: File | null = null;
  uploading = false;
  analyzingId: number | null = null;
  documents: CvDocument[] = [];
  currentAnalysis: CvAnalysis | null = null;

  cvSuggestions: CvSkillSuggestion[] = [];
  addingSuggestions = false;
  private candidateSkillNames = new Set<string>();

  constructor() {
    this.loadDocuments();
    this.loadCandidateSkills();
  }

  get selectedSuggestionCount(): number {
    return this.cvSuggestions.filter((s) => s.selected).length;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0];
  }

  upload() {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.cvService.upload(this.selectedFile).subscribe({
      next: (doc) => {
        this.uploading = false;
        this.selectedFile = null;
        this.snackBar.open('PDF subido correctamente', 'Cerrar', { duration: 3000 });
        this.loadDocuments();
      },
      error: (err) => {
        this.uploading = false;
        this.snackBar.open(err.error?.message || 'Error al subir', 'Cerrar', { duration: 5000 });
      },
    });
  }

  analyze(id: number) {
    this.analyzingId = id;
    this.cvService.analyze(id).subscribe({
      next: (analysis) => {
        this.analyzingId = null;
        this.currentAnalysis = analysis;
        this.computeSuggestions(id);
        this.snackBar.open('Análisis completado', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.analyzingId = null;
        this.snackBar.open(err.error?.message || 'Error al analizar', 'Cerrar', { duration: 5000 });
      },
    });
  }

  toggleSuggestion(s: CvSkillSuggestion): void {
    s.selected = !s.selected;
  }

  addSelectedSuggestions(): void {
    const names = this.cvSuggestions.filter((s) => s.selected).map((s) => s.name);
    if (!names.length || this.addingSuggestions) return;

    this.addingSuggestions = true;
    forkJoin(
      names.map((name) => this.skillsService.create({ name, level: 'BASIC' }).pipe(catchError(() => of(null)))),
    ).subscribe((results) => {
      this.addingSuggestions = false;
      const added = results.filter((r) => r !== null).length;
      const failed = results.length - added;
      names.forEach((name) => this.candidateSkillNames.add(name.toLowerCase()));
      this.cvSuggestions = this.cvSuggestions.filter((s) => !names.includes(s.name));
      if (failed === 0) {
        this.snackBar.open(`${added} habilidad(es) agregada(s) a tu perfil`, 'Cerrar', { duration: 2500 });
      } else {
        this.snackBar.open(`${added} agregada(s), ${failed} ya existían o fallaron`, 'Cerrar', { duration: 4000 });
      }
    });
  }

  private loadDocuments() {
    this.cvService.getAll().subscribe({ next: (docs) => (this.documents = docs) });
  }

  private loadCandidateSkills(): void {
    this.skillsService.getAll().subscribe({
      next: (skills) => { this.candidateSkillNames = new Set(skills.map((s) => s.name.toLowerCase())); },
    });
  }

  private computeSuggestions(cvId: number): void {
    const doc = this.documents.find((d) => d.id === cvId);
    const text = doc?.extractedText?.toLowerCase();
    if (!text) { this.cvSuggestions = []; return; }

    const seen = new Set<string>();
    const matches: CvSkillSuggestion[] = [];
    for (const entry of SKILL_CATALOG) {
      const normalized = entry.name.toLowerCase();
      if (this.candidateSkillNames.has(normalized) || seen.has(normalized)) continue;
      // \b\b en vez de .includes(): un catálogo con nombres de 1-3 letras (C, R, Go, iOS)
      // hacía falsos positivos con .includes() — ej. "C" coincidía dentro de "C1" (nivel de inglés).
      const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
      if (pattern.test(text)) {
        seen.add(normalized);
        matches.push({ name: entry.name, selected: true });
      }
    }
    this.cvSuggestions = matches.slice(0, 20);
  }
}
