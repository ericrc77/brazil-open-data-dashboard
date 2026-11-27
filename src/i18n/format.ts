import type { Unit } from '../data/indicators';
import type { Frequency, Point } from '../data/types';
import type { Strings } from './strings';

export function formatPeriod(date: string, frequency: Frequency, t: Strings): string {
  const [year, month] = date.split('-');
  if (frequency === 'year') return year;
  if (frequency === 'quarter') return t.quarter(Math.floor((Number(month) - 1) / 3) + 1, year);
  return new Intl.DateTimeFormat(t.locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

export function formatValue(value: number, unit: Unit, t: Strings, compact = false): string {
  const number = (options: Intl.NumberFormatOptions) => new Intl.NumberFormat(t.locale, options).format(value);
  if (unit === 'percent') return `${number({ minimumFractionDigits: compact ? 0 : 1, maximumFractionDigits: 2 })}%`;
  if (unit === 'brl') return `R$ ${number({ minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return number({ notation: 'compact', maximumFractionDigits: compact ? 1 : 2 });
}

/** Change between the last two observations: percentage points for rates, percent otherwise. */
export function formatChange(previous: Point, latest: Point, unit: Unit, t: Strings): string {
  const signed = (value: number) =>
    new Intl.NumberFormat(t.locale, { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value);
  if (unit === 'percent') return `${signed(latest.value - previous.value)} ${t.points}`;
  return `${signed((latest.value / previous.value - 1) * 100)}%`;
}

export function formatTimestamp(ms: number, t: Strings): string {
  return new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
}
