import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

/**
 * Diálogo modal para reportar contenido (Fase 12 — moderación) — pide un
 * motivo de texto libre antes de enviar el reporte. Mismo patrón de uso que
 * `ConfirmDialogComponent` (se abre programáticamente vía `MatDialog.open`),
 * pero con un campo de texto en vez de solo sí/no.
 */
@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Motivo</mat-label>
        <textarea matInput rows="3" [(ngModel)]="reason" maxlength="1000" placeholder="Contanos qué está mal..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="warn" [disabled]="!reason.trim()" (click)="onConfirm()">Reportar</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-top: 8px; }`],
})
export class ReportDialogComponent {
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<ReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string },
  ) {}

  onConfirm() {
    if (!this.reason.trim()) return;
    this.dialogRef.close(this.reason.trim());
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
