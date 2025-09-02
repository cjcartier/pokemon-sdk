import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Transport } from '../../src/core/http';
import { HTTPError, NetworkError } from '../core/errors';

const server = setupServer(
  http.get('https://pokeapi.co/api/v2/pokemon/pikachu/', () => HttpResponse.json({ name: 'pikachu' })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Transport', () => {
  it('GET parses JSON', async () => {
    const t = new Transport(),
      res = await t.get<{ name: string }>('/pokemon/pikachu/');

    expect(res.name).toBe('pikachu');
  });

  it('retries 500 then succeeds', async () => {
    let calls = 0;

    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/charizard/', () => {
        calls++;
        if (calls < 2) return new HttpResponse('boom', { status: 500 });
        return HttpResponse.json({ name: 'charizard' });
      }),
    );

    const t = new Transport({ retry: { attempts: 3, backoffMs: 1 } }),
      res = await t.get<{ name: string }>('/pokemon/charizard/');

    expect(res.name).toBe('charizard');
    expect(calls).toBe(2);
  });

  it('times out and retries, then fails as NetworkError', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/snorlax/', async () => {
        await new Promise(() => {});
        return HttpResponse.json({});
      }),
    );

    const t = new Transport({ timeoutMs: 10, retry: { attempts: 1, backoffMs: 1 } });

    await expect(t.get('/pokemon/snorlax/')).rejects.toThrowError(/Network error/i);
  });

  it('rethrows non-retryable HTTPError (404)', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/missingno/', () => new HttpResponse('not found', { status: 404 })),
    );

    const t = new Transport({ retry: { attempts: 3, backoffMs: 1 } });

    await expect(t.get('/pokemon/missingno/')).rejects.toBeInstanceOf(HTTPError);
  });

  it('retries on AbortError, then throws final NetworkError after attempts exhausted', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/slowpoke/', async () => {
        await new Promise(() => {});
        return HttpResponse.json({});
      }),
    );

    const t = new Transport({
      timeoutMs: 10,
      retry: { attempts: 2, backoffMs: 1 },
    });

    await expect(t.get('/pokemon/slowpoke/')).rejects.toBeInstanceOf(NetworkError);
  });
});
