import type { IndicatorId } from '../data/indicators';

export type Lang = 'en' | 'pt';

interface IndicatorText {
  title: string;
  description: string;
  limitation: string;
}

export interface Strings {
  locale: string;
  title: string;
  subtitle: string;
  territory: string;
  brazil: string;
  period: string;
  years: (n: number) => string;
  language: string;
  filters: string;
  loading: string;
  error: string;
  retry: string;
  noData: string;
  stale: (when: string) => string;
  retrieved: (when: string) => string;
  source: string;
  nationalOnly: string;
  versus: (change: string, period: string) => string;
  points: string;
  showTable: string;
  periodColumn: string;
  quarter: (q: number, year: string) => string;
  chartLabel: (title: string) => string;
  chartHelp: string;
  methodology: string;
  methodologyText: string;
  notAffiliated: string;
  sourceCode: string;
  indicators: Record<IndicatorId, IndicatorText>;
}

const en: Strings = {
  locale: 'en-US',
  title: 'Brazil Open Data Dashboard',
  subtitle: 'Economic and social indicators, read from official public APIs when you open the page.',
  territory: 'Territory',
  brazil: 'Brazil',
  period: 'Period',
  years: (n) => `${n} years`,
  language: 'Language',
  filters: 'Filters',
  loading: 'Loading official data…',
  error: 'The source did not answer.',
  retry: 'Try again',
  noData: 'No observations in this period.',
  stale: (when) => `Source unavailable. Showing data downloaded on ${when}.`,
  retrieved: (when) => `Retrieved ${when}`,
  source: 'Source',
  nationalOnly: 'National figure only',
  versus: (change, period) => `${change} vs ${period}`,
  points: 'pp',
  showTable: 'Data table',
  periodColumn: 'Period',
  quarter: (q, year) => `Q${q} ${year}`,
  chartLabel: (title) => `${title} over time`,
  chartHelp: 'Use the left and right arrow keys to read each value.',
  methodology: 'About the data',
  methodologyText:
    'Every number comes from IBGE or Banco Central do Brasil at the moment of the request. Nothing is estimated or interpolated by this site: missing periods appear as gaps. Publishers revise past values, so figures may change. Responses are cached in your browser for six hours.',
  notAffiliated: 'Independent project, not affiliated with IBGE or Banco Central do Brasil.',
  sourceCode: 'Source code',
  indicators: {
    ipca: {
      title: 'Inflation (IPCA)',
      description: 'Consumer price index, accumulated over 12 months.',
      limitation: 'Covers selected metropolitan areas and households earning 1 to 40 minimum wages.',
    },
    selic: {
      title: 'Policy interest rate (Selic target)',
      description: 'Annual target rate set by the monetary policy committee.',
      limitation: 'Each month shows the last target in force; changes within a month are not drawn.',
    },
    usd: {
      title: 'US dollar exchange rate',
      description: 'Monthly average selling rate in Brazilian reais (PTAX).',
      limitation: 'Reference rate; it differs from the rates offered to consumers.',
    },
    unemployment: {
      title: 'Unemployment rate',
      description: 'People aged 14 or over, quarterly household survey (PNAD Contínua).',
      limitation: 'Sample survey: state figures have wider margins of error than the national one.',
    },
    gdp: {
      title: 'GDP growth',
      description: 'Volume accumulated over four quarters against the previous four.',
      limitation: 'Recent quarters are preliminary and usually revised.',
    },
    population: {
      title: 'Estimated population',
      description: 'Resident population estimated for 1 July of each year.',
      limitation: 'Some years, including census years, have no estimate in this series.',
    },
    illiteracy: {
      title: 'Illiteracy rate',
      description: 'People aged 15 or over (PNAD Contínua, education).',
      limitation: 'Sample survey; not published for some years.',
    },
  },
};

const pt: Strings = {
  locale: 'pt-BR',
  title: 'Painel de Dados Abertos do Brasil',
  subtitle: 'Indicadores econômicos e sociais, consultados em APIs públicas oficiais quando você abre a página.',
  territory: 'Território',
  brazil: 'Brasil',
  period: 'Período',
  years: (n) => `${n} anos`,
  language: 'Idioma',
  filters: 'Filtros',
  loading: 'Carregando dados oficiais…',
  error: 'A fonte não respondeu.',
  retry: 'Tentar de novo',
  noData: 'Sem observações neste período.',
  stale: (when) => `Fonte indisponível. Exibindo dados baixados em ${when}.`,
  retrieved: (when) => `Consultado em ${when}`,
  source: 'Fonte',
  nationalOnly: 'Somente dado nacional',
  versus: (change, period) => `${change} ante ${period}`,
  points: 'p.p.',
  showTable: 'Tabela de dados',
  periodColumn: 'Período',
  quarter: (q, year) => `${q}º tri. ${year}`,
  chartLabel: (title) => `${title} ao longo do tempo`,
  chartHelp: 'Use as setas esquerda e direita para ler cada valor.',
  methodology: 'Sobre os dados',
  methodologyText:
    'Todos os números vêm do IBGE ou do Banco Central do Brasil no momento da consulta. Este site não estima nem interpola valores: períodos sem dado aparecem como lacunas. Os órgãos revisam valores passados, portanto os números podem mudar. As respostas ficam em cache no seu navegador por seis horas.',
  notAffiliated: 'Projeto independente, sem vínculo com o IBGE ou o Banco Central do Brasil.',
  sourceCode: 'Código-fonte',
  indicators: {
    ipca: {
      title: 'Inflação (IPCA)',
      description: 'Índice de preços ao consumidor, acumulado em 12 meses.',
      limitation: 'Abrange regiões metropolitanas selecionadas e famílias com renda de 1 a 40 salários mínimos.',
    },
    selic: {
      title: 'Taxa básica de juros (meta Selic)',
      description: 'Meta anual definida pelo Comitê de Política Monetária.',
      limitation: 'Cada mês mostra a última meta em vigor; mudanças dentro do mês não são desenhadas.',
    },
    usd: {
      title: 'Cotação do dólar',
      description: 'Média mensal da taxa de venda em reais (PTAX).',
      limitation: 'Taxa de referência; difere das cotações oferecidas ao consumidor.',
    },
    unemployment: {
      title: 'Taxa de desocupação',
      description: 'Pessoas de 14 anos ou mais, pesquisa domiciliar trimestral (PNAD Contínua).',
      limitation: 'Pesquisa amostral: dados estaduais têm margem de erro maior que o nacional.',
    },
    gdp: {
      title: 'Crescimento do PIB',
      description: 'Volume acumulado em quatro trimestres ante os quatro anteriores.',
      limitation: 'Trimestres recentes são preliminares e costumam ser revisados.',
    },
    population: {
      title: 'População estimada',
      description: 'População residente estimada para 1º de julho de cada ano.',
      limitation: 'Alguns anos, inclusive os de censo, não têm estimativa nesta série.',
    },
    illiteracy: {
      title: 'Taxa de analfabetismo',
      description: 'Pessoas de 15 anos ou mais (PNAD Contínua, educação).',
      limitation: 'Pesquisa amostral; não publicada em alguns anos.',
    },
  },
};

export const STRINGS: Record<Lang, Strings> = { en, pt };
