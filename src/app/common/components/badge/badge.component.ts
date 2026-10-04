import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Reusable type-colored pill badge component rendering Pokémon types
 * and generic status badges.
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span
      class="badge badge--{{ normalizedLabel() }} badge--{{ size() }}"
    >
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1;
        white-space: nowrap;
        background-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);

        &--small {
          padding: 2px 8px;
          font-size: 10px;
        }

        &--normal {
          background-color: #a8a878;
        }
        &--fire {
          background-color: #f08030;
        }
        &--water {
          background-color: #6890f0;
        }
        &--grass {
          background-color: #78c850;
        }
        &--electric {
          background-color: #f8d030;
          color: #212529;
          text-shadow: none;
        }
        &--ice {
          background-color: #98d8d8;
          color: #212529;
          text-shadow: none;
        }
        &--fighting {
          background-color: #c03028;
        }
        &--poison {
          background-color: #a040a0;
        }
        &--ground {
          background-color: #e0c068;
        }
        &--flying {
          background-color: #a890f0;
        }
        &--psychic {
          background-color: #f85888;
        }
        &--bug {
          background-color: #a8b820;
        }
        &--rock {
          background-color: #b8a038;
        }
        &--ghost {
          background-color: #705898;
        }
        &--dragon {
          background-color: #7038f8;
        }
        &--steel {
          background-color: #b8b8d0;
          color: #212529;
          text-shadow: none;
        }
        &--dark {
          background-color: #705848;
        }
        &--fairy {
          background-color: #ee99ac;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  /** Badge text label (e.g. 'fire', 'water') */
  public readonly label = input.required<string>();

  /** Badge size token */
  public readonly size = input<'small' | 'medium'>('medium');

  /** Normalized lowercase label for BEM CSS modifier class */
  public readonly normalizedLabel = computed(() => this.label().trim().toLowerCase());
}
