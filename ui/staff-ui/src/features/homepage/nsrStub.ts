import type { DashboardScreenConfig } from '@openg2p/dashboard-widgets';
import type {
  ExpectedAttentionResponse,
  ExpectedDraftsResponse,
  ExpectedMetricsResponse,
  ExpectedPortfolioResponse,
  ExpectedRecentRecordsResponse,
  ExpectedSearchSuggestResponse,
} from './contracts';

/** Temporary NSR (National Social Registry) homepage fixtures until homepage staff-api exists. */
export const NSR_STUB_ENABLED = true;

const INDIVIDUALS = 20_008_810;
const HOUSEHOLDS = 5_011_772;

function compactIndian(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN').format(n);
}

function exactIn(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export const NSR_PRIMARY_SCREEN: DashboardScreenConfig = {
  version: '1.0',
  screen: {
    id: 'command',
    title: 'Command centre',
    primaryAction: 'search',
    trust: {
      asOf: new Date().toISOString(),
      freshness: 'near-real-time',
      freshnessLabel: 'Near real-time',
    },
    context: {
      register: 'all',
      geography: 'ALL',
      geographyLabel: 'All geography',
      timeWindow: '30d',
      timeWindowLabel: '30d',
      comparison: 'previous_period',
      comparisonLabel: 'vs previous period',
      registers: [
        { id: 'individual', label: 'Individuals', firstClass: true },
        { id: 'household', label: 'Households', firstClass: true },
      ],
      geographies: [
        { id: 'ALL', label: 'All geography' },
        { id: 'REGION-A', label: 'Region A' },
        { id: 'REGION-B', label: 'Region B' },
      ],
      timeWindows: [
        { id: 'today', label: 'Today' },
        { id: '7d', label: '7d' },
        { id: '30d', label: '30d' },
        { id: 'qtr', label: 'Qtr' },
        { id: 'yr', label: 'Year' },
      ],
      comparisons: [
        { id: 'previous_period', label: 'Previous period' },
        { id: 'last_year', label: 'Same period last year' },
      ],
    },
    layout: { type: 'grid', columns: 12, gap: 'md' },
    widgets: [
      // Identity chrome omitted — staff-ui header already shows registry branding.
      {
        id: 'context',
        type: 'context_bar',
        position: { row: 0, col: 1, span: 12 },
        config: {},
      },
      {
        id: 'search',
        type: 'search',
        position: { row: 1, col: 1, span: 12, rowSpan: 3 },
        permission: { any: ['register:view'] },
        data: { source: 'search.registry' },
        config: {
          placeholder: 'Search individuals or households by name or ID',
          defaultRoute: '/register/individual',
          registers: [
            { id: 'individual', label: 'Individuals' },
            { id: 'household', label: 'Households' },
          ],
          modes: [
            { id: 'records', label: 'Records', permission: { action: 'register:view' } },
            { id: 'intake', label: 'Submissions', permission: { action: 'intakeSubmission:view' } },
            {
              id: 'tasks',
              label: 'Tasks',
              permission: {
                any: [
                  'verificationChangeRequest:create',
                  'verificationIntakeForm:create',
                ],
              },
            },
          ],
        },
      },
      {
        id: 'actions',
        type: 'action_bar',
        position: { row: 4, col: 1, span: 12, rowSpan: 2 },
        config: {
          actions: [
            {
              id: 'add-individual',
              label: 'Add individual',
              primary: true,
              permission: { action: 'intakeSubmission:edit' },
              drill: { route: '/intake-form/individual' },
            },
            {
              id: 'add-household',
              label: 'Add household',
              permission: { action: 'intakeSubmission:edit' },
              drill: { route: '/intake-form/household' },
            },
            {
              id: 'verify',
              label: 'My tasks',
              permission: {
                any: [
                  'verificationChangeRequest:create',
                  'verificationIntakeForm:create',
                ],
              },
              drill: { route: '/tasks' },
            },
            {
              id: 'messages',
              label: 'Messages',
              permission: { action: 'incomingMessage:view' },
              drill: { route: '/incoming-messages' },
            },
            {
              id: 'export',
              label: 'Export',
              overflow: true,
              permission: { action: 'register:export' },
              drill: { route: '/register/individual' },
            },
            {
              id: 'change-requests',
              label: 'Change requests',
              overflow: true,
              permission: { action: 'changeRequest:view' },
              drill: { route: '/change-request' },
            },
          ],
        },
      },
      {
        id: 'metric-individuals',
        type: 'metric',
        position: { row: 6, col: 1, span: 3, rowSpan: 4 },
        permission: { action: 'register:view' },
        data: { source: 'register.individual.total' },
        config: { label: 'Individuals' },
        drill: { route: '/register/individual' },
        scope: { register: true, geography: true, time: true },
      },
      {
        id: 'metric-households',
        type: 'metric',
        position: { row: 6, col: 4, span: 3, rowSpan: 4 },
        permission: { action: 'register:view' },
        data: { source: 'register.household.total' },
        config: { label: 'Households' },
        drill: { route: '/register/household' },
        scope: { register: true, geography: true, time: true },
      },
      {
        id: 'metric-submissions',
        type: 'metric',
        position: { row: 6, col: 7, span: 3, rowSpan: 4 },
        permission: { action: 'intakeSubmission:view' },
        data: { source: 'intake.pending' },
        config: { label: 'Pending submissions' },
        drill: { route: '/intake-form/individual' },
      },
      {
        id: 'metric-tasks',
        type: 'metric',
        position: { row: 6, col: 10, span: 3, rowSpan: 4 },
        permission: {
          any: [
            'verificationChangeRequest:create',
            'verificationIntakeForm:create',
          ],
        },
        data: { source: 'tasks.open' },
        config: { label: 'Open tasks' },
        drill: { route: '/tasks' },
      },
      {
        id: 'attention',
        type: 'attention',
        position: { row: 10, col: 1, span: 8, rowSpan: 6 },
        data: { source: 'attention.default' },
        config: { title: 'Needs attention' },
      },
      {
        id: 'portfolio',
        type: 'portfolio',
        position: { row: 10, col: 9, span: 4, rowSpan: 6 },
        permission: { action: 'register:view' },
        data: { source: 'portfolio.default' },
        config: {},
      },
      {
        id: 'drafts',
        type: 'drafts',
        position: { row: 16, col: 1, span: 6, rowSpan: 6 },
        permission: { action: 'intakeSubmission:view' },
        data: { source: 'drafts.mine' },
        config: { title: 'Drafts & intake pulse' },
      },
      {
        id: 'recent',
        type: 'recent_records',
        position: { row: 16, col: 7, span: 6, rowSpan: 6 },
        permission: { action: 'register:view' },
        data: { source: 'recent.default' },
        config: { title: 'Recent records' },
      },
    ],
  },
};

export function getNsrStubScreen(screenId?: string | null): DashboardScreenConfig {
  // For now NSR ships a single command composition.
  void screenId;
  return {
    ...NSR_PRIMARY_SCREEN,
    screen: {
      ...NSR_PRIMARY_SCREEN.screen,
      trust: {
        ...NSR_PRIMARY_SCREEN.screen.trust,
        asOf: new Date().toISOString(),
      },
    },
  };
}

export function getNsrStubMetrics(
  sources: string[],
  liveByMnemonic?: Record<string, number>,
): ExpectedMetricsResponse {
  const individualTotal =
    liveByMnemonic?.individual ?? liveByMnemonic?.Individual ?? INDIVIDUALS;
  const householdTotal =
    liveByMnemonic?.household ?? liveByMnemonic?.Household ?? HOUSEHOLDS;

  const catalog: ExpectedMetricsResponse['metrics'] = {
    'register.individual.total': {
      source: 'register.individual.total',
      label: 'Individuals',
      compact: compactIndian(individualTotal),
      exact: exactIn(individualTotal),
      delta: 2.4,
      deltaLabel: 'up 2.4% vs previous period',
      status: 'on-track',
      sparkline: [18, 19, 20, 21, 21, 22, 23, 23, 24, 24, 25, 26],
      scopeCaption: 'Individuals · All geography · 30d',
    },
    'register.household.total': {
      source: 'register.household.total',
      label: 'Households',
      compact: compactIndian(householdTotal),
      exact: exactIn(householdTotal),
      delta: 1.8,
      deltaLabel: 'up 1.8% vs previous period',
      status: 'on-track',
      sparkline: [12, 12, 13, 13, 14, 14, 15, 15, 15, 16, 16, 17],
      scopeCaption: 'Households · All geography · 30d',
    },
    'register.total': {
      source: 'register.total',
      label: 'Records',
      compact: compactIndian(individualTotal + householdTotal),
      exact: exactIn(individualTotal + householdTotal),
      delta: 2.1,
      deltaLabel: 'up 2.1% vs previous period',
      status: 'on-track',
      sparkline: [20, 21, 22, 22, 23, 24, 25, 25, 26, 27, 28, 29],
      scopeCaption: 'NSR · All geography · 30d',
    },
    'intake.pending': {
      source: 'intake.pending',
      label: 'Pending submissions',
      compact: '1,284',
      exact: '1,284',
      delta: 6,
      deltaLabel: 'up 6% vs previous period',
      status: 'watch',
      sparkline: [8, 9, 9, 10, 11, 10, 12, 13, 12, 14, 15, 14],
      scopeCaption: 'Intake · 30d',
    },
    'tasks.open': {
      source: 'tasks.open',
      label: 'Open tasks',
      compact: '86',
      exact: '86',
      delta: -4,
      deltaLabel: 'down 4 vs previous period',
      status: 'on-track',
      sparkline: [30, 28, 27, 29, 26, 25, 24, 22, 23, 21, 20, 18],
      scopeCaption: 'Verification · Mine + queue',
    },
    'messages.open': {
      source: 'messages.open',
      label: 'Open messages',
      compact: '42',
      exact: '42',
      delta: 2,
      deltaLabel: 'up 2',
      status: 'watch',
      sparkline: [10, 11, 12, 11, 13, 14, 13, 15, 14, 16, 15, 17],
      scopeCaption: 'Inbound · 30d',
    },
  };

  const metrics: ExpectedMetricsResponse['metrics'] = {};
  for (const source of sources.length ? sources : Object.keys(catalog)) {
    if (catalog[source]) metrics[source] = catalog[source];
  }

  return {
    as_of: new Date().toISOString(),
    metrics,
  };
}

export function getNsrStubAttention(): ExpectedAttentionResponse {
  return {
    as_of: new Date().toISOString(),
    items: [
      {
        id: 'verify-backlog',
        severity: 'critical',
        title: 'Individuals pending verification',
        count: 42190,
        aging: 'Oldest 18 days',
        owner: 'Registry-wide',
        permission: {
          any: [
            'verificationChangeRequest:create',
            'verificationIntakeForm:create',
          ],
        },
        drill: { route: '/tasks' },
      },
      {
        id: 'my-tasks',
        severity: 'info',
        title: 'My open tasks',
        count: 27,
        aging: '4 overdue SLA',
        owner: 'Mine',
        unscoped: true,
        permission: {
          any: [
            'verificationChangeRequest:create',
            'verificationIntakeForm:create',
          ],
        },
        drill: { route: '/tasks' },
      },
      {
        id: 'change-requests',
        severity: 'warning',
        title: 'Open change requests',
        count: 142,
        aging: 'Median age 2 days',
        owner: 'Registry-wide',
        permission: { action: 'changeRequest:view' },
        drill: { route: '/change-request' },
      },
      {
        id: 'messages',
        severity: 'info',
        title: 'Unresolved inbound messages',
        count: 42,
        aging: '12 older than 3 days',
        owner: 'Partner liaison',
        permission: { action: 'incomingMessage:view' },
        drill: { route: '/incoming-messages' },
      },
    ],
  };
}

export function getNsrStubPortfolio(
  liveByMnemonic?: Record<string, number>,
): ExpectedPortfolioResponse {
  const individualTotal =
    liveByMnemonic?.individual ?? liveByMnemonic?.Individual ?? INDIVIDUALS;
  const householdTotal =
    liveByMnemonic?.household ?? liveByMnemonic?.Household ?? HOUSEHOLDS;

  return {
    items: [
      {
        id: 'individual',
        label: 'Individuals',
        compact: compactIndian(individualTotal),
        health: 'watch',
        healthLabel: 'Verification backlog',
        firstClass: true,
      },
      {
        id: 'household',
        label: 'Households',
        compact: compactIndian(householdTotal),
        health: 'on-track',
        healthLabel: 'Quality on track',
        firstClass: true,
      },
    ],
  };
}

export function getNsrStubDrafts(): ExpectedDraftsResponse {
  return {
    items: [
      {
        id: 'd1',
        title: 'Individual intake — incomplete livelihood',
        meta: 'Draft · Updated 2 hours ago',
      },
      {
        id: 'd2',
        title: 'Household intake — missing members roster',
        meta: 'Draft · Updated yesterday',
      },
    ],
  };
}

export function getNsrStubRecentRecords(): ExpectedRecentRecordsResponse {
  return {
    items: [
      {
        id: 'IND-1002841',
        name: 'Amina Hassan',
        meta: 'Opened 20 min ago · Individual',
        register: 'individual',
      },
      {
        id: 'HH-220184',
        name: 'Hassan household',
        meta: 'Worked yesterday · Household',
        register: 'household',
      },
    ],
  };
}

export function getNsrStubSearchSuggest(
  query: string,
): ExpectedSearchSuggestResponse {
  const q = query.trim().toLowerCase();
  const pool = [
    {
      id: 'IND-1002841',
      name: 'Amina Hassan',
      meta: 'Active · Individual',
      register: 'individual',
      registerLabel: 'Individuals',
    },
    {
      id: 'IND-1002910',
      name: 'Omar Yusuf',
      meta: 'Pending verification · Individual',
      register: 'individual',
      registerLabel: 'Individuals',
    },
    {
      id: 'HH-220184',
      name: 'Hassan household',
      meta: '5 members · Household',
      register: 'household',
      registerLabel: 'Households',
    },
    {
      id: 'HH-220901',
      name: 'Yusuf household',
      meta: '4 members · Household',
      register: 'household',
      registerLabel: 'Households',
    },
  ];

  return {
    suggestions: pool
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.meta.toLowerCase().includes(q),
      )
      .slice(0, 8),
  };
}
