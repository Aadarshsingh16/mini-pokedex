import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pokemon, PokemonAbility } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';
import { StoredAsyncStatus } from '../../common/models/async-state.model';
import { LoggerService } from '../../core/logger.service';

export type SortColumn =
  | 'id'
  | 'name'
  | 'hp'
  | 'attack'
  | 'defense'
  | 'special-attack'
  | 'special-defense'
  | 'speed'
  | 'total';

export type SortDirection = 'asc' | 'desc';

export interface AbilityCacheEntry {
  status: StoredAsyncStatus;
  data: PokemonAbility[] | null;
  error: string | null;
}

export interface PokemonState {
  entities: Record<number, Pokemon>;
  allIds: number[];
  abilitiesCache: Record<number, AbilityCacheEntry>;
  searchTerm: string;
  selectedType: string | null;
  sort: {
    column: SortColumn;
    direction: SortDirection;
  };
  pagination: {
    pageIndex: number;
    pageSize: 10 | 25 | 50;
  };
  batch: {
    offset: number;
    limit: number;
    totalAvailable: number;
    hasMore: boolean;
    loadingMore: boolean;
    batchError: string | null;
  };
  status: StoredAsyncStatus;
  error: string | null;
}

const INITIAL_POKEMON_STATE: PokemonState = {
  entities: {},
  allIds: [],
  abilitiesCache: {},
  searchTerm: '',
  selectedType: null,
  sort: {
    column: 'id',
    direction: 'asc',
  },
  pagination: {
    pageIndex: 0,
    pageSize: 10,
  },
  batch: {
    offset: 0,
    limit: 200,
    totalAvailable: 0,
    hasMore: true,
    loadingMore: false,
    batchError: null,
  },
  status: 'idle',
  error: null,
};

/**
 * Custom RxJS BehaviorSubject store managing Pokémon catalog state,
 * sequential batch loading, search/type filters, pagination, and ability caches.
 */
@Injectable({
  providedIn: 'root',
})
export class PokemonStore {
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly logger = inject(LoggerService);

  private readonly state$ = new BehaviorSubject<PokemonState>(INITIAL_POKEMON_STATE);

  /** Observable stream of the entire store state */
  public readonly stateObservable$: Observable<PokemonState> = this.state$.asObservable();

  /** Current snapshot of store state */
  public get state(): PokemonState {
    return this.state$.getValue();
  }

  /**
   * Idempotently loads Pokémon catalog in sequential batches of 200.
   * If initial batch is loading, or all data has been fetched, returns immediately.
   * If a later batch failed, resumes specifically from the failed batch offset.
   */
  public load(): void {
    const currentState = this.state;

    // Idempotency check: prevent duplicate in-flight batch requests
    if (currentState.status === 'loading' || currentState.batch.loadingMore) {
      return;
    }

    if (!currentState.batch.hasMore && !currentState.batch.batchError) {
      return;
    }

    const isInitialBatch = currentState.batch.offset === 0 && currentState.allIds.length === 0;

    if (isInitialBatch) {
      this.patchState({
        status: 'loading',
        error: null,
      });
    } else {
      this.patchState({
        batch: {
          ...currentState.batch,
          loadingMore: true,
          batchError: null,
        },
      });
    }

    const { limit, offset } = currentState.batch;

    this.pokemonApi.getPokemon$(limit, offset).subscribe({
      next: (batchPokemon) => {
        const nextEntities = { ...this.state.entities };
        const nextIds = [...this.state.allIds];

        for (const p of batchPokemon) {
          if (!nextEntities[p.id]) {
            nextIds.push(p.id);
          }
          nextEntities[p.id] = p;
        }

        const hasMore = batchPokemon.length === limit;
        const nextOffset = offset + batchPokemon.length;

        this.patchState({
          entities: nextEntities,
          allIds: nextIds,
          status: 'success',
          error: null,
          batch: {
            ...this.state.batch,
            offset: nextOffset,
            hasMore,
            loadingMore: false,
            batchError: null,
          },
        });

        // Automatically fetch subsequent batch if more exist
        if (hasMore) {
          this.load();
        }
      },
      error: (err: unknown) => {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to load Pokémon catalog from server.';

        this.logger.error('PokemonStore.load', err);

        if (isInitialBatch) {
          this.patchState({
            status: 'error',
            error: errorMessage,
            batch: {
              ...this.state.batch,
              loadingMore: false,
              batchError: errorMessage,
            },
          });
        } else {
          // Keep existing rows visible; surface batch error banner above table
          this.patchState({
            batch: {
              ...this.state.batch,
              loadingMore: false,
              batchError: errorMessage,
            },
          });
        }
      },
    });
  }

  /**
   * Idempotently loads ability descriptions for a selected Pokémon ID.
   *
   * @param pokemonId ID of the target Pokémon
   */
  public loadAbilities(pokemonId: number): void {
    const existing = this.state.abilitiesCache[pokemonId];
    if (existing && (existing.status === 'loading' || existing.status === 'success')) {
      return;
    }

    const updatedCache = {
      ...this.state.abilitiesCache,
      [pokemonId]: {
        status: 'loading' as StoredAsyncStatus,
        data: null,
        error: null,
      },
    };

    this.patchState({ abilitiesCache: updatedCache });

    this.pokemonApi.getAbilities$(pokemonId).subscribe({
      next: (abilities) => {
        this.patchState({
          abilitiesCache: {
            ...this.state.abilitiesCache,
            [pokemonId]: {
              status: 'success',
              data: abilities,
              error: null,
            },
          },
        });
      },
      error: (err: unknown) => {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load ability details.';
        this.logger.error(`PokemonStore.loadAbilities(${pokemonId})`, err);
        this.patchState({
          abilitiesCache: {
            ...this.state.abilitiesCache,
            [pokemonId]: {
              status: 'error',
              data: null,
              error: errorMsg,
            },
          },
        });
      },
    });
  }

  /**
   * Updates active search filter and resets pagination index to 0.
   *
   * @param term Search query string
   */
  public setSearchTerm(term: string): void {
    this.patchState({
      searchTerm: term,
      pagination: {
        ...this.state.pagination,
        pageIndex: 0,
      },
    });
  }

  /**
   * Updates active type filter and resets pagination index to 0.
   *
   * @param type Selected Pokémon type or null for all types
   */
  public setSelectedType(type: string | null): void {
    this.patchState({
      selectedType: type,
      pagination: {
        ...this.state.pagination,
        pageIndex: 0,
      },
    });
  }

  /**
   * Updates table sort column/direction and resets pagination index to 0.
   *
   * @param column Target stat or name column
   */
  public setSort(column: SortColumn): void {
    const current = this.state.sort;
    const direction: SortDirection =
      current.column === column && current.direction === 'asc' ? 'desc' : 'asc';

    this.patchState({
      sort: { column, direction },
      pagination: {
        ...this.state.pagination,
        pageIndex: 0,
      },
    });
  }

  /**
   * Updates table page size and resets pagination index to 0.
   *
   * @param pageSize Page size (10, 25, or 50)
   */
  public setPageSize(pageSize: 10 | 25 | 50): void {
    this.patchState({
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    });
  }

  /**
   * Updates current table pagination index.
   *
   * @param pageIndex 0-indexed page number
   */
  public setPageIndex(pageIndex: number): void {
    this.patchState({
      pagination: {
        ...this.state.pagination,
        pageIndex,
      },
    });
  }

  /**
   * Helper method applying partial updates immutably to BehaviorSubject state.
   */
  private patchState(patch: Partial<PokemonState>): void {
    this.state$.next({
      ...this.state$.getValue(),
      ...patch,
    });
  }
}
