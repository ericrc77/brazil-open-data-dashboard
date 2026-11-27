import type { Indicator } from '../data/indicators';
import { STATES } from '../data/states';
import { BRAZIL, type Territory } from '../data/types';
import { useSeries } from '../hooks/useSeries';
import { formatChange, formatPeriod, formatTimestamp, formatValue } from '../i18n/format';
import type { Strings } from '../i18n/strings';
import { lastYears } from './chartMath';
import { DataTable } from './DataTable';
import { LineChart, type ChartSeries } from './LineChart';

interface IndicatorCardProps {
  indicator: Indicator;
  territory: Territory;
  years: number;
  t: Strings;
}

export function IndicatorCard({ indicator, territory, years, t }: IndicatorCardProps) {
  const text = t.indicators[indicator.id];
  const place = indicator.byState ? territory : BRAZIL;
  const placeName = place === BRAZIL ? t.brazil : (STATES.find((s) => s.code === place)?.name ?? place);
  const main = useSeries(indicator, place);
  const reference = useSeries(indicator, place !== BRAZIL && indicator.compareWithBrazil ? BRAZIL : null);

  const points = main.status === 'ready' ? lastYears(main.series.points, years) : [];
  const latest = points.at(-1);
  const previous = points.at(-2);
  const period = (date: string) => formatPeriod(date, indicator.frequency, t);

  const series: ChartSeries[] = [{ name: placeName, color: place === BRAZIL ? '--series-1' : '--series-2', points }];
  if (place !== BRAZIL && reference.status === 'ready' && latest) {
    // The national line covers the same window as the state.
    const window = reference.series.points.filter((p) => p.date >= points[0].date);
    if (window.length) series.push({ name: t.brazil, color: '--series-1', points: window });
  }

  return (
    <article className="card" aria-labelledby={`title-${indicator.id}`} aria-busy={main.status === 'loading'}>
      <header>
        <h2 id={`title-${indicator.id}`}>{text.title}</h2>
        <p>{text.description}</p>
        {!indicator.byState && territory !== BRAZIL && <span className="badge">{t.nationalOnly}</span>}
      </header>

      {main.status === 'loading' && (
        <div className="placeholder" role="status">
          {t.loading}
        </div>
      )}

      {main.status === 'error' && (
        <div className="placeholder" role="alert">
          <span>{t.error}</span>
          <button onClick={main.retry}>{t.retry}</button>
        </div>
      )}

      {main.status === 'ready' && !latest && <div className="placeholder">{t.noData}</div>}

      {main.status === 'ready' && latest && (
        <>
          {main.series.stale && (
            <p className="stale" role="status">
              {t.stale(formatTimestamp(main.series.fetchedAt, t))}{' '}
              <button onClick={main.retry}>{t.retry}</button>
            </p>
          )}
          <p className="figure">
            <strong>{formatValue(latest.value, indicator.unit, t)}</strong>
            <span>
              {placeName} · {period(latest.date)}
              {previous && <> · {t.versus(formatChange(previous, latest, indicator.unit, t), period(previous.date))}</>}
            </span>
          </p>
          {series.length > 1 && (
            <ul className="legend">
              {series.map((s) => (
                <li key={s.name}>
                  <i style={{ background: `var(${s.color})` }} />
                  {s.name}
                </li>
              ))}
            </ul>
          )}
          <LineChart
            series={series}
            frequency={indicator.frequency}
            label={t.chartLabel(text.title)}
            help={t.chartHelp}
            formatValue={(value, compact) => formatValue(value, indicator.unit, t, compact)}
            formatPeriod={period}
          />
          <DataTable
            summary={t.showTable}
            caption={text.title}
            periodColumn={t.periodColumn}
            series={series}
            formatValue={(value) => formatValue(value, indicator.unit, t)}
            formatPeriod={period}
          />
        </>
      )}

      <footer>
        <p>{text.limitation}</p>
        <p>
          {t.source}:{' '}
          <a href={indicator.sourceUrl} target="_blank" rel="noreferrer">
            {indicator.source}
          </a>
          {main.status === 'ready' && <> · {t.retrieved(formatTimestamp(main.series.fetchedAt, t))}</>}
        </p>
      </footer>
    </article>
  );
}
