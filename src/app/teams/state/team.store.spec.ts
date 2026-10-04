import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TeamStore } from './team.store';
import { TeamApiService } from '../services/team-api.service';
import { ToastService } from '../../common/services/toast.service';
import { LoggerService } from '../../core/logger.service';
import { Team } from '../models/team.model';

describe('TeamStore Optimistic Updates & Rollbacks', () => {
  let store: TeamStore;
  let mockTeamApi: {
    getTeams$: ReturnType<typeof vi.fn>;
    createTeam$: ReturnType<typeof vi.fn>;
    removeTeam$: ReturnType<typeof vi.fn>;
  };
  let mockToast: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const initialTeams: Team[] = [
    {
      id: '1',
      trainer_id: '1',
      name: 'Kanto Starters',
      pokemon_ids: [25, 6, 9],
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      trainer_id: '1',
      name: 'Johto Squad',
      pokemon_ids: [157, 181, 214],
      created_at: '2024-03-20T14:30:00Z',
    },
  ];

  beforeEach(() => {
    mockTeamApi = {
      getTeams$: vi.fn().mockReturnValue(of(initialTeams)),
      createTeam$: vi.fn(),
      removeTeam$: vi.fn(),
    };

    mockToast = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TeamStore,
        { provide: TeamApiService, useValue: mockTeamApi },
        { provide: ToastService, useValue: mockToast },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    store = TestBed.inject(TeamStore);
    store.load();
  });

  it('should optimistically add a team with temp ID and replace it with server team on success', () => {
    const serverTeam: Team = {
      id: '42',
      trainer_id: '1',
      name: 'Electric Dream',
      pokemon_ids: [25, 26],
      created_at: '2024-04-01T00:00:00Z',
    };

    mockTeamApi.createTeam$.mockReturnValue(of(serverTeam));

    store.createTeam({
      name: 'Electric Dream',
      pokemon_ids: [25, 26],
    });

    // After success
    expect(store.state.teams.length).toBe(3);
    expect(store.state.teams[0].id).toBe('42');
    expect(store.state.teams[0].name).toBe('Electric Dream');
    expect(store.state.pendingCreationIds.length).toBe(0);
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining('Electric Dream')
    );
  });

  it('should roll back specifically by temp ID when createTeam mutation fails', () => {
    mockTeamApi.createTeam$.mockReturnValue(
      throwError(() => new Error('Server mutation network failure'))
    );

    store.createTeam({
      name: 'Failed Team',
      pokemon_ids: [1, 2],
    });

    // Team should be rolled back to initial state
    expect(store.state.teams.length).toBe(2);
    expect(store.state.teams.find((t) => t.name === 'Failed Team')).toBeUndefined();
    expect(store.state.pendingCreationIds.length).toBe(0);
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed Team')
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should roll back deleted team to its exact original index when removeTeam fails', () => {
    // Attempt to delete Johto Squad (at index 1)
    mockTeamApi.removeTeam$.mockReturnValue(
      throwError(() => new Error('Server delete network error'))
    );

    store.deleteTeam('2');

    // Should be restored at index 1
    expect(store.state.teams.length).toBe(2);
    expect(store.state.teams[1].id).toBe('2');
    expect(store.state.teams[1].name).toBe('Johto Squad');
    expect(store.state.pendingDeletionIds.length).toBe(0);
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('Johto Squad')
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should disallow deleting a team currently in pendingCreationIds', () => {
    // Start an in-flight createTeam that hasn't completed
    mockTeamApi.createTeam$.mockReturnValue(of()); // no-op stream

    store.createTeam({
      name: 'Pending Team',
      pokemon_ids: [1],
    });

    const pendingTeam = store.state.teams[0];
    expect(store.state.pendingCreationIds).toContain(pendingTeam.id);

    // Attempt delete
    store.deleteTeam(pendingTeam.id);

    expect(mockTeamApi.removeTeam$).not.toHaveBeenCalled();
    expect(mockToast.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cannot delete a team while its creation is pending')
    );
  });
});
