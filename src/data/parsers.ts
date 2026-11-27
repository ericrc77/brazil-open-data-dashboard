import type { Frequency, Point } from './types';

/** Raised when an API answers with something other than the expected shape. */
export class DataFormatError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const pad = (n: number) => String(n).padStart(2, '0');

/** IBGE periods are `2025` (year), `202510` (month) or `202502` (second quarter). */
export function ibgePeriodToDate(period: string, frequency: Frequency): string | null {
  const match = frequency === 'year' ? /^(\d{4})$/.exec(period) : /^(\d{4})(\d{2})$/.exec(period);
  if (!match) return null;
  const [, year, part] = match;
  if (frequency === 'year') return `${year}-01-01`;
  const n = Number(part);
  const max = frequency === 'month' ? 12 : 4;
  if (n < 1 || n > max) return null;
  return `${year}-${pad(frequency === 'month' ? n : (n - 1) * 3 + 1)}-01`;
}

const NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Response of the IBGE aggregates API with one variable and one territory. Missing values are
 * published as symbols such as "..." or "-" and are left out instead of being turned into zero.
 */
export function parseIbge(body: unknown, frequency: Frequency): Point[] {
  const serie: unknown = (body as Array<{ resultados?: Array<{ series?: Array<{ serie?: unknown }> }> }>)?.[0]?.resultados?.[0]
    ?.series?.[0]?.serie;
  if (!isRecord(serie)) throw new DataFormatError('Unexpected IBGE response');
  return sorted(
    Object.entries(serie).flatMap(([period, raw]) => {
      const date = ibgePeriodToDate(period, frequency);
      return date && typeof raw === 'string' && NUMBER.test(raw) ? [{ date, value: Number(raw) }] : [];
    }),
  );
}

const BCB_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Response of a Banco Central SGS series: `[{ "data": "dd/mm/yyyy", "valor": "1.23" }]`. */
export function parseBcb(body: unknown): Point[] {
  if (!Array.isArray(body)) throw new DataFormatError('Unexpected Banco Central response');
  return sorted(
    body.flatMap((item: unknown) => {
      if (!isRecord(item) || typeof item.data !== 'string' || typeof item.valor !== 'string') return [];
      const match = BCB_DATE.exec(item.data);
      return match && NUMBER.test(item.valor) ? [{ date: `${match[3]}-${match[2]}-${match[1]}`, value: Number(item.valor) }] : [];
    }),
  );
}

/**
 * Keeps the last observation of each month up to `today`. The Selic target series lists future
 * dates until the next policy meeting, which are not observations yet.
 */
export function lastOfEachMonth(points: Point[], today: string): Point[] {
  const months = new Map<string, number>();
  for (const point of points) {
    if (point.date <= today) months.set(point.date.slice(0, 7), point.value);
  }
  return [...months].map(([month, value]) => ({ date: `${month}-01`, value }));
}

const sorted = (points: Point[]) => points.sort((a, b) => a.date.localeCompare(b.date));
