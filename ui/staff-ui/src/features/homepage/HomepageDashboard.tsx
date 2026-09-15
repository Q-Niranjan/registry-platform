'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useRbac } from '@/context/RbacContext';
import {
  ScreenRenderer,
  applyUserLayout,
  filterScreenByPermission,
  type DashboardDataSourceApi,
  type DashboardScreenConfig,
  type DrillConfig,
  type HomepageScope,
  type HomepageUserLayout,
} from '@openg2p/dashboard-widgets';
import '@openg2p/dashboard-widgets/styles.css';
import {
  fetchAttention,
  fetchDrafts,
  fetchMetrics,
  fetchPortfolio,
  fetchPrimaryScreen,
  fetchRecentRecords,
  fetchSearchSuggestions,
} from '@/features/homepage/api';
import type { HomepageScopeRequest } from '@/features/homepage/contracts';
import { fetchHomepageLayout } from '@/features/homepage/layoutStorage';

function toScopeRequest(scope: HomepageScope): HomepageScopeRequest {
  return {
    register: scope.register,
    geography: scope.geography,
    time_window: scope.timeWindow,
    comparison: scope.comparison,
    screen_id: scope.screenId,
  };
}

function buildDrillPath(drill: DrillConfig): string | null {
  if (!drill.route) return null;
  const params = new URLSearchParams();
  if (drill.filters) {
    Object.entries(drill.filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  const qs = params.toString();
  return qs ? `${drill.route}?${qs}` : drill.route;
}

function createDataSourceApi(): DashboardDataSourceApi {
  return {
    async fetchMetric(source, scope) {
      const res = await fetchMetrics([source], toScopeRequest(scope));
      return res.metrics?.[source] ?? null;
    },
    async fetchAttention(source, scope) {
      return fetchAttention(source, toScopeRequest(scope));
    },
    async fetchPortfolio(source, scope) {
      return fetchPortfolio(source, toScopeRequest(scope));
    },
    async fetchDrafts(source, scope) {
      return fetchDrafts(source, toScopeRequest(scope));
    },
    async fetchRecentRecords(source, scope) {
      return fetchRecentRecords(source, toScopeRequest(scope));
    },
    async fetchSuggestions(input) {
      return fetchSearchSuggestions(input);
    },
  };
}

export default function HomepageDashboard() {
  const router = useRouter();
  const { can, canAny, canAll } = useRbac();
  const [baseConfig, setBaseConfig] = useState<DashboardScreenConfig | null>(null);
  const [userLayout, setUserLayout] = useState<HomepageUserLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataSource = useMemo(() => createDataSourceApi(), []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([fetchPrimaryScreen(), fetchHomepageLayout()])
      .then(([screen, layout]) => {
        setBaseConfig(screen);
        setUserLayout(layout);
      })
      .catch((err) => {
        setBaseConfig(null);
        setUserLayout(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load homepage screen configuration',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchPrimaryScreen(), fetchHomepageLayout()])
      .then(([screen, layout]) => {
        if (!cancelled) {
          setBaseConfig(screen);
          setUserLayout(layout);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBaseConfig(null);
          setUserLayout(null);
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load homepage screen configuration',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleConfig = useMemo(() => {
    if (!baseConfig) return null;
    const composed = applyUserLayout(baseConfig, userLayout);
    return filterScreenByPermission(composed, { can, canAny, canAll });
  }, [baseConfig, userLayout, can, canAny, canAll]);

  const handleDrill = useCallback(
    (drill: DrillConfig) => {
      const path = buildDrillPath(drill);
      if (path) router.push(path);
    },
    [router],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-second">
        <p className="text-neutral-first/50 text-[20px]">Loading dashboard…</p>
      </div>
    );
  }

  if (error || !visibleConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-second px-4">
        <p className="text-neutral-first/80 text-center text-lg max-w-xl">
          {error || 'Homepage screen is unavailable for this user.'}
        </p>
        <button
          type="button"
          className="rounded-md border border-primary-second bg-neutral-second px-4 py-2 text-sm"
          onClick={() => void load()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mx-auto flex max-w-[1280px] justify-end px-4 pt-3 sm:px-6">
        <Link
          href="/homepage/customize"
          className="rounded-md border border-[#e1e1e1] bg-white px-3 py-1.5 text-sm text-[#011627] hover:bg-[#f3f1f4]"
        >
          Customize homepage
        </Link>
      </div>
      <ScreenRenderer
        key={`${visibleConfig.screen.id}-${userLayout?.updatedAt || 'default'}-${visibleConfig.screen.widgets.length}`}
        config={visibleConfig}
        onDrill={handleDrill}
        dataSource={dataSource}
      />
    </div>
  );
}
