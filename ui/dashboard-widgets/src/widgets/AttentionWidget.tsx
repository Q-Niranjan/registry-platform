'use client';

import { useEffect, useState } from 'react';
import { useDashboardDataSource } from '../DataSourceContext';
import { useScreenContext } from '../ScreenContext';
import type { AttentionItem, DashboardWidgetProps } from '../types';

function formatNumber(n: number) {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

export function AttentionWidget({ widget, onDrill }: DashboardWidgetProps) {
  const title = (widget.config?.title as string) || 'Needs attention';
  const staticItems = (widget.config?.items as AttentionItem[]) || [];
  const dataApi = useDashboardDataSource();
  const { context } = useScreenContext();
  const source = widget.data?.source;

  const [items, setItems] = useState<AttentionItem[]>(staticItems);
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
      .fetchAttention(source, {
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
          setError(err instanceof Error ? err.message : 'Failed to load attention');
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

  const hasWork = items.some((a) => a.count > 0);

  if (loading) {
    return (
      <section className="og2p-dash-card" aria-label={title} aria-busy>
        <h2>{title}</h2>
        <div className="og2p-dash-caught-up">
          <p>Loading…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="og2p-dash-card" aria-label={title}>
        <h2>{title}</h2>
        <div className="og2p-dash-caught-up">
          <b>Unable to load</b>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!hasWork) {
    return (
      <section className="og2p-dash-card" aria-label={title}>
        <h2>{title}</h2>
        <div className="og2p-dash-caught-up">
          <b>You are caught up</b>
          <p>Nothing needs attention in this scope.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="og2p-dash-card" aria-label={title}>
      <h2>{title}</h2>
      {items.map((a) => (
        <button
          key={a.id}
          type="button"
          className="og2p-dash-attention-item"
          onClick={() =>
            onDrill?.(a.drill || { label: a.title }, {
              widgetId: widget.id,
              label: a.title,
            })
          }
        >
          <span className={`og2p-dash-sev ${a.severity}`} aria-hidden />
          <span>
            <span className="og2p-dash-item-title">{a.title}</span>
            <div className="og2p-dash-item-meta">
              {a.severity} · {a.aging} · {a.owner}
              {a.unscoped ? ' · not scoped' : ''}
            </div>
          </span>
          <span className="og2p-dash-count">{formatNumber(a.count)}</span>
        </button>
      ))}
    </section>
  );
}
