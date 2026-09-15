'use client';

import { useEffect, useState } from 'react';
import { useDashboardDataSource } from '../DataSourceContext';
import { useScreenContext } from '../ScreenContext';
import type { DashboardWidgetProps, MetricWidgetConfig } from '../types';

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 64;
      const y = 20 - ((v - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="og2p-dash-spark" viewBox="0 0 64 24" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

export function MetricWidget({ widget, onDrill }: DashboardWidgetProps) {
  const base = (widget.config || {}) as Partial<MetricWidgetConfig>;
  const dataApi = useDashboardDataSource();
  const { context } = useScreenContext();
  const source = widget.data?.source;

  const [remote, setRemote] = useState<Partial<MetricWidgetConfig> | null>(null);
  const [loading, setLoading] = useState(Boolean(source && dataApi));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source || !dataApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    dataApi
      .fetchMetric(source, {
        register: context.register,
        geography: context.geography,
        timeWindow: context.timeWindow,
        comparison: context.comparison,
      })
      .then((metric) => {
        if (!cancelled) setRemote(metric);
      })
      .catch((err) => {
        if (!cancelled) {
          setRemote(null);
          setError(err instanceof Error ? err.message : 'Failed to load metric');
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

  const cfg: MetricWidgetConfig = {
    label: remote?.label || base.label || 'Metric',
    compact: remote?.compact ?? (loading ? '…' : base.compact ?? '—'),
    exact: remote?.exact ?? base.exact,
    delta: remote?.delta ?? base.delta,
    deltaLabel: remote?.deltaLabel ?? base.deltaLabel,
    status: remote?.status ?? base.status ?? 'on-track',
    sparkline: remote?.sparkline ?? base.sparkline,
    scopeCaption: remote?.scopeCaption ?? base.scopeCaption,
  };

  const up = (cfg.delta ?? 0) >= 0;
  const status = cfg.status || 'on-track';

  return (
    <button
      type="button"
      className="og2p-dash-metric"
      disabled={loading}
      aria-busy={loading}
      aria-label={`${cfg.label}, ${cfg.compact}${cfg.deltaLabel ? `, ${cfg.deltaLabel}` : ''}`}
      onClick={() =>
        onDrill?.(widget.drill || { label: cfg.label }, {
          widgetId: widget.id,
          label: cfg.label,
        })
      }
    >
      <div className="og2p-dash-metric-label">
        <span className={`og2p-dash-status-dot ${status}`} />
        {cfg.label}
      </div>
      <div className="og2p-dash-metric-value" title={cfg.exact}>
        {cfg.compact}
      </div>
      {error ? (
        <div className="og2p-dash-metric-scope">{error}</div>
      ) : cfg.deltaLabel ? (
        <div
          className={`og2p-dash-metric-delta ${status === 'watch' ? 'watch' : up ? 'up' : 'down'}`}
        >
          {up ? '▲' : '▼'} {cfg.deltaLabel}
        </div>
      ) : null}
      {cfg.sparkline?.length ? <Sparkline values={cfg.sparkline} /> : null}
      {cfg.scopeCaption ? (
        <div className="og2p-dash-metric-scope">{cfg.scopeCaption}</div>
      ) : null}
    </button>
  );
}
