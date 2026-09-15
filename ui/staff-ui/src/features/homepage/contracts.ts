import type {
  AttentionItem,
  DashboardScreenConfig,
  HomepageUserLayout,
  MetricWidgetConfig,
  PortfolioItem,
  SearchSuggestion,
} from '@openg2p/dashboard-widgets';

/**
 * Planned staff-api endpoints (backend to be added later).
 * Staff-ui BFF routes proxy to these paths unchanged.
 */
export const HOMEPAGE_BACKEND = {
  primaryScreen: '/homepage/get_primary_screen',
  screen: '/homepage/get_screen',
  metrics: '/homepage/get_metrics',
  attention: '/homepage/get_attention',
  portfolio: '/homepage/get_portfolio',
  drafts: '/homepage/get_drafts',
  recentRecords: '/homepage/get_recent_records',
  searchSuggest: '/homepage/search_suggest',
} as const;

/** Scope sent with every data request. */
export type HomepageScopeRequest = {
  register?: string;
  geography?: string;
  time_window?: string;
  comparison?: string;
  screen_id?: string;
};

/**
 * Expected BFF client response for GET /api/homepage/primary-screen
 * (unwrap of backend response_payload).
 */
export const EXPECTED_PRIMARY_SCREEN_RESPONSE = {
  version: '1.0',
  screen: {
    id: 'command',
    title: 'Command centre',
    primaryAction: 'search',
    identity: {
      name: 'Registry',
      type: 'Registry',
      authority: '',
      jurisdiction: '',
      environment: 'production',
      sealInitials: 'G2P',
    },
    trust: {
      asOf: '2026-01-01T00:00:00.000Z',
      freshness: 'near-real-time',
      freshnessLabel: 'Near real-time',
    },
    context: {
      register: 'all',
      geography: '',
      geographyLabel: '',
      timeWindow: '30d',
      timeWindowLabel: '30d',
      comparison: 'previous_period',
      comparisonLabel: 'vs previous period',
      registers: [],
      geographies: [],
      timeWindows: [
        { id: 'today', label: 'Today' },
        { id: '7d', label: '7d' },
        { id: '30d', label: '30d' },
      ],
      comparisons: [{ id: 'previous_period', label: 'Previous period' }],
    },
    layout: { type: 'grid', columns: 12, gap: 'md' },
    widgets: [
      {
        id: 'identity',
        type: 'identity',
        position: { row: 0, col: 1, span: 12 },
        config: {},
      },
      {
        id: 'context',
        type: 'context_bar',
        position: { row: 0, col: 1, span: 12 },
        config: {},
      },
      {
        id: 'search',
        type: 'search',
        position: { row: 1, col: 1, span: 12 },
        permission: { any: ['register:view'] },
        data: { source: 'search.registry' },
        config: {
          placeholder: 'Search registry',
          defaultRoute: '/register',
          modes: [{ id: 'records', label: 'Records' }],
        },
      },
      {
        id: 'metric-example',
        type: 'metric',
        position: { row: 2, col: 1, span: 3 },
        permission: { action: 'register:view' },
        data: { source: 'register.total' },
        config: { label: 'Records' },
        drill: { route: '/register' },
        scope: { register: true, geography: true, time: true },
      },
      {
        id: 'attention',
        type: 'attention',
        position: { row: 3, col: 1, span: 8 },
        data: { source: 'attention.default' },
        config: { title: 'Needs attention' },
      },
    ],
  },
} as const satisfies DashboardScreenConfig;

/** Expected BFF response for GET /api/homepage/screen?screenId= */
export type ExpectedScreenResponse = DashboardScreenConfig;

/**
 * Expected BFF response for POST /api/homepage/metrics
 * Request: { sources: string[], context: HomepageScopeRequest }
 */
export type ExpectedMetricsResponse = {
  as_of: string;
  metrics: Record<
    string,
    MetricWidgetConfig & {
      source: string;
    }
  >;
};

export const EXPECTED_METRICS_RESPONSE: ExpectedMetricsResponse = {
  as_of: '2026-01-01T00:00:00.000Z',
  metrics: {
    'register.total': {
      source: 'register.total',
      label: 'Records',
      compact: '0',
      exact: '0',
      delta: 0,
      deltaLabel: 'no change',
      status: 'on-track',
      sparkline: [],
      scopeCaption: '',
    },
  },
};

/**
 * Expected BFF response for POST /api/homepage/attention
 * Request: { source: string, context: HomepageScopeRequest }
 */
export type ExpectedAttentionResponse = {
  as_of: string;
  items: AttentionItem[];
};

export const EXPECTED_ATTENTION_RESPONSE: ExpectedAttentionResponse = {
  as_of: '2026-01-01T00:00:00.000Z',
  items: [],
};

/**
 * Expected BFF response for POST /api/homepage/portfolio
 */
export type ExpectedPortfolioResponse = {
  items: PortfolioItem[];
};

export const EXPECTED_PORTFOLIO_RESPONSE: ExpectedPortfolioResponse = {
  items: [],
};

/**
 * Expected BFF response for POST /api/homepage/drafts
 */
export type DraftListItem = {
  id: string;
  title: string;
  meta: string;
};

export type ExpectedDraftsResponse = {
  items: DraftListItem[];
};

export const EXPECTED_DRAFTS_RESPONSE: ExpectedDraftsResponse = {
  items: [],
};

/**
 * Expected BFF response for POST /api/homepage/recent-records
 */
export type RecentRecordItem = {
  id: string;
  name: string;
  meta: string;
  register: string;
};

export type ExpectedRecentRecordsResponse = {
  items: RecentRecordItem[];
};

export const EXPECTED_RECENT_RECORDS_RESPONSE: ExpectedRecentRecordsResponse = {
  items: [],
};

/**
 * Expected BFF response for POST /api/homepage/search/suggest
 * Request: { query, mode?, register?, limit? }
 */
export type ExpectedSearchSuggestResponse = {
  suggestions: SearchSuggestion[];
};

export const EXPECTED_SEARCH_SUGGEST_RESPONSE: ExpectedSearchSuggestResponse = {
  suggestions: [],
};

/**
 * Expected BFF response for GET/PUT /api/homepage/layout
 */
export const EXPECTED_HOMEPAGE_LAYOUT_RESPONSE: HomepageUserLayout = {
  version: '1.0',
  baseScreenId: 'command',
  widgets: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
};
