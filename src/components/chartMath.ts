import type { Frequency, Point } from '../data/types';

/** Round tick values covering [min, max] with steps of 1, 2, 2.5 or 5 times a power of ten. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const spread = Math.abs(min) || 1;
    return niceTicks(min - spread / 2, max + spread / 2, count);
  }
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step);
  // Multiplying integers avoids the drift of repeated floating point addition.
  return Array.from({ length: last - first + 1 }, (_, i) => Number(((first + i) * step).toPrecision(12)));
}

const MONTHS_PER_PERIOD: Record<Frequency, number> = { month: 1, quarter: 3, year: 12 };

const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

/** Splits a series where periods are missing, so gaps are not drawn as if they were data. */
export function contiguousSegments(points: Point[], frequency: Frequency): Point[][] {
  const segments: Point[][] = [];
  for (const point of points) {
    const segment = segments.at(-1);
    const previous = segment?.at(-1);
    if (segment && previous && monthIndex(point.date) - monthIndex(previous.date) <= MONTHS_PER_PERIOD[frequency]) {
      segment.push(point);
    } else {
      segments.push([point]);
    }
  }
  return segments;
}

/** Observations from the last `years` years, counted back from the most recent one. */
export function lastYears(points: Point[], years: number): Point[] {
  const latest = points.at(-1);
  if (!latest) return [];
  const cutoff = monthIndex(latest.date) - years * 12;
  return points.filter((p) => monthIndex(p.date) > cutoff);
}

export const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** At most `max` January positions between two instants, evenly thinned. */
export function yearTicks(start: number, end: number, max: number): number[] {
  const years: number[] = [];
  for (let year = new Date(start).getUTCFullYear(); year <= new Date(end).getUTCFullYear(); year++) {
    if (Date.UTC(year, 0, 1) >= start) years.push(year);
  }
  const every = Math.max(1, Math.ceil(years.length / max));
  return years.filter((_, i) => i % every === 0).map((year) => Date.UTC(year, 0, 1));
}
