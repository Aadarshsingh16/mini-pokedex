import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlClientService } from '../../core/services/graphql-client.service';
import { POKEAPI_GRAPHQL_URL } from '../../core/constants/api.constants';
import {
  GetAbilitiesData,
  GetPokemonData,
  Pokemon,
  PokemonAbility,
} from '../models/pokemon.model';
import { extractOfficialArtworkUrl } from '../../common/utils/sprite.util';
import { parsePokemonStats } from '../../common/utils/stat.util';

const GET_POKEMON_QUERY = /* GraphQL */ `
  query GetPokemon($limit: Int, $offset: Int) {
    pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: { id: asc }) {
      id
      name
      height
      weight
      pokemon_v2_pokemontypes {
        pokemon_v2_type {
          name
        }
      }
      pokemon_v2_pokemonstats {
        base_stat
        pokemon_v2_stat {
          name
        }
      }
      pokemon_v2_pokemonsprites {
        sprites
      }
    }
  }
`;

const GET_ABILITIES_QUERY = /* GraphQL */ `
  query GetAbilities($pokemonId: Int) {
    pokemon_v2_pokemonability(where: { pokemon_id: { _eq: $pokemonId } }) {
      pokemon_v2_ability {
        name
        pokemon_v2_abilityeffecttexts(where: { language_id: { _eq: 9 } }) {
          short_effect
        }
      }
      is_hidden
    }
  }
`;

/**
 * Service executing PokéAPI GraphQL queries for Pokémon catalog listings and ability details.
 */
@Injectable({
  providedIn: 'root',
})
export class PokemonApiService {
  private readonly graphqlClient = inject(GraphqlClientService);

  /**
   * Fetches a batch of Pokémon with their types, stats, and official sprites.
   *
   * @param limit Number of items to retrieve
   * @param offset Starting record index
   * @returns Observable emitting array of normalized domain Pokemon objects
   */
  public getPokemon$(limit: number, offset: number): Observable<Pokemon[]> {
    return this.graphqlClient
      .query$<GetPokemonData, { limit: number; offset: number }>(
        POKEAPI_GRAPHQL_URL,
        GET_POKEMON_QUERY,
        { limit, offset }
      )
      .pipe(
        map((response: GetPokemonData) => {
          const rawList = response.pokemon_v2_pokemon ?? [];
          return rawList.map((raw) => {
            const types = (raw.pokemon_v2_pokemontypes ?? []).map(
              (t) => t.pokemon_v2_type?.name ?? ''
            ).filter((t) => t.length > 0);

            const parsedStats = parsePokemonStats(raw.pokemon_v2_pokemonstats);
            const spriteRaw = raw.pokemon_v2_pokemonsprites?.[0]?.sprites;
            const spriteUrl = extractOfficialArtworkUrl(spriteRaw, raw.id);

            return {
              id: raw.id,
              name: raw.name,
              height: raw.height,
              weight: raw.weight,
              types,
              stats: {
                hp: parsedStats.hp,
                attack: parsedStats.attack,
                defense: parsedStats.defense,
                specialAttack: parsedStats.specialAttack,
                specialDefense: parsedStats.specialDefense,
                speed: parsedStats.speed,
              },
              totalStats: parsedStats.total,
              spriteUrl,
            };
          });
        })
      );
  }

  /**
   * Fetches ability details for a given Pokémon ID including short English effect texts.
   *
   * @param pokemonId Numeric Pokémon identifier
   * @returns Observable emitting array of PokemonAbility details
   */
  public getAbilities$(pokemonId: number): Observable<PokemonAbility[]> {
    return this.graphqlClient
      .query$<GetAbilitiesData, { pokemonId: number }>(
        POKEAPI_GRAPHQL_URL,
        GET_ABILITIES_QUERY,
        { pokemonId }
      )
      .pipe(
        map((response: GetAbilitiesData) => {
          const rawAbilities = response.pokemon_v2_pokemonability ?? [];
          return rawAbilities.map((item) => {
            const name = item.pokemon_v2_ability?.name ?? 'Unknown';
            const shortEffect =
              item.pokemon_v2_ability?.pokemon_v2_abilityeffecttexts?.[0]?.short_effect ??
              'No effect description available.';
            return {
              name,
              shortEffect,
              isHidden: Boolean(item.is_hidden),
            };
          });
        })
      );
  }
}
