import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

/**
 * Diálogo modal genérico de confirmación (Angular Material `MatDialog`), usado en
 * toda la app para pedir "¿estás seguro?" antes de acciones destructivas o
 * importantes (ej. eliminar una habilidad, cerrar una oferta). No se usa como
 * `<app-confirm-dialog>` en un template: se abre programáticamente vía
 * `MatDialog.open(ConfirmDialogComponent, { data: {...} })` desde el componente
 * que necesita la confirmación, y `data` define el título/mensaje/labels.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button [color]="data.confirmColor || 'warn'" (click)="onConfirm()">{{ data.confirmLabel || 'Eliminar' }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string; confirmLabel?: string; confirmColor?: 'warn' | 'primary' },
  ) {}

  /** Cierra el diálogo devolviendo `true` al observable de `afterClosed()` — el llamador interpreta esto como "confirmado". */
  onConfirm() {
    this.dialogRef.close(true);
  }

  /** Cierra el diálogo devolviendo `false` — el llamador interpreta esto como "cancelado", sin ejecutar la acción. */
  onCancel() {
    this.dialogRef.close(false);
  }
}
