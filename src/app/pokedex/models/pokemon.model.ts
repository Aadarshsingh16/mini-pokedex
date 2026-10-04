/**
 * Clean domain interface representing a Pokémon for display and team building.
 */
export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  totalStats: number;
  spriteUrl: string;
}

/**
 * Clean domain interface representing a Pokémon ability with effect text.
 */
export interface PokemonAbility {
  name: string;
  shortEffect: string;
  isHidden: boolean;
}

// ─────────────────────────────────────────────────────────
// PokéAPI GraphQL Response Types
// ─────────────────────────────────────────────────────────

export interface PokemonV2PokemonType {
  pokemon_v2_type: {
    name: string;
  };
}

export interface PokemonV2PokemonStat {
  base_stat: number;
  pokemon_v2_stat: {
    name: string;
  };
}

export interface PokemonV2PokemonSprite {
  sprites: string | Record<string, unknown>;
}

export interface PokemonV2Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemontypes: PokemonV2PokemonType[];
  pokemon_v2_pokemonstats: PokemonV2PokemonStat[];
  pokemon_v2_pokemonsprites: PokemonV2PokemonSprite[];
}

export interface GetPokemonData {
  pokemon_v2_pokemon: PokemonV2Pokemon[];
}

export interface PokemonV2AbilityEffectText {
  short_effect: string;
}

export interface PokemonV2Ability {
  name: string;
  pokemon_v2_abilityeffecttexts: PokemonV2AbilityEffectText[];
}

export interface PokemonV2PokemonAbility {
  pokemon_v2_ability: PokemonV2Ability;
  is_hidden: boolean;
}

export interface GetAbilitiesData {
  pokemon_v2_pokemonability: PokemonV2PokemonAbility[];
}
