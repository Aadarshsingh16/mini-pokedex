import { TestBed } from '@angular/core/testing';
import { PokemonStore } from './pokemon.store';
import { PokemonSelectors } from './pokemon.selectors';
import { Pokemon } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';
import { of } from 'rxjs';
import { first } from 'rxjs/operators';

describe('PokemonSelectors & PokemonStore pagination reset', () => {
  let store: PokemonStore;
  let selectors: PokemonSelectors;

  const mockPokemonList: Pokemon[] = [
    {
      id: 1,
      name: 'bulbasaur',
      height: 7,
      weight: 69,
      types: ['grass', 'poison'],
      stats: { hp: 45, attack: 49, defense: 49, specialAttack: 65, specialDefense: 65, speed: 45 },
      totalStats: 318,
      spriteUrl: 'https://example.com/1.png',
    },
    {
      id: 4,
      name: 'charmander',
      height: 6,
      weight: 85,
      types: ['fire'],
      stats: { hp: 39, attack: 52, defense: 43, specialAttack: 60, specialDefense: 50, speed: 65 },
      totalStats: 309,
      spriteUrl: 'https://example.com/4.png',
    },
    {
      id: 7,
      name: 'squirtle',
      height: 5,
      weight: 90,
      types: ['water'],
      stats: { hp: 44, attack: 48, defense: 65, specialAttack: 50, specialDefense: 64, speed: 43 },
      totalStats: 314,
      spriteUrl: 'https://example.com/7.png',
    },
  ];

  beforeEach(() => {
    const mockApiService = {
      getPokemon$: () => of(mockPokemonList),
      getAbilities$: () => of([]),
    };

    TestBed.configureTestingModule({
      providers: [
        PokemonStore,
        PokemonSelectors,
        { provide: PokemonApiService, useValue: mockApiService },
      ],
    });

    store = TestBed.inject(PokemonStore);
    selectors = TestBed.inject(PokemonSelectors);

    // Populate mock entities directly in store
    store.load();
  });

  it('should filter pokemon list by name search term', async () => {
    store.setSearchTerm('char');

    const filtered = await selectors.filteredPokemon$.pipe(first()).toPromise();
    expect(filtered).toBeDefined();
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].name).toBe('charmander');
  });

  it('should filter pokemon list by exact ID search term', async () => {
    store.setSearchTerm('7');

    const filtered = await selectors.filteredPokemon$.pipe(first()).toPromise();
    expect(filtered).toBeDefined();
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].name).toBe('squirtle');
  });

  it('should filter pokemon list by selected type', async () => {
    store.setSelectedType('water');

    const filtered = await selectors.filteredPokemon$.pipe(first()).toPromise();
    expect(filtered).toBeDefined();
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].name).toBe('squirtle');
  });

  it('should automatically reset pagination pageIndex to 0 when search term changes', () => {
    store.setPageIndex(3);
    expect(store.state.pagination.pageIndex).toBe(3);

    store.setSearchTerm('bulba');
    expect(store.state.pagination.pageIndex).toBe(0);
  });

  it('should automatically reset pagination pageIndex to 0 when type filter changes', () => {
    store.setPageIndex(2);
    expect(store.state.pagination.pageIndex).toBe(2);

    store.setSelectedType('fire');
    expect(store.state.pagination.pageIndex).toBe(0);
  });

  it('should automatically reset pagination pageIndex to 0 when sort changes', () => {
    store.setPageIndex(4);
    expect(store.state.pagination.pageIndex).toBe(4);

    store.setSort('speed');
    expect(store.state.pagination.pageIndex).toBe(0);
  });

  it('should derive empty status in pokemonAsyncState$ when search returns zero results', async () => {
    store.setSearchTerm('nonexistent-pokemon-query');

    const asyncState = await selectors.pokemonAsyncState$.pipe(first()).toPromise();
    expect(asyncState).toBeDefined();
    expect(asyncState?.status).toBe('empty');
    expect(asyncState?.data?.length).toBe(0);
  });
});
