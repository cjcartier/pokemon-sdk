import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { PokeClient } from '../../src';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PokeClient.getPokemonWithGeneration', () => {
  it('returns both pokemon and generation (happy path)', async () => {
    // Pokémon -> species url
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/bulbasaur/', () =>
        HttpResponse.json({
          id: 1,
          name: 'bulbasaur',
          abilities: [],
          height: 7,
          weight: 69,
          species: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
        }),
      ),
      // Species -> generation url
      http.get('https://pokeapi.co/api/v2/pokemon-species/1/', () =>
        HttpResponse.json({
          id: 1,
          name: 'bulbasaur',
          generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
        }),
      ),
      // Generation
      http.get('https://pokeapi.co/api/v2/generation/1/', () =>
        HttpResponse.json({
          id: 1,
          name: 'generation-i',
          main_region: { name: 'kanto', url: 'https://pokeapi.co/api/v2/region/1/' },
          pokemon_species: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' }],
        }),
      ),
    );

    const client = new PokeClient({ validateResponses: true });
    const { pokemon, generation } = await client.getPokemonWithGeneration('bulbasaur');

    expect(pokemon.name).toBe('bulbasaur');
    expect(generation?.id).toBe(1);
    expect(generation?.name).toBe('generation-i');
  });

  it('returns generation undefined when species url is missing', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/mew/', () =>
        HttpResponse.json({
          id: 151,
          name: 'mew',
          abilities: [],
          height: 4,
          weight: 40,
          species: null, // no species url
        }),
      ),
    );

    const client = new PokeClient({ validateResponses: false });
    const { pokemon, generation } = await client.getPokemonWithGeneration('mew');

    expect(pokemon.name).toBe('mew');
    expect(generation).toBeUndefined();
  });

  it('returns generation undefined when species has no generation url', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/missinggen/', () =>
        HttpResponse.json({
          id: 9999,
          name: 'missinggen',
          abilities: [],
          height: 1,
          weight: 1,
          species: { name: 'missinggen', url: 'https://pokeapi.co/api/v2/pokemon-species/9999/' },
        }),
      ),
      http.get('https://pokeapi.co/api/v2/pokemon-species/9999/', () =>
        HttpResponse.json({
          id: 9999,
          name: 'missinggen',
          // generation deliberately omitted
        }),
      ),
    );

    const client = new PokeClient({ validateResponses: true });
    const { pokemon, generation } = await client.getPokemonWithGeneration('missinggen');

    expect(pokemon.name).toBe('missinggen');
    expect(generation).toBeUndefined();
  });

  it('accepts absolute species URLs (no baseUrl stripping required)', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/charmander/', () =>
        HttpResponse.json({
          id: 4,
          name: 'charmander',
          abilities: [],
          height: 6,
          weight: 85,
          // absolute URL to prove Transport.get can handle it directly
          species: { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon-species/4/' },
        }),
      ),
      http.get('https://pokeapi.co/api/v2/pokemon-species/4/', () =>
        HttpResponse.json({
          id: 4,
          name: 'charmander',
          generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
        }),
      ),
      http.get('https://pokeapi.co/api/v2/generation/1/', () =>
        HttpResponse.json({
          id: 1,
          name: 'generation-i',
          main_region: { name: 'kanto', url: 'https://pokeapi.co/api/v2/region/1/' },
          pokemon_species: [],
        }),
      ),
    );

    const client = new PokeClient();
    const result = await client.getPokemonWithGeneration('charmander');
    expect(result.pokemon.name).toBe('charmander');
    expect(result.generation?.name).toBe('generation-i');
  });
});
