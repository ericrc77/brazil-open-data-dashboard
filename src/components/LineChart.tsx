import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Frequency, Point } from '../data/types';
import { contiguousSegments, niceTicks, toTime, yearTicks } from './chartMath';

export interface ChartSeries {
  name: string;
  /** CSS custom property holding the series color. Color follows the entity. */
  color: string;
  points: Point[];
}

interface LineChartProps {
  series: ChartSeries[];
  frequency: Frequency;
  label: string;
  help: string;
  formatValue: (value: number, compact?: boolean) => string;
  formatPeriod: (date: string) => string;
}

const HEIGHT = 190;
const MARGIN = { top: 10, right: 12, bottom: 22, left: 58 };
const DEFAULT_WIDTH = 520;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function LineChart({ series, frequency, label, help, formatValue, formatPeriod }: LineChartProps) {
  const { ref, width } = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const values = series.flatMap((s) => s.points.map((p) => p.value));
  // Rates that cross zero need the baseline; levels are scaled to their own range.
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const [low, high] = [ticks[0], ticks.at(-1)!];
  const [start, end] = [toTime(dates[0]), toTime(dates.at(-1)!)];
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (time: number) => MARGIN.left + (end === start ? innerWidth / 2 : ((time - start) / (end - start)) * innerWidth);
  const y = (value: number) => MARGIN.top + (1 - (value - low) / (high - low)) * innerHeight;

  // Filters can shorten the series while a position is selected.
  const index = active === null ? null : Math.min(active, dates.length - 1);
  const date = index === null ? null : dates[index];
  const readings = date
    ? series.flatMap((s) => s.points.filter((p) => p.date === date).map((p) => ({ ...s, value: p.value })))
    : [];

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const pointer = ((event.clientX - box.left) / (box.width || width)) * width;
    let nearest = 0;
    dates.forEach((d, i) => {
      if (Math.abs(x(toTime(d)) - pointer) < Math.abs(x(toTime(dates[nearest])) - pointer)) nearest = i;
    });
    setActive(nearest);
  }

  function onKeyDown(event: KeyboardEvent) {
    const last = dates.length - 1;
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, (index ?? last) - 1),
      ArrowRight: Math.min(last, (index ?? last - 1) + 1),
      Home: 0,
      End: last,
    };
    if (event.key === 'Escape') return setActive(null);
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(moves[event.key]);
  }

  const announcement = date ? `${formatPeriod(date)}: ${readings.map((r) => `${r.name} ${formatValue(r.value)}`).join(', ')}` : '';

  return (
    <div className="chart" ref={ref}>
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="application"
        aria-label={`${label}. ${help}`}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? dates.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className={tick === 0 ? 'baseline' : 'grid'} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {formatValue(tick, true)}
            </text>
          </g>
        ))}
        {yearTicks(start, end, Math.floor(innerWidth / 56)).map((time) => (
          <text key={time} x={x(time)} y={HEIGHT - 6} textAnchor="middle">
            {new Date(time).getUTCFullYear()}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.name} style={{ color: `var(${s.color})` }}>
            {contiguousSegments(s.points, frequency).map((segment) =>
              segment.length === 1 ? (
                <circle key={segment[0].date} className="dot" cx={x(toTime(segment[0].date))} cy={y(segment[0].value)} r={4} />
              ) : (
                <path
                  key={segment[0].date}
                  className="line"
                  d={segment.map((p, i) => `${i ? 'L' : 'M'}${x(toTime(p.date)).toFixed(2)},${y(p.value).toFixed(2)}`).join('')}
                />
              ),
            )}
          </g>
        ))}
        {date && (
          <g>
            <line className="crosshair" x1={x(toTime(date))} x2={x(toTime(date))} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
            {readings.map((r) => (
              <circle key={r.name} className="dot" style={{ color: `var(${r.color})` }} cx={x(toTime(date))} cy={y(r.value)} r={4} />
            ))}
          </g>
        )}
      </svg>
      {date && (
        <div
          className="tooltip"
          aria-hidden="true"
          style={x(toTime(date)) > width / 2 ? { right: width - x(toTime(date)) + 10 } : { left: x(toTime(date)) + 10 }}
        >
          <span className="tooltip-period">{formatPeriod(date)}</span>
          {readings.map((r) => (
            <span key={r.name} className="tooltip-row">
              <i style={{ background: `var(${r.color})` }} />
              <strong>{formatValue(r.value)}</strong> {series.length > 1 && r.name}
            </span>
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
