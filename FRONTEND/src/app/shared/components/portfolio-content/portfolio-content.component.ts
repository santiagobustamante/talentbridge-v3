import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Profile } from '../../../core/auth/auth.models';
import { GithubWarningComponent } from '../github-warning/github-warning.component';
import { AppDatePipe } from '../../pipes/app-date.pipe';
import { formatPhoneDisplay } from '../../utils/normalize';

/**
 * Contenido "de negocio" del portafolio profesional de un candidato (datos personales,
 * experiencia, educación, proyectos, habilidades), separado del wrapper de
 * ruteo/layout para poder reutilizarse en dos contextos: la página pública
 * `/portfolio/:slug` (solo lectura) y la vista previa dentro del área autenticada
 * del candidato (con `editable` en true, que agrega links "Editar" por sección).
 */
@Component({
  selector: 'app-portfolio-content',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, GithubWarningComponent, AppDatePipe],
  templateUrl: './portfolio-content.component.html',
  styleUrl: './portfolio-content.component.scss',
})
export class PortfolioContentComponent {
  /** Perfil completo (datos personales + experiencia + educación + proyectos + habilidades) a renderizar. */
  @Input({ required: true }) profile!: Profile;
  /** Modo vista previa autenticada: muestra links "Editar" por sección. */
  @Input() editable = false;

  /** Formatea un teléfono guardado (dígitos crudos) al formato agrupado para mostrar; vacío si no hay valor. */
  displayPhone(value: unknown): string {
    const text = String(value ?? '').trim();
    return text ? formatPhoneDisplay(text) : '';
  }

  /** Traduce el nivel de una habilidad (BASIC/INTERMEDIATE/ADVANCED/EXPERT) a su etiqueta en español. */
  levelLabel(level: string): string {
    const map: Record<string, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado', EXPERT: 'Experto' };
    return map[level] || level;
  }

  /** Clase CSS según el nivel de la habilidad, para pintarla con distinta intensidad de color en el portafolio. */
  levelClass(level: string): string {
    const l = level?.toUpperCase() || '';
    if (l === 'EXPERT' || l === 'ADVANCED') return 'level-high';
    if (l === 'INTERMEDIATE') return 'level-mid';
    return 'level-low';
  }

  /** Traduce la modalidad de trabajo de una experiencia (ONSITE/REMOTE/HYBRID) a español. */
  workModeLabel(mode?: string): string {
    if (!mode) return '';
    const map: Record<string, string> = { ONSITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' };
    return map[mode] || mode;
  }

  /** Traduce el tipo de contrato de una experiencia laboral a español. */
  contractTypeLabel(type?: string): string {
    if (!type) return '';
    const map: Record<string, string> = { FULL_TIME: 'Tiempo completo', PART_TIME: 'Medio tiempo', CONTRACTOR: 'Contratista', INTERNSHIP: 'Prácticas', FREELANCE: 'Freelance', TEMPORARY: 'Temporal', OTHER: 'Otro' };
    return map[type] || type;
  }

  /** Traduce el estado de un proyecto (PLANNED/IN_PROGRESS/COMPLETED) a español. */
  projectStatusLabel(status?: string): string {
    if (!status) return '';
    const map: Record<string, string> = { PLANNED: 'Planificado', IN_PROGRESS: 'En progreso', COMPLETED: 'Completado' };
    return map[status] || status;
  }
}
