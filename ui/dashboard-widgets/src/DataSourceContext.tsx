'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type {
  AttentionItem,
  MetricWidgetConfig,
  PortfolioItem,
  SearchSuggestion,
} from './types';

export type HomepageScope = {
  register: string;
  geography: string;
  timeWindow: string;
  comparison?: string;
  screenId?: string;
};

export type DraftDataItem = { id: string; title: string; meta: string };
export type RecentDataItem = {
  id: string;
  name: string;
  meta: string;
  register: string;
};

export type DashboardDataSourceApi = {
  fetchMetric: (
    source: string,
    scope: HomepageScope,
  ) => Promise<(MetricWidgetConfig & { source?: string }) | null>;
  fetchAttention: (source: string, scope: HomepageScope) => Promise<AttentionItem[]>;
  fetchPortfolio: (source: string, scope: HomepageScope) => Promise<PortfolioItem[]>;
  fetchDrafts: (source: string, scope: HomepageScope) => Promise<DraftDataItem[]>;
  fetchRecentRecords: (
    source: string,
    scope: HomepageScope,
  ) => Promise<RecentDataItem[]>;
  fetchSuggestions: (input: {
    query: string;
    mode?: string;
    register?: string;
    limit?: number;
  }) => Promise<SearchSuggestion[]>;
};

const DashboardDataContext = createContext<DashboardDataSourceApi | null>(null);

export function DashboardDataProvider({
  api,
  children,
}: {
  api: DashboardDataSourceApi;
  children: ReactNode;
}) {
  return (
    <DashboardDataContext.Provider value={api}>{children}</DashboardDataContext.Provider>
  );
}

export function useDashboardDataSource() {
  return useContext(DashboardDataContext);
}
