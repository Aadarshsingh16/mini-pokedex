import { inject, Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { PokemonStore, SortColumn, SortDirection } from './pokemon.store';
import { Pokemon } from '../models/pokemon.model';
import { AsyncState, DerivedAsyncStatus } from '../../common/models/async-state.model';

/**
 * Pure helper function to filter a Pokémon list by search term and selected type.
 */
export function filterPokemonList(
  pokemonList: Pokemon[],
  searchTerm: string,
  selectedType: string | null
): Pokemon[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return pokemonList.filter((pokemon) => {
    // Check type filter match
    if (selectedType && !pokemon.types.map((t) => t.toLowerCase()).includes(selectedType.toLowerCase())) {
      return false;
    }

    // Check search term match against name or ID
    if (normalizedSearch.length > 0) {
      const matchesName = pokemon.name.toLowerCase().includes(normalizedSearch);
      const matchesId = pokemon.id.toString() === normalizedSearch;
      return matchesName || matchesId;
    }

    return true;
  });
}

/**
 * Pure helper function to sort a Pokémon list by a given column and direction.
 */
export function sortPokemonList(
  pokemonList: Pokemon[],
  column: SortColumn,
  direction: SortDirection
): Pokemon[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...pokemonList].sort((a, b) => {
    if (column === 'name') {
      return a.name.localeCompare(b.name) * multiplier;
    }

    if (column === 'id') {
      return (a.id - b.id) * multiplier;
    }

    if (column === 'total') {
      return (a.totalStats - b.totalStats) * multiplier;
    }

    // Stats mapping
    const statKeyMap: Record<Exclude<SortColumn, 'name' | 'id' | 'total'>, keyof Pokemon['stats']> = {
      hp: 'hp',
      attack: 'attack',
      defense: 'defense',
      'special-attack': 'specialAttack',
      'special-defense': 'specialDefense',
      speed: 'speed',
    };

    const key = statKeyMap[column as Exclude<SortColumn, 'name' | 'id' | 'total'>];
    const valA = a.stats[key] ?? 0;
    const valB = b.stats[key] ?? 0;

    return (valA - valB) * multiplier;
  });
}

/**
 * Selectors service deriving synchronous streams from PokemonStore state.
 */
@Injectable({
  providedIn: 'root',
})
export class PokemonSelectors {
  private readonly store = inject(PokemonStore);

  /** Observable array of all loaded Pokémon from entities and allIds */
  public readonly allPokemon$: Observable<Pokemon[]> = this.store.stateObservable$.pipe(
    map((state) => state.allIds.map((id) => state.entities[id]).filter(Boolean)),
    distinctUntilChanged((prev, curr) => prev.length === curr.length && prev[prev.length - 1]?.id === curr[curr.length - 1]?.id),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Stream of the raw search term */
  public readonly searchTerm$: Observable<string> = this.store.stateObservable$.pipe(
    map((state) => state.searchTerm),
    distinctUntilChanged()
  );

  /** Stream of the active type filter */
  public readonly selectedType$: Observable<string | null> = this.store.stateObservable$.pipe(
    map((state) => state.selectedType),
    distinctUntilChanged()
  );

  /** Stream of active sort settings */
  public readonly sort$: Observable<{ column: SortColumn; direction: SortDirection }> =
    this.store.stateObservable$.pipe(
      map((state) => state.sort),
      distinctUntilChanged((a, b) => a.column === b.column && a.direction === b.direction)
    );

  /** Stream of active pagination settings */
  public readonly pagination$: Observable<{ pageIndex: number; pageSize: 10 | 25 | 50 }> =
    this.store.stateObservable$.pipe(
      map((state) => state.pagination),
      distinctUntilChanged((a, b) => a.pageIndex === b.pageIndex && a.pageSize === b.pageSize)
    );

  /** Stream of sequential batch progress */
  public readonly batch$: Observable<PokemonStore['state']['batch']> = this.store.stateObservable$.pipe(
    map((state) => state.batch),
    distinctUntilChanged()
  );

  /**
   * Derived stream combining all Pokémon, search query, and type filter.
   */
  public readonly filteredPokemon$: Observable<Pokemon[]> = combineLatest([
    this.allPokemon$,
    this.searchTerm$,
    this.selectedType$,
  ]).pipe(
    map(([pokemonList, searchTerm, selectedType]) =>
      filterPokemonList(pokemonList, searchTerm, selectedType)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Total count of items matching the active filter */
  public readonly totalFilteredCount$: Observable<number> = this.filteredPokemon$.pipe(
    map((filtered) => filtered.length),
    distinctUntilChanged()
  );

  /**
   * Derived stream applying column sorting on filtered Pokémon.
   */
  public readonly sortedPokemon$: Observable<Pokemon[]> = combineLatest([
    this.filteredPokemon$,
    this.sort$,
  ]).pipe(
    map(([filtered, sort]) => sortPokemonList(filtered, sort.column, sort.direction)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /**
   * Paginated slice of Pokémon for the table display.
   */
  public readonly paginatedPokemon$: Observable<Pokemon[]> = combineLatest([
    this.sortedPokemon$,
    this.pagination$,
  ]).pipe(
    map(([sorted, pagination]) => {
      const start = pagination.pageIndex * pagination.pageSize;
      return sorted.slice(start, start + pagination.pageSize);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /**
   * Derived 4-state AsyncState for the Pokémon table view.
   * If stored status is 'success' and filtered items are empty, derives 'empty'.
   */
  public readonly pokemonAsyncState$: Observable<AsyncState<Pokemon[]>> = combineLatest([
    this.store.stateObservable$.pipe(
      map((s) => ({ status: s.status, error: s.error })),
      distinctUntilChanged((a, b) => a.status === b.status && a.error === b.error)
    ),
    this.paginatedPokemon$,
    this.totalFilteredCount$,
  ]).pipe(
    map(([{ status, error }, paginated, totalFilteredCount]) => {
      if (status === 'loading') {
        return {
          status: 'loading' as DerivedAsyncStatus,
          data: null,
          error: null,
        };
      }

      if (status === 'error') {
        return {
          status: 'error' as DerivedAsyncStatus,
          data: null,
          error: error ?? 'Failed to load Pokémon data.',
        };
      }

      if (status === 'success') {
        if (totalFilteredCount === 0) {
          return {
            status: 'empty' as DerivedAsyncStatus,
            data: [],
            error: null,
          };
        }

        return {
          status: 'success' as DerivedAsyncStatus,
          data: paginated,
          error: null,
        };
      }

      return {
        status: 'idle' as DerivedAsyncStatus,
        data: null,
        error: null,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}
