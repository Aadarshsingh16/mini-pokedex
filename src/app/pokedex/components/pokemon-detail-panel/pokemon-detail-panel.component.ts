import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Pokemon } from '../../models/pokemon.model';
import { PokemonStore } from '../../state/pokemon.store';
import { DerivedAsyncStatus } from '../../../common/models/async-state.model';
import { BadgeComponent } from '../../../common/components/badge/badge.component';
import { UiStateComponent } from '../../../common/components/ui-state/ui-state.component';
import { IconComponent } from '../../../common/components/icon/icon.component';
import { PokemonRadarChartComponent } from '../pokemon-radar-chart/pokemon-radar-chart.component';

/**
 * Slide-in detail panel drawer displaying Pokémon physical stats,
 * official artwork, deferred animated radar chart, and 4-state abilities.
 */
@Component({
  selector: 'app-pokemon-detail-panel',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent,
    UiStateComponent,
    IconComponent,
    PokemonRadarChartComponent,
  ],
  templateUrl: './pokemon-detail-panel.component.html',
  styleUrl: './pokemon-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonDetailPanelComponent {
  private readonly store = inject(PokemonStore);

  /** Active Pokémon entity to inspect, or null if drawer closed */
  public readonly pokemon = input<Pokemon | null>(null);

  /** Emits when user requests closing the panel */
  public readonly close = output<void>();

  /** Reactive snapshot of store state for ability cache subscription */
  public readonly storeState = toSignal(this.store.stateObservable$);

  /** Whether the panel is currently open */
  public readonly isOpen = computed(() => this.pokemon() !== null);

  /**
   * Automatically load abilities when selected Pokémon changes.
   */
  constructor() {
    effect(() => {
      const p = this.pokemon();
      if (p) {
        this.store.loadAbilities(p.id);
      }
    });
  }

  /**
   * Ability cache entry for the current Pokémon.
   */
  public readonly abilityEntry = computed(() => {
    const p = this.pokemon();
    const cache = this.storeState()?.abilitiesCache;
    if (!p || !cache) {
      return { status: 'idle' as const, data: null, error: null };
    }
    return cache[p.id] ?? { status: 'idle' as const, data: null, error: null };
  });

  /**
   * Derived 4-state status for the abilities view.
   */
  public readonly abilityAsyncStatus = computed<DerivedAsyncStatus>(() => {
    const entry = this.abilityEntry();
    if (entry.status === 'loading') return 'loading';
    if (entry.status === 'error') return 'error';
    if (entry.status === 'success') {
      if (!entry.data || entry.data.length === 0) {
        return 'empty';
      }
      return 'success';
    }
    return 'idle';
  });

  /**
   * Handles user close action.
   */
  public onClose(): void {
    this.close.emit();
  }

  /**
   * Retries fetching abilities on error.
   */
  public onRetryAbilities(): void {
    const p = this.pokemon();
    if (p) {
      this.store.loadAbilities(p.id);
    }
  }
}
