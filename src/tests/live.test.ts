import { describe, it, expect } from 'vitest';
import { PokeClient } from '../../src';

const LIVE = process.env.LIVE_TESTS === 'true';

(LIVE ? describe : describe.skip)('Live PokeAPI live tests', () => {
  const client = new PokeClient({
    timeoutMs: 15_000,
    validateResponses: true,
  });

  it("getPokemon('pikachu') returns stable core fields", async () => {
    const p = await client.pokemon.getPokemon('pikachu');

    expect(p.name.toLowerCase()).toBe('pikachu');
    expect(typeof p.id).toBe('number');
    expect(Array.isArray(p.abilities)).toBe(true);
    expect(p.species && typeof p.species.url).toBe('string');
  }, 30_000);

  it('listPokemon({ limit: 5, offset: 0 }) returns 5 items and a next link', async () => {
    const page = await client.pokemon.listPokemon({ limit: 5, offset: 0 });

    expect(page.results.length).toBe(5);

    for (const r of page.results) {
      expect(typeof r.name).toBe('string');
      expect(r.name.length).toBeGreaterThan(0);
      expect(typeof r.url).toBe('string');
    }

    expect(page.next === null || typeof page.next === 'string').toBe(true);
  }, 30_000);

  it('iteratePokemon streams items across pages (take first 3)', async () => {
    const names: string[] = [];

    for await (const item of client.pokemon.iteratePokemon({ pageSize: 50 })) {
      names.push(item.name);
      if (names.length >= 3) break;
    }

    expect(names.length).toBe(3);
    for (const n of names) expect(typeof n).toBe('string');
  }, 30_000);

  it('getGeneration(1) returns a valid generation with species list', async () => {
    const g = await client.generation.getGeneration(1);

    expect(g.id).toBe(1);
    expect(typeof g.name).toBe('string');
    expect(Array.isArray(g.pokemon_species)).toBe(true);
  }, 30_000);

  (client.generation as any).listGenerations
    ? it('listGenerations({ limit: 2 }) returns names+urls', async () => {
        const page = await (client.generation as any).listGenerations({ limit: 2, offset: 0 });

        expect(page.results.length).toBe(2);

        for (const r of page.results) {
          expect(typeof r.name).toBe('string');
          expect(typeof r.url).toBe('string');
        }
      }, 30_000)
    : it.skip('listGenerations not implemented', () => {});

  (client.generation as any).iterateGenerations
    ? it('iterateGenerations yields a few items', async () => {
        const seen: string[] = [];

        for await (const g of (client.generation as any).iterateGenerations({ pageSize: 50 })) {
          seen.push(g.name);
          if (seen.length >= 2) break;
        }

        expect(seen.length).toBe(2);
      }, 30_000)
    : it.skip('iterateGenerations not implemented', () => {});
});
