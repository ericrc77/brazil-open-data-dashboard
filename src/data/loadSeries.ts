// Fetches a series with a time limit, one retry and a browser cache that doubles as a fallback
// when the public API is unavailable. Cached data is always identified as such to the reader.

import type { Indicator } from './indicators';
import { DataFormatError } from './parsers';
import type { Point, Territory } from './types';

export const FRESH_MS = 6 * 60 * 60 * 1000;
export const TIMEOUT_MS = 20_000;

export interface Series {
  points: Point[];
  /** Epoch milliseconds of the successful download. */
  fetchedAt: number;
  /** The source could not be reached and an older download is shown. */
  stale: boolean;
}

export interface LoadOptions {
  fetchFn?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
  timeoutMs?: number;
  /** Ignore a fresh cache, for an explicit reload. */
  force?: boolean;
}

interface CacheEntry {
  points: Point[];
  fetchedAt: number;
}

export const cacheKey = (indicator: Indicator, territory: Territory) => `brod:v1:${indicator.id}:${territory}`;

/** Browser storage can be missing or throw (private mode, quota, blocked cookies). */
function browserStorage(): LoadOptions['storage'] {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readCache(storage: LoadOptions['storage'], key: string): CacheEntry | null {
  try {
    const entry = JSON.parse(storage?.getItem(key) ?? 'null') as CacheEntry | null;
    const valid =
      entry &&
      typeof entry.fetchedAt === 'number' &&
      Array.isArray(entry.points) &&
      entry.points.length > 0 &&
      entry.points.every((p) => typeof p?.date === 'string' && Number.isFinite(p.value));
    return valid ? entry : null;
  } catch {
    return null;
  }
}

function writeCache(storage: LoadOptions['storage'], key: string, entry: CacheEntry) {
  try {
    storage?.setItem(key, JSON.stringify(entry));
  } catch {
    // The cache is an optimization; the data is already in hand.
  }
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function download(url: string, fetchFn: typeof fetch, timeoutMs: number): Promise<unknown> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new HttpError(response.status);
  try {
    return await response.json();
  } catch {
    throw new DataFormatError('The response is not JSON');
  }
}

/** Client errors will not change on a second attempt. */
const retryable = (error: unknown) => !(error instanceof HttpError && error.status < 500 && error.status !== 429);

export async function loadSeries(indicator: Indicator, territory: Territory, options: LoadOptions = {}): Promise<Series> {
  const { fetchFn = (...args) => fetch(...args), now = Date.now, timeoutMs = TIMEOUT_MS, force = false } = options;
  const storage = 'storage' in options ? options.storage : browserStorage();
  const key = cacheKey(indicator, territory);
  const cached = readCache(storage, key);
  if (!force && cached && now() - cached.fetchedAt < FRESH_MS) return { ...cached, stale: false };

  const today = new Date(now());
  const url = indicator.requestUrl(territory, today);
  try {
    const body = await download(url, fetchFn, timeoutMs).catch((error: unknown) => {
      if (!retryable(error)) throw error;
      return download(url, fetchFn, timeoutMs);
    });
    const points = indicator.parse(body, today);
    if (points.length === 0) throw new DataFormatError('The series is empty');
    const entry = { points, fetchedAt: now() };
    writeCache(storage, key, entry);
    return { ...entry, stale: false };
  } catch (error) {
    if (cached) return { ...cached, stale: true };
    throw error;
  }
}
