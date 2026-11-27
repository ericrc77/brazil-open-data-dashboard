import { useEffect } from 'react';
import { IndicatorCard } from './components/IndicatorCard';
import { INDICATORS } from './data/indicators';
import { STATES } from './data/states';
import { BRAZIL } from './data/types';
import { PERIODS, useFilters } from './hooks/useFilters';
import { STRINGS, type Lang } from './i18n/strings';

const REPOSITORY = 'https://github.com/ericrc77/brazil-open-data-dashboard';

export function App() {
  const [{ territory, years, lang }, update] = useFilters();
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = t.locale;
    document.title = t.title;
  }, [t]);

  return (
    <div className="page">
      <header className="masthead">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </header>

      <form className="filters" aria-label={t.filters} onSubmit={(e) => e.preventDefault()}>
        <label>
          {t.territory}
          <select value={territory} onChange={(e) => update({ territory: e.target.value })}>
            <option value={BRAZIL}>{t.brazil}</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>{t.period}</legend>
          {PERIODS.map((p) => (
            <label key={p}>
              <input type="radio" name="period" checked={years === p} onChange={() => update({ years: p })} />
              <span>{t.years(p)}</span>
            </label>
          ))}
        </fieldset>
        <label>
          {t.language}
          <select value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </label>
      </form>

      <main className="grid">
        {INDICATORS.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} territory={territory} years={years} t={t} />
        ))}
      </main>

      <footer className="about">
        <h2>{t.methodology}</h2>
        <p>{t.methodologyText}</p>
        <p>
          {t.notAffiliated} <a href={REPOSITORY}>{t.sourceCode}</a>
        </p>
      </footer>
    </div>
  );
}
