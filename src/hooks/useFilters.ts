import { useEffect, useState } from 'react';
import { STATES } from '../data/states';
import { BRAZIL, type Territory } from '../data/types';
import type { Lang } from '../i18n/strings';

export const PERIODS = [2, 5, 10] as const;
export type Period = (typeof PERIODS)[number];

export interface Filters {
  territory: Territory;
  years: Period;
  lang: Lang;
}

/** Reads filters from the address, ignoring anything that is not a known value. */
export function parseFilters(search: string, browserLanguage: string): Filters {
  const params = new URLSearchParams(search);
  const uf = params.get('uf');
  const years = Number(params.get('years'));
  const lang = params.get('lang');
  return {
    territory: uf && STATES.some((s) => s.code === uf) ? uf : BRAZIL,
    years: PERIODS.find((p) => p === years) ?? 5,
    lang: lang === 'en' || lang === 'pt' ? lang : browserLanguage.toLowerCase().startsWith('pt') ? 'pt' : 'en',
  };
}

export function toSearch({ territory, years, lang }: Filters): string {
  const params = new URLSearchParams({ years: String(years), lang });
  if (territory !== BRAZIL) params.set('uf', territory);
  return `?${params}`;
}

/** Filters kept in the address, so a view can be shared as a link. */
export function useFilters() {
  const [filters, setFilters] = useState(() => parseFilters(window.location.search, navigator.language));
  useEffect(() => {
    window.history.replaceState(null, '', toSearch(filters));
  }, [filters]);
  const update = (change: Partial<Filters>) => setFilters((current) => ({ ...current, ...change }));
  return [filters, update] as const;
}
