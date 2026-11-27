import { useEffect, useState } from 'react';
import type { Indicator } from '../data/indicators';
import { loadSeries, type Series } from '../data/loadSeries';
import type { Territory } from '../data/types';

export type SeriesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; series: Series };

/** Series of one indicator in one territory; `null` territory means nothing to load. */
export function useSeries(indicator: Indicator, territory: Territory | null): SeriesState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const key = `${indicator.id}:${territory}:${attempt}`;
  const [result, setResult] = useState<{ key: string; state: SeriesState } | null>(null);

  useEffect(() => {
    if (territory === null) return;
    let current = true;
    loadSeries(indicator, territory, { force: attempt > 0 }).then(
      (series) => current && setResult({ key, state: { status: 'ready', series } }),
      () => current && setResult({ key, state: { status: 'error' } }),
    );
    // A response that arrives after the filters changed is ignored.
    return () => {
      current = false;
    };
  }, [indicator, territory, attempt, key]);

  // A result that belongs to other filters is never shown under the current ones.
  const state: SeriesState = result?.key === key ? result.state : { status: 'loading' };
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
