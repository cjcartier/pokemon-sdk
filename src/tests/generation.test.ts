import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { type NamedAPIResource, PokeClient } from '../../src';
import type { Paginated } from '../../src/core/types';

const genPage: Paginated<NamedAPIResource> = {
  count: 2,
  next: null,
  previous: null,
  results: [
    { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
    { name: 'generation-ii', url: 'https://pokeapi.co/api/v2/generation/2/' },
  ],
};

const server = setupServer(
  http.get('https://pokeapi.co/api/v2/generation/1/', () =>
    HttpResponse.json({
      id: 1,
      name: 'generation-i',
      main_region: { name: 'kanto', url: 'https://pokeapi.co/api/v2/region/1/' },
      pokemon_species: [{ name: 'bulbasaur', url: 'x' }],
    }),
  ),
  http.get('https://pokeapi.co/api/v2/generation', () => HttpResponse.json(genPage)),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('GenerationAPI', () => {
  it('getGeneration returns and caches', async () => {
    const client = new PokeClient(),
      g1 = await client.generation.getGeneration(1);

    expect(g1.name).toBe('generation-i');

    server.use(http.get('https://pokeapi.co/api/v2/generation/1/', () => HttpResponse.json({ name: 'changed' })));

    const g2 = await client.generation.getGeneration(1);

    expect(g2.name).toBe('generation-i');
  });

  it('listGenerations returns paginated NamedAPIResource', async () => {
    const client = new PokeClient(),
      page = await client.generation.listGenerations({ limit: 50, offset: 0 });

    expect(page.count).toBe(2);
    expect(page.results[0]?.name).toBe('generation-i');
  });

  it('iterateGenerations streams across pages (single page here)', async () => {
    const client = new PokeClient(),
      out: string[] = [];

    for await (const g of client.generation.iterateGenerations({ pageSize: 100 })) {
      out.push(g.name);
    }

    expect(out).toEqual(['generation-i', 'generation-ii']);
  });
});
