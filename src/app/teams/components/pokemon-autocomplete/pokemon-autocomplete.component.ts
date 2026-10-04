import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { PokemonSelectors } from '../../../pokedex/state/pokemon.selectors';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { DerivedAsyncStatus } from '../../../common/models/async-state.model';
import { IconComponent } from '../../../common/components/icon/icon.component';
import { UiStateComponent } from '../../../common/components/ui-state/ui-state.component';

/**
 * 4-state autocomplete picker allowing selection of 1 to 6 Pokémon
 * with chip representation, debounced search, and duplicate exclusion.
 */
@Component({
  selector: 'app-pokemon-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, UiStateComponent],
  templateUrl: './pokemon-autocomplete.component.html',
  styleUrl: './pokemon-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonAutocompleteComponent implements OnInit {
  private readonly store = inject(PokemonStore);
  private readonly selectors = inject(PokemonSelectors);
  private readonly destroyRef = inject(DestroyRef);

  /** Active array of selected Pokémon IDs (min 1, max 6) */
  public readonly selectedIds = input<number[]>([]);

  /** Emits when selected Pokémon IDs change */
  public readonly selectionChange = output<number[]>();

  /** Query input form control */
  public readonly queryControl = new FormControl<string>('', { nonNullable: true });

  /** Signal of current debounced search string */
  public readonly query = signal<string>('');

  /** Whether the autocomplete dropdown is open */
  public readonly isDropdownOpen = signal<boolean>(false);

  /** Reactive stream of all loaded Pokémon */
  public readonly allPokemon = toSignal(this.selectors.allPokemon$, { initialValue: [] });

  /** Store async status */
  public readonly storeStatus = toSignal(this.store.stateObservable$, {
    initialValue: this.store.state,
  });

  /** Selected Pokémon domain entities mapped from selected IDs */
  public readonly selectedPokemonList = computed<Pokemon[]>(() => {
    const ids = this.selectedIds();
    const entities = this.store.state.entities;
    return ids
      .map((id) => entities[id])
      .filter((p): p is Pokemon => p !== undefined);
  });

  /** Filtered suggestions excluding already selected Pokémon */
  public readonly suggestions = computed<Pokemon[]>(() => {
    const q = this.query().trim().toLowerCase();
    const selected = new Set(this.selectedIds());
    const list = this.allPokemon();

    return list.filter((p) => {
      if (selected.has(p.id)) return false;
      if (q.length === 0) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toString() === q
      );
    }).slice(0, 10); // Show top 10 matches
  });

  /** 4-state status for the autocomplete dropdown */
  public readonly dropdownStatus = computed<DerivedAsyncStatus>(() => {
    const s = this.storeStatus();
    if (s.status === 'loading') return 'loading';
    if (s.status === 'error') return 'error';
    if (s.status === 'success' || this.allPokemon().length > 0) {
      if (this.suggestions().length === 0) {
        return 'empty';
      }
      return 'success';
    }
    return 'idle';
  });

  public ngOnInit(): void {
    // Ensure catalog data is loaded for the picker
    this.store.load();

    this.queryControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((val) => {
        this.query.set(val);
        if (!this.isDropdownOpen() && val.trim().length > 0) {
          this.isDropdownOpen.set(true);
        }
      });
  }

  /**
   * Adds a Pokémon to the team selection (max 6).
   */
  public selectPokemon(pokemon: Pokemon): void {
    const current = this.selectedIds();
    if (current.length >= 6) {
      return;
    }
    if (!current.includes(pokemon.id)) {
      const next = [...current, pokemon.id];
      this.selectionChange.emit(next);
    }

    this.queryControl.setValue('');
    this.query.set('');
    this.isDropdownOpen.set(false);
  }

  /**
   * Removes a Pokémon from the team selection.
   */
  public removePokemon(id: number): void {
    const next = this.selectedIds().filter((currId) => currId !== id);
    this.selectionChange.emit(next);
  }

  /**
   * Retries store loading if the catalog fetch failed.
   */
  public onRetryCatalog(): void {
    this.store.load();
  }

  public openDropdown(): void {
    if (this.selectedIds().length < 6) {
      this.isDropdownOpen.set(true);
    }
  }

  public closeDropdownWithDelay(): void {
    // Delay closing slightly so click events on dropdown options can register
    setTimeout(() => {
      this.isDropdownOpen.set(false);
    }, 200);
  }
}
