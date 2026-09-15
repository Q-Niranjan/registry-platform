'use client';

import { useEffect, useState } from 'react';
import { useDashboardDataSource, type RecentDataItem } from '../DataSourceContext';
import { useScreenContext } from '../ScreenContext';
import type { DashboardWidgetProps } from '../types';

export function RecentRecordsWidget({ widget, onDrill }: DashboardWidgetProps) {
  const staticItems = (widget.config?.items as RecentDataItem[]) || [];
  const title = (widget.config?.title as string) || 'Recent records';
  const dataApi = useDashboardDataSource();
  const { context } = useScreenContext();
  const source = widget.data?.source;

  const [items, setItems] = useState<RecentDataItem[]>(staticItems);
  const [loading, setLoading] = useState(Boolean(source && dataApi));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source || !dataApi) {
      setItems(staticItems);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    dataApi
      .fetchRecentRecords(source, {
        register: context.register,
        geography: context.geography,
        timeWindow: context.timeWindow,
        comparison: context.comparison,
      })
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : 'Failed to load recent records');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    source,
    dataApi,
    context.register,
    context.geography,
    context.timeWindow,
    context.comparison,
  ]);

  return (
    <section className="og2p-dash-card" aria-label={title} aria-busy={loading}>
      <h2>{title}</h2>
      {loading ? (
        <div className="og2p-dash-caught-up">
          <p>Loading…</p>
        </div>
      ) : error ? (
        <div className="og2p-dash-caught-up">
          <b>Unable to load</b>
          <p>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="og2p-dash-caught-up">
          <b>No recent records</b>
          <p>Records you open will appear here.</p>
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="og2p-dash-attention-item"
            onClick={() =>
              onDrill?.(
                {
                  route: `/register/${item.register}/${item.id}`,
                  label: item.name,
                },
                { widgetId: widget.id, label: item.name },
              )
            }
          >
            <span className="og2p-dash-sev info" aria-hidden />
            <span>
              <span className="og2p-dash-item-title">{item.name}</span>
              <div className="og2p-dash-item-meta">{item.meta}</div>
            </span>
            <span className="og2p-dash-id">{item.id}</span>
          </button>
        ))
      )}
    </section>
  );
}
