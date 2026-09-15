'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useRbac } from '@/context/RbacContext';
import {
  HomepageLayoutBuilder,
  filterScreenByPermission,
  type DashboardDataSourceApi,
  type DashboardScreenConfig,
  type HomepageScope,
  type HomepageUserLayout,
} from '@openg2p/dashboard-widgets';
import '@openg2p/dashboard-widgets/styles.css';
import '@openg2p/dashboard-widgets/builder.css';
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
import {
  fetchHomepageLayout,
  resetHomepageLayout,
  saveHomepageLayout,
} from '@/features/homepage/layoutStorage';

function toScopeRequest(scope: HomepageScope): HomepageScopeRequest {
  return {
    register: scope.register,
    geography: scope.geography,
    time_window: scope.timeWindow,
    comparison: scope.comparison,
    screen_id: scope.screenId,
  };
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

export default function CustomizeHomepagePage() {
  const router = useRouter();
  const { can, canAny, canAll } = useRbac();
  const permissionChecker = useMemo(
    () => ({ can, canAny, canAll }),
    [can, canAny, canAll],
  );
  const dataSource = useMemo(() => createDataSourceApi(), []);

  const [baseScreen, setBaseScreen] = useState<DashboardScreenConfig | null>(null);
  const [initialLayout, setInitialLayout] = useState<HomepageUserLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderKey, setBuilderKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [screen, layout] = await Promise.all([
          fetchPrimaryScreen(),
          fetchHomepageLayout(),
        ]);
        if (cancelled) return;
        setBaseScreen(screen);
        setInitialLayout(layout);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load homepage catalog',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedBase = useMemo(() => {
    if (!baseScreen) return null;
    return filterScreenByPermission(baseScreen, permissionChecker);
  }, [baseScreen, permissionChecker]);

  const seedLayout = useMemo(() => {
    if (!allowedBase) return null;
    if (initialLayout) return initialLayout;
    // No saved layout → seed builder with the same default homepage widgets.
    return {
      version: '1.0' as const,
      baseScreenId: allowedBase.screen.id,
      widgets: allowedBase.screen.widgets,
    };
  }, [allowedBase, initialLayout]);

  const handleSave = useCallback(
    async (layout: HomepageUserLayout) => {
      await saveHomepageLayout(layout);
      router.push('/');
    },
    [router],
  );

  const handleReset = useCallback(async () => {
    await resetHomepageLayout();
    setInitialLayout(null);
    setBuilderKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-second">
        <p className="text-neutral-first/50 text-[20px]">Loading builder…</p>
      </div>
    );
  }

  if (error || !allowedBase || !seedLayout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-second px-4">
        <p className="text-neutral-first/80 text-center text-lg">
          {error || 'Homepage catalog unavailable.'}
        </p>
        <button
          type="button"
          className="rounded-md border border-primary-second px-4 py-2 text-sm"
          onClick={() => router.push('/')}
        >
          Back to homepage
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f1f4]">
      <HomepageLayoutBuilder
        key={builderKey}
        baseScreen={allowedBase}
        permissionChecker={permissionChecker}
        initialLayout={seedLayout}
        dataSource={dataSource}
        onSave={handleSave}
        onResetToDefault={async () => {
          await handleReset();
          router.push('/');
        }}
        onCancel={() => router.push('/')}
      />
    </div>
  );
}
