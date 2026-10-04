import { PokemonV2PokemonStat } from '../../pokedex/models/pokemon.model';

export interface ParsedStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  total: number;
}

/**
 * Normalizes an array of PokéAPI GraphQL stats into a structured 6-stat object and total.
 *
 * @param rawStats Array of stats from GraphQL response
 */
export function parsePokemonStats(rawStats: PokemonV2PokemonStat[] = []): ParsedStats {
  const result: ParsedStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
    total: 0,
  };

  for (const s of rawStats) {
    const statName = s.pokemon_v2_stat?.name?.toLowerCase();
    const val = Number(s.base_stat) || 0;

    switch (statName) {
      case 'hp':
        result.hp = val;
        break;
      case 'attack':
        result.attack = val;
        break;
      case 'defense':
        result.defense = val;
        break;
      case 'special-attack':
        result.specialAttack = val;
        break;
      case 'special-defense':
        result.specialDefense = val;
        break;
      case 'speed':
        result.speed = val;
        break;
    }
  }

  result.total =
    result.hp +
    result.attack +
    result.defense +
    result.specialAttack +
    result.specialDefense +
    result.speed;

  return result;
}
