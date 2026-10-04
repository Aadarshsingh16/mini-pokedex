import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { TeamStore } from './team.store';
import { Team } from '../models/team.model';
import { AsyncState, DerivedAsyncStatus } from '../../common/models/async-state.model';

/**
 * Selectors service deriving synchronous streams from TeamStore state.
 */
@Injectable({
  providedIn: 'root',
})
export class TeamSelectors {
  private readonly store = inject(TeamStore);

  /** Observable stream of all active teams (including pending optimistic teams) */
  public readonly allTeams$: Observable<Team[]> = this.store.stateObservable$.pipe(
    map((state) => state.teams),
    distinctUntilChanged((a, b) => a === b || (a.length === b.length && a.every((t, i) => t.id === b[i].id))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** IDs of teams currently awaiting server creation confirmation */
  public readonly pendingCreationIds$: Observable<string[]> = this.store.stateObservable$.pipe(
    map((state) => state.pendingCreationIds),
    distinctUntilChanged()
  );

  /** IDs of teams currently awaiting server deletion confirmation */
  public readonly pendingDeletionIds$: Observable<string[]> = this.store.stateObservable$.pipe(
    map((state) => state.pendingDeletionIds),
    distinctUntilChanged()
  );

  /**
   * Derived 4-state AsyncState for team list view.
   * If stored status is 'success' and team list is empty, derives 'empty'.
   */
  public readonly teamAsyncState$: Observable<AsyncState<Team[]>> = this.store.stateObservable$.pipe(
    map((state) => {
      if (state.status === 'loading') {
        return {
          status: 'loading' as DerivedAsyncStatus,
          data: null,
          error: null,
        };
      }

      if (state.status === 'error') {
        return {
          status: 'error' as DerivedAsyncStatus,
          data: null,
          error: state.error ?? 'Failed to load teams.',
        };
      }

      if (state.status === 'success') {
        if (state.teams.length === 0) {
          return {
            status: 'empty' as DerivedAsyncStatus,
            data: [],
            error: null,
          };
        }

        return {
          status: 'success' as DerivedAsyncStatus,
          data: state.teams,
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
