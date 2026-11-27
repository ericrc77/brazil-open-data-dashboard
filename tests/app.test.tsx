import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { parseFilters, toSearch } from '../src/hooks/useFilters';

/** Fake publishers: a few observations for any series, with different values per territory. */
function respond(url: string): Response {
  if (url.includes('api.bcb.gov.br')) {
    return new Response(JSON.stringify([{ data: '01/09/2026', valor: '5.00' }, { data: '01/10/2026', valor: '5.50' }]));
  }
  const table = Number(/agregados\/(\d+)/.exec(url)![1]);
  const state = decodeURIComponent(url).includes('N3[31]');
  const periods = table === 6579 || table === 7113 ? ['2024', '2025'] : ['202601', '202602'];
  const serie = { [periods[0]]: state ? '3.0' : '6.0', [periods[1]]: state ? '3.5' : '6.5' };
  return new Response(JSON.stringify([{ resultados: [{ series: [{ serie }] }] }]));
}

const fetchMock = vi.fn(async (input: RequestInfo | URL) => respond(String(input)));

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/?lang=en');
  fetchMock.mockClear();
  fetchMock.mockImplementation(async (input) => respond(String(input)));
  vi.stubGlobal('fetch', fetchMock);
});
afterAll(() => vi.unstubAllGlobals());

const card = (name: string) => screen.getByRole('article', { name });
const ready = () => waitFor(() => expect(screen.queryAllByText('Loading official data…')).toHaveLength(0));

describe('App', () => {
  it('shows each indicator with its latest value, period and source', async () => {
    render(<App />);
    await ready();
    expect(screen.getAllByRole('article')).toHaveLength(7);
    const usd = card('US dollar exchange rate');
    expect(usd).toHaveTextContent('R$ 5.50');
    expect(usd).toHaveTextContent('Brazil · Oct 2026 · +10% vs Sep 2026');
    expect(within(usd).getByRole('link', { name: 'Banco Central do Brasil' })).toBeInTheDocument();
    expect(card('Unemployment rate')).toHaveTextContent('+0.5 pp vs Q1 2026');
  });

  it('compares a state with Brazil and marks national-only indicators', async () => {
    const user = userEvent.setup();
    render(<App />);
    await ready();
    await user.selectOptions(screen.getByLabelText('Territory'), '31');
    await ready();

    const unemployment = card('Unemployment rate');
    await waitFor(() => expect(within(unemployment).getAllByRole('listitem')).toHaveLength(2));
    expect(unemployment).toHaveTextContent('Minas Gerais · Q2 2026');
    expect(card('Inflation (IPCA)')).toHaveTextContent('National figure only');
    // Totals of a state and of the country do not share a scale.
    expect(within(card('Estimated population')).queryByRole('list')).not.toBeInTheDocument();
    expect(window.location.search).toContain('uf=31');
  });

  it('offers the same numbers as a table', async () => {
    const user = userEvent.setup();
    render(<App />);
    await ready();
    const usd = card('US dollar exchange rate');
    await user.click(within(usd).getByText('Data table'));
    const rows = within(within(usd).getByRole('table')).getAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual(['PeriodBrazil', 'Oct 2026R$ 5.50', 'Sep 2026R$ 5.00']);
  });

  it('reads chart values with the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    await ready();
    const usd = card('US dollar exchange rate');
    const chart = within(usd).getByRole('application');
    chart.focus();
    await user.keyboard('{ArrowLeft}');
    expect(usd.querySelector('[aria-live]')).toHaveTextContent('Sep 2026: Brazil R$ 5.00');
  });

  it('isolates a failing source and recovers on retry', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('sgs.3698') ? new Response('', { status: 404 }) : respond(String(input)),
    );
    const user = userEvent.setup();
    render(<App />);
    await ready();
    const usd = card('US dollar exchange rate');
    expect(within(usd).getByRole('alert')).toHaveTextContent('The source did not answer.');
    expect(card('Inflation (IPCA)')).toHaveTextContent('6.5%');

    fetchMock.mockImplementation(async (input) => respond(String(input)));
    await user.click(within(usd).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(usd).toHaveTextContent('R$ 5.50'));
  });

  it('switches to Portuguese', async () => {
    const user = userEvent.setup();
    render(<App />);
    await ready();
    await user.selectOptions(screen.getByLabelText('Language'), 'pt');
    expect(card('Cotação do dólar')).toHaveTextContent('R$ 5,50');
    expect(document.documentElement.lang).toBe('pt-BR');
  });
});

describe('filters in the address', () => {
  it('ignores unknown values', () => {
    expect(parseFilters('?uf=99&years=7&lang=xx', 'pt-BR')).toEqual({ territory: 'BR', years: 5, lang: 'pt' });
    expect(parseFilters('', 'de-DE').lang).toBe('en');
  });

  it('round-trips', () => {
    const filters = { territory: '35', years: 10 as const, lang: 'en' as const };
    expect(parseFilters(toSearch(filters), 'pt')).toEqual(filters);
  });
});
