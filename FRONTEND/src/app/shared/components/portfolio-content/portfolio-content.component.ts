import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Profile } from '../../../core/auth/auth.models';
import { GithubWarningComponent } from '../github-warning/github-warning.component';
import { AppDatePipe } from '../../pipes/app-date.pipe';

@Component({
  selector: 'app-portfolio-content',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, GithubWarningComponent, AppDatePipe],
  templateUrl: './portfolio-content.component.html',
  styleUrl: './portfolio-content.component.scss',
})
export class PortfolioContentComponent {
  @Input({ required: true }) profile!: Profile;
  /** Modo vista previa autenticada: muestra links "Editar" por sección. */
  @Input() editable = false;

  levelLabel(level: string): string {
    const map: Record<string, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado', EXPERT: 'Experto' };
    return map[level] || level;
  }

  levelClass(level: string): string {
    const l = level?.toUpperCase() || '';
    if (l === 'EXPERT' || l === 'ADVANCED') return 'level-high';
    if (l === 'INTERMEDIATE') return 'level-mid';
    return 'level-low';
  }

  workModeLabel(mode?: string): string {
    if (!mode) return '';
    const map: Record<string, string> = { ONSITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' };
    return map[mode] || mode;
  }

  contractTypeLabel(type?: string): string {
    if (!type) return '';
    const map: Record<string, string> = { FULL_TIME: 'Tiempo completo', PART_TIME: 'Medio tiempo', CONTRACTOR: 'Contratista', INTERNSHIP: 'Prácticas', FREELANCE: 'Freelance', TEMPORARY: 'Temporal', OTHER: 'Otro' };
    return map[type] || type;
  }

  projectStatusLabel(status?: string): string {
    if (!status) return '';
    const map: Record<string, string> = { PLANNED: 'Planificado', IN_PROGRESS: 'En progreso', COMPLETED: 'Completado' };
    return map[status] || status;
  }
}
