/**
 * Fallback sprite URL generator based on the official PokeAPI sprite repository.
 */
export function getFallbackSpriteUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

/**
 * Extracts the official-artwork front_default sprite URL from the GraphQL sprites field.
 * Handles both parsed object structures and serialized JSON strings, falling back to the id-based sprite URL.
 *
 * @param spritesField The raw `sprites` property from PokéAPI (string or object)
 * @param pokemonId The Pokémon ID used for fallback URL generation
 * @returns Resolvable image URL string
 */
export function extractOfficialArtworkUrl(
  spritesField: string | Record<string, unknown> | null | undefined,
  pokemonId: number
): string {
  const fallback = getFallbackSpriteUrl(pokemonId);

  if (!spritesField) {
    return fallback;
  }

  let parsed: Record<string, unknown> | null = null;

  if (typeof spritesField === 'string') {
    try {
      parsed = JSON.parse(spritesField) as Record<string, unknown>;
    } catch {
      return fallback;
    }
  } else if (typeof spritesField === 'object') {
    parsed = spritesField;
  }

  if (!parsed) {
    return fallback;
  }

  const other = parsed['other'] as Record<string, unknown> | undefined;
  if (other && typeof other === 'object') {
    const officialArtwork = other['official-artwork'] as Record<string, unknown> | undefined;
    if (officialArtwork && typeof officialArtwork === 'object') {
      const frontDefault = officialArtwork['front_default'];
      if (typeof frontDefault === 'string' && frontDefault.trim().length > 0) {
        return frontDefault;
      }
    }
  }

  const frontDefault = parsed['front_default'];
  if (typeof frontDefault === 'string' && frontDefault.trim().length > 0) {
    return frontDefault;
  }

  return fallback;
}
