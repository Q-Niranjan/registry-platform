import type {
  AttentionItem,
  DashboardScreenConfig,
  PortfolioItem,
  SearchSuggestion,
} from '@openg2p/dashboard-widgets';
import { withCsrfHeaders } from '@/shared/utils/csrf';
import type {
  DraftListItem,
  ExpectedAttentionResponse,
  ExpectedDraftsResponse,
  ExpectedMetricsResponse,
  ExpectedPortfolioResponse,
  ExpectedRecentRecordsResponse,
  ExpectedSearchSuggestResponse,
  HomepageScopeRequest,
  RecentRecordItem,
} from './contracts';

async function readJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof body?.statusText === 'string' && body.statusText) ||
      res.statusText ||
      'Request failed';
    throw new Error(message);
  }
  return body as T;
}

function jsonHeaders(method: string): HeadersInit {
  return withCsrfHeaders(method, { 'Content-Type': 'application/json' });
}

export async function fetchPrimaryScreen(): Promise<DashboardScreenConfig> {
  const res = await fetch('/api/homepage/primary-screen', {
    cache: 'no-store',
    credentials: 'include',
  });
  return readJson<DashboardScreenConfig>(res);
}

export async function fetchScreen(screenId: string): Promise<DashboardScreenConfig> {
  const res = await fetch(
    `/api/homepage/screen?screenId=${encodeURIComponent(screenId)}`,
    { cache: 'no-store', credentials: 'include' },
  );
  return readJson<DashboardScreenConfig>(res);
}

export async function fetchMetrics(
  sources: string[],
  context: HomepageScopeRequest,
): Promise<ExpectedMetricsResponse> {
  const res = await fetch('/api/homepage/metrics', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders('POST'),
    body: JSON.stringify({ sources, context }),
  });
  return readJson<ExpectedMetricsResponse>(res);
}

export async function fetchAttention(
  source: string,
  context: HomepageScopeRequest,
): Promise<AttentionItem[]> {
  const res = await fetch('/api/homepage/attention', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders('POST'),
    body: JSON.stringify({ source, context }),
  });
  const data = await readJson<ExpectedAttentionResponse>(res);
  return data.items ?? [];
}

export async function fetchPortfolio(
  source: string,
  context: HomepageScopeRequest,
): Promise<PortfolioItem[]> {
  const res = await fetch('/api/homepage/portfolio', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders('POST'),
    body: JSON.stringify({ source, context }),
  });
  const data = await readJson<ExpectedPortfolioResponse>(res);
  return data.items ?? [];
}

export async function fetchDrafts(
  source: string,
  context: HomepageScopeRequest,
): Promise<DraftListItem[]> {
  const res = await fetch('/api/homepage/drafts', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders('POST'),
    body: JSON.stringify({ source, context }),
  });
  const data = await readJson<ExpectedDraftsResponse>(res);
  return data.items ?? [];
}

export async function fetchRecentRecords(
  source: string,
  context: HomepageScopeRequest,
): Promise<RecentRecordItem[]> {
  const res = await fetch('/api/homepage/recent-records', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders('POST'),
    body: JSON.stringify({ source, context }),
  });
  const data = await readJson<ExpectedRecentRecordsResponse>(res);
  return data.items ?? [];
}

export async function fetchSearchSuggestions(input: {
  query: string;
  mode?: string;
  register?: string;
  limit?: number;
}): Promise<SearchSuggestion[]> {
  const res = await fetch('/api/homepage/search/suggest', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders('POST'),
    body: JSON.stringify(input),
  });
  const data = await readJson<ExpectedSearchSuggestResponse>(res);
  return data.suggestions ?? [];
}
