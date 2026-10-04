import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PokemonStore, SortColumn } from '../../state/pokemon.store';
import { PokemonSelectors } from '../../state/pokemon.selectors';
import { PokemonFilterComponent } from '../pokemon-filter/pokemon-filter.component';
import { PokemonTableComponent } from '../pokemon-table/pokemon-table.component';
import { PokemonDetailPanelComponent } from '../pokemon-detail-panel/pokemon-detail-panel.component';

/**
 * Smart container component for the Pokédex feature view.
 * Owns the selectedPokemonId signal and coordinates data flow between
 * the PokemonStore, filter bar, and table.
 */
@Component({
  selector: 'app-pokedex-page',
  standalone: true,
  imports: [
    CommonModule,
    PokemonFilterComponent,
    PokemonTableComponent,
    PokemonDetailPanelComponent,
  ],
  templateUrl: './pokedex-page.component.html',
  styleUrl: './pokedex-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexPageComponent implements OnInit {
  protected readonly pokemonStore = inject(PokemonStore);
  protected readonly selectors = inject(PokemonSelectors);

  /** Local signal tracking the currently selected Pokémon for detail view */
  public readonly selectedPokemonId = signal<number | null>(null);

  /** Selectors exposed directly as signals */
  public readonly asyncState = toSignal(this.selectors.pokemonAsyncState$, {
    initialValue: { status: 'loading', data: null, error: null },
  });

  public readonly paginatedPokemon = toSignal(this.selectors.paginatedPokemon$, {
    initialValue: [],
  });

  public readonly totalFilteredCount = toSignal(this.selectors.totalFilteredCount$, {
    initialValue: 0,
  });

  public readonly sort = toSignal(this.selectors.sort$, {
    initialValue: { column: 'id', direction: 'asc' },
  });

  public readonly pagination = toSignal(this.selectors.pagination$, {
    initialValue: { pageIndex: 0, pageSize: 10 },
  });

  public readonly batch = toSignal(this.selectors.batch$, {
    initialValue: this.pokemonStore.state.batch,
  });

  /** Computed reference to the active selected Pokémon entity */
  public readonly selectedPokemon = computed(() => {
    const id = this.selectedPokemonId();
    if (id === null) return null;
    return this.pokemonStore.state.entities[id] ?? null;
  });

  public ngOnInit(): void {
    // Idempotent initial batch load
    this.pokemonStore.load();
  }

  /**
   * Sort column handler
   */
  public onSortChange(column: SortColumn): void {
    this.pokemonStore.setSort(column);
  }

  /**
   * Page size handler
   */
  public onPageSizeChange(size: 10 | 25 | 50): void {
    this.pokemonStore.setPageSize(size);
  }

  /**
   * Page index handler
   */
  public onPageIndexChange(pageIndex: number): void {
    this.pokemonStore.setPageIndex(pageIndex);
  }

  /**
   * Selects or toggles Pokémon detail drawer
   */
  public onPokemonSelect(id: number): void {
    this.selectedPokemonId.update((curr) => (curr === id ? null : id));
  }

  /**
   * Closes detail drawer
   */
  public onCloseDetail(): void {
    this.selectedPokemonId.set(null);
  }

  /**
   * Triggers store load retry
   */
  public onRetry(): void {
    this.pokemonStore.load();
  }
}
