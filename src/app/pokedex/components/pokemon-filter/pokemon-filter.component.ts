import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PokemonStore } from '../../state/pokemon.store';
import { POKEMON_TYPES } from '../../constants/pokemon-types.constants';
import { IconComponent } from '../../../common/components/icon/icon.component';

/**
 * Filter bar component providing debounced search input and Pokémon type dropdown selector.
 */
@Component({
  selector: 'app-pokemon-filter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './pokemon-filter.component.html',
  styleUrl: './pokemon-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonFilterComponent implements OnInit {
  private readonly store = inject(PokemonStore);
  private readonly destroyRef = inject(DestroyRef);

  /** Search control tracking typed user search */
  public readonly searchControl = new FormControl<string>('', { nonNullable: true });

  /** Selected type control tracking active category filter */
  public readonly typeControl = new FormControl<string>('', { nonNullable: true });

  /** Canonical list of 18 types */
  public readonly pokemonTypes = POKEMON_TYPES;

  public ngOnInit(): void {
    // Synchronize initial store values if already present
    this.searchControl.setValue(this.store.state.searchTerm, { emitEvent: false });
    this.typeControl.setValue(this.store.state.selectedType ?? '', { emitEvent: false });

    // Debounced search input pipeline per spec
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term) => {
        this.store.setSearchTerm(term);
      });

    // Instant type dropdown pipeline
    this.typeControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((val) => {
        const type = val.trim().length > 0 ? val : null;
        this.store.setSelectedType(type);
      });
  }

  /**
   * Clears active search input text.
   */
  public clearSearch(): void {
    this.searchControl.setValue('');
  }
}
