import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '../../models/team.model';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { getFallbackSpriteUrl } from '../../../common/utils/sprite.util';
import { IconComponent } from '../../../common/components/icon/icon.component';

/**
 * Team card component displaying team members, sprites with fallback,
 * selection state, pending status indicators, and delete action.
 */
@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './team-card.component.html',
  styleUrl: './team-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCardComponent {
  private readonly store = inject(PokemonStore);

  /** Team domain entity */
  public readonly team = input.required<Team>();

  /** Whether this team is currently selected */
  public readonly isSelected = input<boolean>(false);

  /** Whether this team is pending optimistic server creation */
  public readonly isPendingCreation = input<boolean>(false);

  /** Whether this team is pending optimistic server deletion */
  public readonly isPendingDeletion = input<boolean>(false);

  /** Emits when user clicks to select this team */
  public readonly select = output<string>();

  /** Emits when user clicks to delete this team */
  public readonly delete = output<string>();

  /**
   * Resolves official artwork sprite or fallback PokeAPI sprite URL
   * for each member Pokémon ID.
   */
  public readonly members = computed(() => {
    const ids = this.team().pokemon_ids;
    const entities = this.store.state.entities;

    return ids.map((id) => {
      const p = entities[id];
      return {
        id,
        name: p?.name ?? `Pokémon #${id}`,
        spriteUrl: p?.spriteUrl ?? getFallbackSpriteUrl(id),
      };
    });
  });

  /** Formatted creation date */
  public readonly formattedDate = computed(() => {
    try {
      return new Date(this.team().created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return this.team().created_at;
    }
  });

  public onSelect(): void {
    if (!this.isPendingDeletion()) {
      this.select.emit(this.team().id);
    }
  }

  public onDelete(event: Event): void {
    event.stopPropagation();
    if (!this.isPendingCreation() && !this.isPendingDeletion()) {
      this.delete.emit(this.team().id);
    }
  }
}
