import { contiguousSegments, lastYears, niceTicks, yearTicks } from '../src/components/chartMath';
import { INDICATORS, type IndicatorId } from '../src/data/indicators';
import { DataFormatError, ibgePeriodToDate, lastOfEachMonth, parseBcb, parseIbge } from '../src/data/parsers';
import { formatChange, formatPeriod, formatValue } from '../src/i18n/format';
import { STRINGS } from '../src/i18n/strings';
import ipcaFixture from './fixtures/ibge-ipca.json';
import unemploymentFixture from './fixtures/ibge-unemployment-mg.json';

const indicator = (id: IndicatorId) => INDICATORS.find((i) => i.id === id)!;
const ibgeBody = (serie: Record<string, string>) => [{ resultados: [{ series: [{ serie }] }] }];

describe('IBGE parser', () => {
  it('reads recorded API responses', () => {
    expect(parseIbge(ipcaFixture, 'month').at(-1)).toEqual({ date: '2026-10-01', value: 4.63 });
    expect(parseIbge(unemploymentFixture, 'quarter').every((p) => /-(01|04|07|10)-01$/.test(p.date))).toBe(true);
  });

  it('leaves missing values out instead of reading them as zero', () => {
    const points = parseIbge(ibgeBody({ '2019': '...', '2020': '-', '2021': 'X', '2022': '0', '2023': '-1.5' }), 'year');
    expect(points).toEqual([
      { date: '2022-01-01', value: 0 },
      { date: '2023-01-01', value: -1.5 },
    ]);
  });

  it('converts quarters and rejects impossible periods', () => {
    expect(ibgePeriodToDate('202603', 'quarter')).toBe('2026-07-01');
    expect(ibgePeriodToDate('202605', 'quarter')).toBeNull();
    expect(ibgePeriodToDate('202613', 'month')).toBeNull();
    expect(ibgePeriodToDate('2026', 'month')).toBeNull();
  });

  it('rejects an unexpected response', () => {
    expect(() => parseIbge([], 'year')).toThrow(DataFormatError);
    expect(() => parseIbge({ message: 'error' }, 'year')).toThrow(DataFormatError);
  });
});

describe('Banco Central parser', () => {
  it('converts dates, sorts and skips malformed items', () => {
    const points = parseBcb([
      { data: '01/02/2026', valor: '5.20' },
      { data: '01/01/2026', valor: '5.10' },
      { data: 'x', valor: '1' },
      { data: '01/03/2026', valor: '' },
    ]);
    expect(points).toEqual([
      { date: '2026-01-01', value: 5.1 },
      { date: '2026-02-01', value: 5.2 },
    ]);
    expect(() => parseBcb({ erro: true })).toThrow(DataFormatError);
  });

  it('keeps the last value of each month and ignores future dates', () => {
    const daily = [
      { date: '2026-10-01', value: 14 },
      { date: '2026-10-30', value: 13.75 },
      { date: '2026-11-27', value: 13.5 },
      { date: '2026-12-09', value: 13.25 },
    ];
    expect(lastOfEachMonth(daily, '2026-11-27')).toEqual([
      { date: '2026-10-01', value: 13.75 },
      { date: '2026-11-01', value: 13.5 },
    ]);
  });
});

describe('request URLs', () => {
  const today = new Date('2026-11-27T12:00:00Z');

  it('asks IBGE for the selected territory', () => {
    expect(decodeURIComponent(indicator('unemployment').requestUrl('BR', today))).toContain('localidades=N1[all]');
    expect(decodeURIComponent(indicator('illiteracy').requestUrl('31', today))).toContain(
      'localidades=N3[31]&classificacao=2[6794]|58[2795]',
    );
  });

  it('keeps Banco Central ranges inside the ten-year limit', () => {
    const url = decodeURIComponent(indicator('selic').requestUrl('BR', today));
    expect(url).toContain('dataInicial=01/12/2016&dataFinal=27/11/2026');
  });
});

describe('chart math', () => {
  it('builds round ticks that cover the data', () => {
    expect(niceTicks(2.3, 13.9)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(-3.3, 4.8)).toEqual([-5, -2.5, 0, 2.5, 5]);
    const flat = niceTicks(5, 5);
    expect(flat[0]).toBeLessThan(5);
    expect(flat.at(-1)).toBeGreaterThan(5);
  });

  it('breaks the line where periods are missing', () => {
    const years = ['2019', '2022', '2023'].map((y) => ({ date: `${y}-01-01`, value: 1 }));
    expect(contiguousSegments(years, 'year').map((s) => s.length)).toEqual([1, 2]);
    const quarters = ['01', '04', '07'].map((m) => ({ date: `2025-${m}-01`, value: 1 }));
    expect(contiguousSegments(quarters, 'quarter')).toHaveLength(1);
  });

  it('filters by years counted from the latest observation', () => {
    const points = ['2020-06', '2024-06', '2024-07', '2026-06'].map((m) => ({ date: `${m}-01`, value: 1 }));
    expect(lastYears(points, 2).map((p) => p.date)).toEqual(['2024-07-01', '2026-06-01']);
    expect(lastYears([], 2)).toEqual([]);
  });

  it('thins year labels', () => {
    const ticks = yearTicks(Date.UTC(2016, 5, 1), Date.UTC(2026, 0, 1), 5);
    expect(ticks.map((t) => new Date(t).getUTCFullYear())).toEqual([2017, 2019, 2021, 2023, 2025]);
  });
});

describe('formatting', () => {
  const { en, pt } = STRINGS;

  it('formats periods by frequency and language', () => {
    expect(formatPeriod('2026-04-01', 'quarter', en)).toBe('Q2 2026');
    expect(formatPeriod('2026-04-01', 'quarter', pt)).toBe('2º tri. 2026');
    expect(formatPeriod('2026-10-01', 'month', en)).toBe('Oct 2026');
    expect(formatPeriod('2026-01-01', 'year', pt)).toBe('2026');
  });

  it('uses percentage points for rates and percent change for levels', () => {
    const at = (value: number) => ({ date: '2026-01-01', value });
    expect(formatChange(at(5), at(5.5), 'percent', en)).toBe('+0.5 pp');
    expect(formatChange(at(200), at(190), 'people', en)).toBe('-5%');
    expect(formatValue(5.1294, 'brl', pt)).toBe('R$ 5,13');
    expect(formatValue(214211951, 'people', en)).toBe('214.21M');
  });
});
