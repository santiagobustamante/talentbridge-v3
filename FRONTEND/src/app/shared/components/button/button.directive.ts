import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Aplica el estilo de botón compartido (clases .app-btn* definidas en src/styles/_button.scss)
 * sin envolver el elemento, para no romper `type="submit"`, `routerLink`, foco nativo, etc.
 *
 * Uso: <button appButton="primary" size="lg" type="submit">Guardar</button>
 *      <a appButton="secondary" routerLink="/jobs">Ver ofertas</a>
 */
@Directive({
  selector: '[appButton]',
  standalone: true,
})
export class ButtonDirective implements OnChanges {
  @Input('appButton') variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';

  private appliedClasses: string[] = [];

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngOnChanges(): void {
    for (const cls of this.appliedClasses) {
      this.renderer.removeClass(this.el.nativeElement, cls);
    }
    this.appliedClasses = ['app-btn', `app-btn--${this.variant}`, `app-btn--${this.size}`];
    for (const cls of this.appliedClasses) {
      this.renderer.addClass(this.el.nativeElement, cls);
    }
  }
}
