import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CreateTeamInput, Team } from '../models/team.model';
import { TeamApiService } from '../services/team-api.service';
import { StoredAsyncStatus } from '../../common/models/async-state.model';
import { ToastService } from '../../common/services/toast.service';
import { LoggerService } from '../../core/logger.service';

export interface TeamState {
  /** Array of teams in memory (including pending optimistic teams) */
  teams: Team[];
  /** Temporary IDs for teams pending creation on the server */
  pendingCreationIds: string[];
  /** IDs for teams pending deletion confirmation from the server */
  pendingDeletionIds: string[];
  /** Async status for the initial teams query */
  status: StoredAsyncStatus;
  /** Flag indicating whether any mutation is currently in flight */
  mutating: boolean;
  /** Global error string if team list query failed */
  error: string | null;
}

const INITIAL_TEAM_STATE: TeamState = {
  teams: [],
  pendingCreationIds: [],
  pendingDeletionIds: [],
  status: 'idle',
  mutating: false,
  error: null,
};

/**
 * Custom RxJS BehaviorSubject store managing teams state,
 * with ID-based optimistic creations and rollbacks to exact original indexes.
 */
@Injectable({
  providedIn: 'root',
})
export class TeamStore {
  private readonly teamApi = inject(TeamApiService);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  private readonly state$ = new BehaviorSubject<TeamState>(INITIAL_TEAM_STATE);
  private tempCounter = 0;

  /** Observable stream of the full team store state */
  public readonly stateObservable$: Observable<TeamState> = this.state$.asObservable();

  /** Synchronous snapshot of the active team store state */
  public get state(): TeamState {
    return this.state$.getValue();
  }

  /**
   * Idempotently loads the list of teams from the mock GraphQL server.
   */
  public load(): void {
    if (this.state.status === 'loading') {
      return;
    }

    this.patchState({
      status: 'loading',
      error: null,
    });

    this.teamApi.getTeams$().subscribe({
      next: (teams) => {
        this.patchState({
          teams,
          status: 'success',
          error: null,
        });
      },
      error: (err: unknown) => {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Failed to load teams from mock server.';

        this.logger.error('TeamStore.load', err);

        this.patchState({
          status: 'error',
          error: errorMsg,
        });
      },
    });
  }

  /**
   * Optimistically prepends a new team using a local temporary ID (temp-${counter}),
   * then reconciles with the server-assigned ID upon mutation completion.
   * On failure, rolls back specifically by the temporary ID.
   *
   * @param input Team creation payload
   */
  public createTeam(input: CreateTeamInput): void {
    const tempId = `temp-${++this.tempCounter}`;
    const trainerId = input.trainer_id ?? '1';
    const createdAt = new Date().toISOString();

    const optimisticTeam: Team = {
      id: tempId,
      trainer_id: trainerId,
      name: input.name.trim(),
      pokemon_ids: input.pokemon_ids,
      created_at: createdAt,
    };

    // Optimistic state update: prepend team and register pending creation ID
    this.patchState({
      teams: [optimisticTeam, ...this.state.teams],
      pendingCreationIds: [...this.state.pendingCreationIds, tempId],
      mutating: true,
    });

    this.teamApi
      .createTeam$(trainerId, optimisticTeam.name, optimisticTeam.pokemon_ids, createdAt)
      .subscribe({
        next: (serverTeam) => {
          // Reconcile: replace tempId entry with server-assigned team
          const reconciledTeams = this.state.teams.map((t) =>
            t.id === tempId ? serverTeam : t
          );

          this.patchState({
            teams: reconciledTeams,
            pendingCreationIds: this.state.pendingCreationIds.filter((id) => id !== tempId),
            mutating: this.state.pendingCreationIds.length > 1,
          });

          this.toast.success(`Team "${serverTeam.name}" created successfully!`);
        },
        error: (err: unknown) => {
          this.logger.error(`TeamStore.createTeam(${optimisticTeam.name})`, err);

          // Roll back specifically by tempId
          const rolledBackTeams = this.state.teams.filter((t) => t.id !== tempId);

          this.patchState({
            teams: rolledBackTeams,
            pendingCreationIds: this.state.pendingCreationIds.filter((id) => id !== tempId),
            mutating: this.state.pendingCreationIds.length > 1,
          });

          this.toast.error(`Failed to create team "${optimisticTeam.name}". Creation reverted.`);
        },
      });
  }

  /**
   * Optimistically deletes a team.
   * If mutation fails, re-inserts the target team at its exact original index.
   * Deletion is disallowed if the team is currently pending creation.
   *
   * @param teamId Identifier of the team to delete
   */
  public deleteTeam(teamId: string): void {
    // Prohibit deletion of teams pending initial creation confirmation
    if (this.state.pendingCreationIds.includes(teamId)) {
      this.toast.warn('Cannot delete a team while its creation is pending.');
      return;
    }

    const originalIndex = this.state.teams.findIndex((t) => t.id === teamId);
    if (originalIndex === -1) {
      return;
    }

    const targetTeam = this.state.teams[originalIndex];

    // Optimistic deletion: filter out team and register pending deletion ID
    const optimisticTeams = this.state.teams.filter((t) => t.id !== teamId);

    this.patchState({
      teams: optimisticTeams,
      pendingDeletionIds: [...this.state.pendingDeletionIds, teamId],
      mutating: true,
    });

    this.teamApi.removeTeam$(teamId).subscribe({
      next: () => {
        this.patchState({
          pendingDeletionIds: this.state.pendingDeletionIds.filter((id) => id !== teamId),
          mutating: this.state.pendingDeletionIds.length > 1,
        });

        this.toast.success(`Team "${targetTeam.name}" deleted.`);
      },
      error: (err: unknown) => {
        this.logger.error(`TeamStore.deleteTeam(${teamId})`, err);

        // Roll back: re-insert targetTeam at its exact originalIndex
        const rolledBackTeams = [...this.state.teams];
        rolledBackTeams.splice(originalIndex, 0, targetTeam);

        this.patchState({
          teams: rolledBackTeams,
          pendingDeletionIds: this.state.pendingDeletionIds.filter((id) => id !== teamId),
          mutating: this.state.pendingDeletionIds.length > 1,
        });

        this.toast.error(`Failed to delete team "${targetTeam.name}". Team restored.`);
      },
    });
  }

  /**
   * Helper immutably patching store state.
   */
  private patchState(patch: Partial<TeamState>): void {
    this.state$.next({
      ...this.state$.getValue(),
      ...patch,
    });
  }
}
