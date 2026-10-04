import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlClientService } from '../../core/services/graphql-client.service';
import { MOCK_GRAPHQL_URL } from '../../core/constants/api.constants';
import {
  CreateTeamData,
  GetTeamsData,
  RemoveTeamData,
  Team,
} from '../models/team.model';

const GET_TEAMS_QUERY = /* GraphQL */ `
  query GetTeams {
    allTeams {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

const CREATE_TEAM_MUTATION = /* GraphQL */ `
  mutation CreateTeam(
    $trainer_id: ID!
    $name: String!
    $pokemon_ids: [Int]!
    $created_at: String!
  ) {
    createTeam(
      trainer_id: $trainer_id
      name: $name
      pokemon_ids: $pokemon_ids
      created_at: $created_at
    ) {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

const REMOVE_TEAM_MUTATION = /* GraphQL */ `
  mutation RemoveTeam($id: ID!) {
    removeTeam(id: $id) {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

/**
 * Service executing mock server GraphQL queries and mutations for teams.
 */
@Injectable({
  providedIn: 'root',
})
export class TeamApiService {
  private readonly graphqlClient = inject(GraphqlClientService);

  /**
   * Queries all persisted teams from the local mock GraphQL server.
   *
   * @returns Observable emitting array of teams
   */
  public getTeams$(): Observable<Team[]> {
    return this.graphqlClient
      .query$<GetTeamsData>(MOCK_GRAPHQL_URL, GET_TEAMS_QUERY)
      .pipe(map((res) => res.allTeams ?? []));
  }

  /**
   * Executes createTeam mutation on local mock GraphQL server.
   * Note: Mutations never retry automatically.
   *
   * @param trainer_id Numeric or ID string for the trainer
   * @param name Unique team name
   * @param pokemon_ids Array of 1 to 6 Pokémon IDs
   * @param created_at ISO 8601 timestamp string
   * @returns Observable emitting the newly created team
   */
  public createTeam$(
    trainer_id: string,
    name: string,
    pokemon_ids: number[],
    created_at: string
  ): Observable<Team> {
    return this.graphqlClient
      .mutate$<
        CreateTeamData,
        {
          trainer_id: string;
          name: string;
          pokemon_ids: number[];
          created_at: string;
        }
      >(MOCK_GRAPHQL_URL, CREATE_TEAM_MUTATION, {
        trainer_id,
        name,
        pokemon_ids,
        created_at,
      })
      .pipe(map((res) => res.createTeam));
  }

  /**
   * Executes removeTeam mutation on local mock GraphQL server.
   * Note: Mutations never retry automatically.
   *
   * @param id The target team ID to remove
   * @returns Observable emitting the removed team
   */
  public removeTeam$(id: string): Observable<Team> {
    return this.graphqlClient
      .mutate$<RemoveTeamData, { id: string }>(
        MOCK_GRAPHQL_URL,
        REMOVE_TEAM_MUTATION,
        { id }
      )
      .pipe(map((res) => res.removeTeam));
  }
}
