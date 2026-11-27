import { INDICATORS } from '../src/data/indicators';
import { cacheKey, FRESH_MS, loadSeries } from '../src/data/loadSeries';
import { DataFormatError } from '../src/data/parsers';

const usd = INDICATORS.find((i) => i.id === 'usd')!;
const body = [{ data: '01/10/2026', valor: '5.13' }];
const ok = () => Promise.resolve(new Response(JSON.stringify(body)));
const status = (code: number) => () => Promise.resolve(new Response('', { status: code }));
const NOW = Date.UTC(2026, 10, 27);

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const load = (fetchFn: typeof fetch, storage = memory(), now = NOW, force = false) =>
  loadSeries(usd, 'BR', { fetchFn, storage, now: () => now, force });

describe('loadSeries', () => {
  it('downloads, parses and caches', async () => {
    const storage = memory();
    const series = await load(vi.fn(ok), storage);
    expect(series).toEqual({ points: [{ date: '2026-10-01', value: 5.13 }], fetchedAt: NOW, stale: false });
    expect(storage.data.has(cacheKey(usd, 'BR'))).toBe(true);
  });

  it('serves a fresh cache without a request, unless forced', async () => {
    const storage = memory();
    await load(ok, storage);
    const fetchFn = vi.fn(ok);
    await load(fetchFn, storage, NOW + FRESH_MS - 1);
    expect(fetchFn).not.toHaveBeenCalled();
    await load(fetchFn, storage, NOW + 1, true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to old data, marked as stale, when the source is down', async () => {
    const storage = memory();
    await load(ok, storage);
    const series = await load(status(503), storage, NOW + FRESH_MS + 1);
    expect(series.stale).toBe(true);
    expect(series.fetchedAt).toBe(NOW);
  });

  it('retries once after a server or network error', async () => {
    const fetchFn = vi.fn(ok).mockImplementationOnce(() => Promise.reject(new TypeError('offline')));
    await expect(load(fetchFn)).resolves.toMatchObject({ stale: false });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const failing = vi.fn(status(500));
    await expect(load(failing)).rejects.toThrow('HTTP 500');
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('does not retry a client error', async () => {
    const fetchFn = vi.fn(status(404));
    await expect(load(fetchFn)).rejects.toThrow('HTTP 404');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('treats HTML, empty or unexpected bodies as errors and never caches them', async () => {
    for (const text of ['<html>maintenance</html>', '[]', '{}']) {
      const storage = memory();
      await expect(load(() => Promise.resolve(new Response(text)), storage)).rejects.toThrow(DataFormatError);
      expect(storage.data.size).toBe(0);
    }
  });

  it('ignores a corrupted cache and storage that throws', async () => {
    const storage = memory();
    storage.data.set(cacheKey(usd, 'BR'), '{"points":[{"date":1}],"fetchedAt":"x"}');
    await expect(load(ok, storage)).resolves.toMatchObject({ stale: false });

    const broken = {
      data: new Map<string, string>(),
      getItem: (): string | null => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    await expect(load(ok, broken)).resolves.toMatchObject({ stale: false });
  });

  it('gives up on a request that never answers', async () => {
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)));
    await expect(loadSeries(usd, 'BR', { fetchFn: hanging, storage: memory(), timeoutMs: 10 })).rejects.toThrow();
  });
});
