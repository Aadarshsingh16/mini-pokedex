import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { TeamStore } from '../../state/team.store';
import { PokemonAutocompleteComponent } from '../pokemon-autocomplete/pokemon-autocomplete.component';

/**
 * Custom validator ensuring at least 1 and at most 6 Pokémon are selected.
 */
function pokemonListLengthValidator(
  control: AbstractControl<number[]>
): ValidationErrors | null {
  const ids = control.value;
  if (!ids || ids.length < 1) {
    return { minPokemon: { required: 1, actual: ids?.length ?? 0 } };
  }
  if (ids.length > 6) {
    return { maxPokemon: { required: 6, actual: ids.length } };
  }
  return null;
}

/**
 * Factory creating an async validator to enforce unique team names against
 * all current store teams (persisted teams and pending optimistic teams).
 */
export function uniqueTeamNameValidator(teamStore: TeamStore): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || typeof control.value !== 'string') {
      return of(null);
    }

    const trimmed = control.value.trim().toLowerCase();
    if (trimmed.length < 3) {
      return of(null);
    }

    // Debounce validation slightly for snappy UX
    return timer(200).pipe(
      map(() => {
        const teams = teamStore.state.teams;
        const exists = teams.some(
          (t) => t.name.trim().toLowerCase() === trimmed
        );

        return exists ? { teamNameTaken: true } : null;
      })
    );
  };
}

interface TeamBuilderForm {
  name: FormControl<string>;
  pokemon_ids: FormControl<number[]>;
}

/**
 * Team builder form component built with Angular Reactive Forms,
 * implementing async uniqueness validation and 1-6 Pokémon member picker.
 */
@Component({
  selector: 'app-team-builder-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PokemonAutocompleteComponent],
  templateUrl: './team-builder-form.component.html',
  styleUrl: './team-builder-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilderFormComponent {
  private readonly fb = inject(FormBuilder);
  public readonly teamStore = inject(TeamStore);

  /** Strongly-typed reactive form group */
  public readonly teamForm: FormGroup<TeamBuilderForm> = this.fb.group<TeamBuilderForm>({
    name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
      ],
      asyncValidators: [uniqueTeamNameValidator(this.teamStore)],
    }),
    pokemon_ids: this.fb.control<number[]>([], {
      nonNullable: true,
      validators: [pokemonListLengthValidator],
    }),
  });

  /**
   * Updates Pokémon IDs in the form control when modified by autocomplete picker.
   */
  public onPokemonSelectionChange(ids: number[]): void {
    const control = this.teamForm.controls.pokemon_ids;
    control.setValue(ids);
    control.markAsDirty();
    control.markAsTouched();
  }

  /**
   * Handles form submission to create an optimistic team.
   */
  public onSubmit(): void {
    if (this.teamForm.invalid || this.teamForm.pending) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const { name, pokemon_ids } = this.teamForm.getRawValue();

    this.teamStore.createTeam({
      name: name.trim(),
      pokemon_ids,
      trainer_id: '1',
    });

    // Reset form to pristine empty state
    this.teamForm.reset({
      name: '',
      pokemon_ids: [],
    });
  }
}
