/**
 * Team entity representing a saved or optimistic Pokémon team.
 */
export interface Team {
  id: string;
  trainer_id: string;
  name: string;
  pokemon_ids: number[];
  created_at: string;
}

/**
 * Payload interface for creating a new team.
 */
export interface CreateTeamInput {
  name: string;
  pokemon_ids: number[];
  trainer_id?: string;
}

// ─────────────────────────────────────────────────────────
// Mock Server GraphQL Response Contracts
// ─────────────────────────────────────────────────────────

export interface GetTeamsData {
  allTeams: Team[];
}

export interface CreateTeamData {
  createTeam: Team;
}

export interface RemoveTeamData {
  removeTeam: Team;
}
