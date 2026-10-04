import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TeamStore } from '../../state/team.store';
import { TeamSelectors } from '../../state/team.selectors';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { CacheService } from '../../../common/services/cache.service';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { TeamBuilderFormComponent } from '../team-builder-form/team-builder-form.component';
import { TeamListComponent } from '../team-list/team-list.component';
import { BadgeComponent } from '../../../common/components/badge/badge.component';

const SELECTED_TEAM_CACHE_KEY = 'selected_team_id';

/**
 * Smart container component for the Teams feature page.
 * Manages selected team persistence, computed team metrics (type distribution & total stats),
 * and coordinates between the team builder form and team list.
 */
@Component({
  selector: 'app-teams-page',
  standalone: true,
  imports: [
    CommonModule,
    TeamBuilderFormComponent,
    TeamListComponent,
    BadgeComponent,
  ],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsPageComponent implements OnInit {
  private readonly teamStore = inject(TeamStore);
  private readonly teamSelectors = inject(TeamSelectors);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly cacheService = inject(CacheService);

  /** Currently selected team ID signal */
  public readonly selectedTeamId = signal<string | null>(null);

  /** Store selectors projected to signals per spec */
  public readonly allTeams = toSignal(this.teamSelectors.allTeams$, { initialValue: [] });

  public readonly teamAsyncState = toSignal(this.teamSelectors.teamAsyncState$, {
    initialValue: { status: 'loading', data: null, error: null },
  });

  public readonly pendingCreationIds = toSignal(this.teamSelectors.pendingCreationIds$, {
    initialValue: [],
  });

  public readonly pendingDeletionIds = toSignal(this.teamSelectors.pendingDeletionIds$, {
    initialValue: [],
  });

  /** Selected team entity reference */
  public readonly selectedTeam = computed(() => {
    const id = this.selectedTeamId();
    if (!id) return null;
    return this.allTeams().find((t) => t.id === id) ?? null;
  });

  /** Selected team Pokémon domain entities */
  public readonly selectedTeamPokemon = computed<Pokemon[]>(() => {
    const team = this.selectedTeam();
    if (!team) return [];

    const entities = this.pokemonStore.state.entities;
    return team.pokemon_ids
      .map((id) => entities[id])
      .filter((p): p is Pokemon => p !== undefined);
  });

  /** Computed type distribution for selected team members */
  public readonly teamTypeDistribution = computed(() => {
    const pokemonList = this.selectedTeamPokemon();
    const map: Record<string, number> = {};

    for (const p of pokemonList) {
      for (const t of p.types) {
        map[t] = (map[t] ?? 0) + 1;
      }
    }

    return Object.entries(map).map(([type, count]) => ({ type, count }));
  });

  /** Computed total base stats across all members of selected team */
  public readonly teamTotalStats = computed(() => {
    const pokemonList = this.selectedTeamPokemon();
    return pokemonList.reduce((sum, p) => sum + p.totalStats, 0);
  });

  /** Computed average base stats across all members of selected team */
  public readonly teamAverageStats = computed(() => {
    const pokemonList = this.selectedTeamPokemon();
    if (pokemonList.length === 0) return 0;
    return Math.round(this.teamTotalStats() / pokemonList.length);
  });

  constructor() {
    // Restore selected team ID from CacheService
    const cachedId = this.cacheService.get<string>(SELECTED_TEAM_CACHE_KEY);
    if (cachedId) {
      this.selectedTeamId.set(cachedId);
    }

    // Persist selected team ID to CacheService on change
    effect(() => {
      const id = this.selectedTeamId();
      if (id) {
        this.cacheService.set(SELECTED_TEAM_CACHE_KEY, id);
      } else {
        this.cacheService.remove(SELECTED_TEAM_CACHE_KEY);
      }
    });

    // Validate cached team ID against loaded teams; if missing, reset to null
    effect(() => {
      const teams = this.allTeams();
      const currentSelected = this.selectedTeamId();
      if (currentSelected && teams.length > 0) {
        const exists = teams.some((t) => t.id === currentSelected);
        if (!exists) {
          this.selectedTeamId.set(null);
        }
      }
    });
  }

  public ngOnInit(): void {
    // Both teams and pokemon catalog must be loaded for full display
    this.teamStore.load();
    this.pokemonStore.load();
  }

  public onSelectTeam(id: string): void {
    this.selectedTeamId.update((curr) => (curr === id ? null : id));
  }

  public onDeleteTeam(id: string): void {
    if (this.selectedTeamId() === id) {
      this.selectedTeamId.set(null);
    }
    this.teamStore.deleteTeam(id);
  }

  public onRetry(): void {
    this.teamStore.load();
  }
}
