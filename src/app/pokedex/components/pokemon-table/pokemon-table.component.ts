import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';
import { SortColumn, SortDirection, PokemonState } from '../../state/pokemon.store';
import { DerivedAsyncStatus } from '../../../common/models/async-state.model';
import { BadgeComponent } from '../../../common/components/badge/badge.component';
import { UiStateComponent } from '../../../common/components/ui-state/ui-state.component';
import { IconComponent } from '../../../common/components/icon/icon.component';

/**
 * Dumb table component rendering paginated and sortable Pokémon data,
 * handling all four UI states with zero layout shifts.
 */
@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [CommonModule, BadgeComponent, UiStateComponent],
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTableComponent {
  /** Array of Pokémon for the active page */
  public readonly pokemonList = input<Pokemon[]>([]);

  /** Active view async state status */
  public readonly status = input.required<DerivedAsyncStatus>();

  /** Error message if status is 'error' */
  public readonly errorMessage = input<string | null>(null);

  /** Currently selected Pokémon ID in detail drawer */
  public readonly selectedPokemonId = input<number | null>(null);

  /** Current sort column and direction */
  public readonly sort = input<{ column: SortColumn; direction: SortDirection }>({
    column: 'id',
    direction: 'asc',
  });

  /** Current pagination configuration */
  public readonly pagination = input<{ pageIndex: number; pageSize: 10 | 25 | 50 }>({
    pageIndex: 0,
    pageSize: 10,
  });

  /** Total number of filtered Pokémon available across all pages */
  public readonly totalCount = input<number>(0);

  /** Sequential batch loading state from store */
  public readonly batch = input<PokemonState['batch'] | null>(null);

  /** Emits when a column header is clicked to toggle sort */
  public readonly sortChange = output<SortColumn>();

  /** Emits when the page size is altered */
  public readonly pageSizeChange = output<10 | 25 | 50>();

  /** Emits when moving to a new page index */
  public readonly pageIndexChange = output<number>();

  /** Emits when a row is selected */
  public readonly pokemonSelect = output<number>();

  /** Emits when a retry action is requested */
  public readonly retry = output<void>();

  /** Total number of pages based on totalCount and pageSize */
  public readonly totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pagination().pageSize;
    return Math.max(1, Math.ceil(total / size));
  });

  /** 1-based start record index for current page */
  public readonly rangeStart = computed(() => {
    if (this.totalCount() === 0) return 0;
    return this.pagination().pageIndex * this.pagination().pageSize + 1;
  });

  /** 1-based end record index for current page */
  public readonly rangeEnd = computed(() => {
    const end = (this.pagination().pageIndex + 1) * this.pagination().pageSize;
    return Math.min(end, this.totalCount());
  });

  /**
   * Sortable stat columns list definition.
   */
  public readonly statColumns: { id: SortColumn; label: string }[] = [
    { id: 'hp', label: 'HP' },
    { id: 'attack', label: 'Atk' },
    { id: 'defense', label: 'Def' },
    { id: 'special-attack', label: 'Sp. Atk' },
    { id: 'special-defense', label: 'Sp. Def' },
    { id: 'speed', label: 'Spd' },
    { id: 'total', label: 'Total' },
  ];

  /**
   * Handles column header click to trigger sorting.
   */
  public onHeaderClick(column: SortColumn): void {
    this.sortChange.emit(column);
  }

  /**
   * Navigates to previous page if not on first page.
   */
  public onPrevPage(): void {
    const current = this.pagination().pageIndex;
    if (current > 0) {
      this.pageIndexChange.emit(current - 1);
    }
  }

  /**
   * Navigates to next page if not on last page.
   */
  public onNextPage(): void {
    const current = this.pagination().pageIndex;
    if (current < this.totalPages() - 1) {
      this.pageIndexChange.emit(current + 1);
    }
  }

  /**
   * Updates page size.
   */
  public onPageSizeSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const size = Number(target.value) as 10 | 25 | 50;
    this.pageSizeChange.emit(size);
  }

  /**
   * Handles row selection.
   */
  public onRowClick(id: number): void {
    this.pokemonSelect.emit(id);
  }

  /**
   * Emits retry action.
   */
  public onRetryClick(): void {
    this.retry.emit();
  }
}
