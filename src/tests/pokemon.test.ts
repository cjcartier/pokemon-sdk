import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { type NamedAPIResource, PokeClient } from '../../src';
import type { Paginated } from '../../src/core/types';
import { ValidationError } from '../core/errors';

const page1: Paginated<NamedAPIResource> = {
  count: 3,
  next: 'https://pokeapi.co/api/v2/pokemon?limit=2&offset=2',
  previous: null,
  results: [
    { name: 'a', url: 'https://pokeapi.co/api/v2/pokemon/a/' },
    { name: 'b', url: 'https://pokeapi.co/api/v2/pokemon/b/' },
  ],
};
const page2: Paginated<NamedAPIResource> = {
  count: 3,
  next: null,
  previous: 'https://pokeapi.co/api/v2/pokemon?limit=2&offset=0',
  results: [{ name: 'c', url: 'https://pokeapi.co/api/v2/pokemon/c/' }],
};

const server = setupServer(
  http.get('https://pokeapi.co/api/v2/pokemon/pikachu/', () =>
    HttpResponse.json({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      abilities: [],
      species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
    }),
  ),

  http.get('https://pokeapi.co/api/v2/pokemon', ({ request }) => {
    const url = new URL(request.url),
      offset = Number(url.searchParams.get('offset') || '0'),
      limit = Number(url.searchParams.get('limit') || '20');

    if (limit === 2 && offset === 0) return HttpResponse.json(page1);
    if (limit === 2 && offset === 2) return HttpResponse.json(page2);

    return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PokemonAPI', () => {
  it('getPokemon returns data and then serves from cache', async () => {
    const client = new PokeClient(),
      first = await client.pokemon.getPokemon('pikachu');

    expect(first.name).toBe('pikachu');

    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/pikachu/', () => HttpResponse.json({ name: 'not-pikachu' })),
    );

    const second = await client.pokemon.getPokemon('pikachu');

    expect(second.name).toBe('pikachu');
  });

  it('listPokemon returns paginated NamedAPIResource', async () => {
    const client = new PokeClient(),
      page = await client.pokemon.listPokemon({ limit: 2, offset: 0 });

    expect(page.results.map(r => r.name)).toEqual(['a', 'b']);
    expect(page.next).toContain('offset=2');
  });

  it('iteratePokemon yields across pages', async () => {
    const client = new PokeClient(),
      names: string[] = [];

    for await (const item of client.pokemon.iteratePokemon({ pageSize: 2 })) {
      names.push(item.name);
    }

    expect(names).toEqual(['a', 'b', 'c']);
  });
});

it('throws ValidationError when response fails schema validation', async () => {
  server.use(
    http.get('https://pokeapi.co/api/v2/pokemon/pikachu/', () =>
      HttpResponse.json({
        id: 'not-a-number', // should be a number
        name: 123, // should be a string
        abilities: 'oops', // should be an array
        species: { url: 'not-a-url' }, // fails z.url()
      }),
    ),
  );

  const client = new PokeClient({ validateResponses: true });

  await expect(client.pokemon.getPokemon('pikachu')).rejects.toBeInstanceOf(ValidationError);

  try {
    await client.pokemon.getPokemon('pikachu');
  } catch (err) {
    const e = err as ValidationError;

    expect(e.message).toMatch(/Response validation failed/i);
    expect(e.issues).toBeTruthy();
  }
});
