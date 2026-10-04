import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { firstValueFrom, isObservable } from 'rxjs';
import { TeamStore } from '../../state/team.store';
import { TeamApiService } from '../../services/team-api.service';
import { ToastService } from '../../../common/services/toast.service';
import { LoggerService } from '../../../core/logger.service';
import { uniqueTeamNameValidator } from './team-builder-form.component';
import { of } from 'rxjs';

describe('uniqueTeamNameValidator', () => {
  let store: TeamStore;

  beforeEach(() => {
    const mockTeamApi = {
      getTeams$: vi.fn().mockReturnValue(
        of([
          {
            id: '1',
            trainer_id: '1',
            name: 'Kanto Starters',
            pokemon_ids: [25, 6],
            created_at: '2024-01-01T00:00:00Z',
          },
        ])
      ),
      createTeam$: vi.fn(),
      removeTeam$: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TeamStore,
        { provide: TeamApiService, useValue: mockTeamApi },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() } },
        { provide: LoggerService, useValue: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } },
      ],
    });

    store = TestBed.inject(TeamStore);
    store.load();
  });

  it('should validate successfully for an unused unique team name', async () => {
    const validator = uniqueTeamNameValidator(store);
    const control = new FormControl('Brand New Squad');

    const result$ = validator(control);
    expect(isObservable(result$)).toBe(true);

    const result = await firstValueFrom(result$ as any);
    expect(result).toBeNull();
  });

  it('should invalidate when team name matches a persisted team name case-insensitively', async () => {
    const validator = uniqueTeamNameValidator(store);
    const control = new FormControl('  kanto starters  ');

    const result$ = validator(control);
    const result = await firstValueFrom(result$ as any);

    expect(result).toEqual({ teamNameTaken: true });
  });

  it('should invalidate when team name matches a pending optimistic team', async () => {
    // Inject an optimistic pending team into the store
    const mockApi = TestBed.inject(TeamApiService);
    vi.spyOn(mockApi, 'createTeam$').mockReturnValue(of()); // in-flight

    store.createTeam({
      name: 'Pending Champions',
      pokemon_ids: [1, 2, 3],
    });

    expect(store.state.teams.some((t) => t.name === 'Pending Champions')).toBe(true);

    const validator = uniqueTeamNameValidator(store);
    const control = new FormControl('pending champions');

    const result$ = validator(control);
    const result = await firstValueFrom(result$ as any);

    expect(result).toEqual({ teamNameTaken: true });
  });
});
