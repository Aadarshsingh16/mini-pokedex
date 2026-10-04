import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Reusable SVG icon component rendering icons from the assets/icons/ directory
 * following the developer guide conventions (ic_<name>.svg).
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <img
      [src]="iconPath()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [alt]="alt()"
      [attr.aria-hidden]="ariaHidden()"
      class="app-icon"
      loading="lazy"
    />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
      }
      .app-icon {
        display: block;
        user-select: none;
        pointer-events: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  /** Icon name (e.g. 'search', 'close', 'arrow_left', 'delete') */
  public readonly name = input.required<string>();

  /** Icon dimension in pixels (width and height) */
  public readonly size = input<number>(20);

  /** Accessibility label text */
  public readonly alt = input<string>('');

  /** Accessibility aria-hidden attribute */
  public readonly ariaHidden = input<boolean>(true);

  /** Resolved asset URL path */
  public readonly iconPath = computed(() => {
    const raw = this.name().trim();
    const fileName = raw.startsWith('ic_') ? raw : `ic_${raw}`;
    return `assets/icons/${fileName}.svg`;
  });
}
