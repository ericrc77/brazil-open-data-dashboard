import { useState } from 'react';
import type { ChartSeries } from './LineChart';

interface DataTableProps {
  summary: string;
  caption: string;
  periodColumn: string;
  series: ChartSeries[];
  formatValue: (value: number) => string;
  formatPeriod: (date: string) => string;
}

/** Text alternative to the chart, newest first. Rows are only rendered while open. */
export function DataTable({ summary, caption, periodColumn, series, formatValue, formatPeriod }: DataTableProps) {
  const [open, setOpen] = useState(false);
  const dates = open ? [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort().reverse() : [];
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{summary}</summary>
      {open && (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
          <table>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col">{periodColumn}</th>
                {series.map((s) => (
                  <th key={s.name} scope="col">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date}>
                  <th scope="row">{formatPeriod(date)}</th>
                  {series.map((s) => {
                    const point = s.points.find((p) => p.date === date);
                    return <td key={s.name}>{point ? formatValue(point.value) : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
