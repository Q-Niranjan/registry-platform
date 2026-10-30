'use client';

import { useEffect, useState } from 'react';
import { useDashboardDataSource } from '../DataSourceContext';
import { useScreenContext } from '../ScreenContext';
import type { DashboardWidgetProps, PortfolioItem } from '../types';

export function PortfolioWidget({ widget }: DashboardWidgetProps) {
  const staticItems = (widget.config?.items as PortfolioItem[]) || [];
  const { setRegister, context } = useScreenContext();
  const dataApi = useDashboardDataSource();
  const source = widget.data?.source;

  const [items, setItems] = useState<PortfolioItem[]>(staticItems);
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
      .fetchPortfolio(source, {
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
          setError(err instanceof Error ? err.message : 'Failed to load portfolio');
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

  if (loading) {
    return (
      <section className="og2p-dash-card" aria-label="Portfolio" aria-busy>
        <h2>Portfolio</h2>
        <p className="og2p-dash-item-meta">Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="og2p-dash-card" aria-label="Portfolio">
        <h2>Portfolio</h2>
        <p className="og2p-dash-item-meta">{error}</p>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="og2p-dash-card" aria-label="Portfolio">
      <h2>Portfolio</h2>
      <div className="og2p-dash-portfolio-row">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`og2p-dash-portfolio-card ${p.firstClass ? '' : 'related'}`}
            onClick={() => setRegister(p.id)}
          >
            <div className="og2p-dash-name">{p.label}</div>
            <div className="og2p-dash-value">{p.compact}</div>
            <div className="og2p-dash-badge">
              {p.firstClass ? 'First-class' : 'Related'} ·{' '}
              <span className={`og2p-dash-status-dot ${p.health}`} />
              {p.healthLabel}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
