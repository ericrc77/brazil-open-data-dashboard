export type Frequency = 'month' | 'quarter' | 'year';

export interface Point {
  /** First day of the period, as yyyy-mm-dd. */
  date: string;
  value: number;
}

/** `BR` for the whole country, otherwise the two-digit IBGE state code. */
export type Territory = string;

export const BRAZIL: Territory = 'BR';
