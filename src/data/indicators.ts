// Catalog of indicators. Adding one means adding an entry here and its texts in src/i18n.

import { lastOfEachMonth, parseBcb, parseIbge } from './parsers';
import { BRAZIL, type Frequency, type Point, type Territory } from './types';

export type IndicatorId = 'ipca' | 'selic' | 'usd' | 'unemployment' | 'gdp' | 'population' | 'illiteracy';

export type Unit = 'percent' | 'brl' | 'people';

export interface Indicator {
  id: IndicatorId;
  frequency: Frequency;
  unit: Unit;
  source: 'IBGE' | 'Banco Central do Brasil';
  /** Human-readable page of the series at the publisher. */
  sourceUrl: string;
  /** Available for individual states. */
  byState: boolean;
  /** A state and the country share a scale and can be drawn together (rates, not totals). */
  compareWithBrazil: boolean;
  requestUrl(territory: Territory, today: Date): string;
  parse(body: unknown, today: Date): Point[];
}

const IBGE_API = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const BCB_API = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

/** Years of history requested from every source. */
export const HISTORY_YEARS = 10;

interface IbgeSpec {
  table: number;
  variable: number;
  periods: number;
  classification?: string;
}

function ibge(spec: IbgeSpec, frequency: Frequency) {
  return {
    frequency,
    source: 'IBGE' as const,
    sourceUrl: `https://sidra.ibge.gov.br/tabela/${spec.table}`,
    requestUrl(territory: Territory) {
      const place = territory === BRAZIL ? 'N1[all]' : `N3[${territory}]`;
      const query = new URLSearchParams({ localidades: place });
      if (spec.classification) query.set('classificacao', spec.classification);
      return `${IBGE_API}/${spec.table}/periodos/-${spec.periods}/variaveis/${spec.variable}?${query}`;
    },
    parse: (body: unknown) => parseIbge(body, frequency),
  };
}

const iso = (date: Date) => date.toISOString().slice(0, 10);
const brDate = (date: Date) => iso(date).split('-').reverse().join('/');

function bcb(series: number, transform: (points: Point[], today: Date) => Point[] = (points) => points) {
  return {
    frequency: 'month' as const,
    source: 'Banco Central do Brasil' as const,
    sourceUrl: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados?formato=json`,
    requestUrl(_territory: Territory, today: Date) {
      // The API rejects daily series spanning more than ten years.
      const start = new Date(Date.UTC(today.getUTCFullYear() - HISTORY_YEARS, today.getUTCMonth() + 1, 1));
      return `${BCB_API}.${series}/dados?formato=json&dataInicial=${brDate(start)}&dataFinal=${brDate(today)}`;
    },
    parse: (body: unknown, today: Date) => transform(parseBcb(body), today),
  };
}

const national = { byState: false, compareWithBrazil: false };

export const INDICATORS: readonly Indicator[] = [
  { id: 'ipca', unit: 'percent', ...national, ...ibge({ table: 1737, variable: 2265, periods: HISTORY_YEARS * 12 }, 'month') },
  { id: 'selic', unit: 'percent', ...national, ...bcb(432, (points, today) => lastOfEachMonth(points, iso(today))) },
  { id: 'usd', unit: 'brl', ...national, ...bcb(3698) },
  {
    id: 'unemployment',
    unit: 'percent',
    byState: true,
    compareWithBrazil: true,
    ...ibge({ table: 4099, variable: 4099, periods: HISTORY_YEARS * 4 }, 'quarter'),
  },
  {
    id: 'gdp',
    unit: 'percent',
    ...national,
    ...ibge({ table: 5932, variable: 6562, periods: HISTORY_YEARS * 4, classification: '11255[90707]' }, 'quarter'),
  },
  {
    id: 'population',
    unit: 'people',
    byState: true,
    compareWithBrazil: false,
    ...ibge({ table: 6579, variable: 9324, periods: HISTORY_YEARS }, 'year'),
  },
  {
    id: 'illiteracy',
    unit: 'percent',
    byState: true,
    compareWithBrazil: true,
    ...ibge({ table: 7113, variable: 10267, periods: HISTORY_YEARS, classification: '2[6794]|58[2795]' }, 'year'),
  },
];
