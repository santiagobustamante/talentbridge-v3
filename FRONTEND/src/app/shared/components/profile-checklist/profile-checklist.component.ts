import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface ProfileChecklistItem {
  label: string;
  done: boolean;
  route: string;
}

@Component({
  selector: 'app-profile-checklist',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './profile-checklist.component.html',
  styleUrl: './profile-checklist.component.scss',
})
export class ProfileChecklistComponent {
  @Input() percent = 0;
  @Input() items: ProfileChecklistItem[] = [];

  readonly ringCircumference = 2 * Math.PI * 42;

  get ringOffset(): number {
    return this.ringCircumference - (this.ringCircumference * this.percent) / 100;
  }
}
