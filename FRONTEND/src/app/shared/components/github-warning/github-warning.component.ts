import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GITHUB_RESPONSIBILITY_WARNING } from '../../constants/legal-warnings';

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
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      line-height: 1.5;
      font-size: 0.84rem;
      color: #1e3a8a;
    }

    .github-warning mat-icon {
      color: #2563eb;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .github-warning p {
      margin: 0;
      color: #1e3a8a;
      word-break: break-word;
    }
  `],
})
export class GithubWarningComponent {
  warningText = GITHUB_RESPONSIBILITY_WARNING;
}
