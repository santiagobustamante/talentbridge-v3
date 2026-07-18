import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GITHUB_RESPONSIBILITY_WARNING } from '../../constants/legal-warnings';

/**
 * Aviso legal fijo que se muestra cerca de campos donde el candidato puede pegar
 * enlaces a repositorios (ej. proyectos del portafolio), recordando que la
 * responsabilidad sobre el contenido compartido es suya. Sin `@Input`/`@Output`:
 * el texto viene de la constante `GITHUB_RESPONSIBILITY_WARNING`.
 */
@Component({
  selector: 'app-github-warning',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="github-warning">
      <mat-icon>info</mat-icon>
      <p>{{ warningText }}</p>
    </div>
  `,
  styles: [`
    .github-warning {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      margin-top: 10px;
      border-radius: 12px;
      border: 1px solid var(--info-border);
      background: var(--info-soft);
      line-height: 1.5;
      font-size: 0.84rem;
      color: var(--info-strong);
    }

    .github-warning mat-icon {
      color: var(--info-strong);
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .github-warning p {
      margin: 0;
      color: var(--info-strong);
      word-break: break-word;
    }
  `],
})
export class GithubWarningComponent {
  warningText = GITHUB_RESPONSIBILITY_WARNING;
}
