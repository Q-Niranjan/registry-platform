'use client';

import { useScreenContext } from '../ScreenContext';
import type { DashboardWidgetProps, ScreenTrust } from '../types';

function formatClock(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ContextBarWidget({ widget }: DashboardWidgetProps) {
  const {
    context,
    asOf,
    setRegister,
    setGeography,
    setTimeWindow,
    setComparison,
    refresh,
  } = useScreenContext();

  const trust = (widget.config?.trust || {}) as Partial<ScreenTrust>;
  const registerLabel =
    context.register === 'all'
      ? 'All registers'
      : context.registers.find((r) => r.id === context.register)?.label ||
        context.register;

  return (
    <>
      <div className="og2p-dash-trust-line">
        <div className="og2p-dash-trust-row">
          <span>
            <span className="og2p-dash-dot-live" />
            <b>As of:</b> {formatClock(asOf)}
            {trust.freshnessLabel ? ` · ${trust.freshnessLabel}` : ''}
          </span>
          <span className="og2p-dash-trust-sep" aria-hidden>
            ·
          </span>
          <span>
            <b>Scope:</b> {registerLabel} / {context.geographyLabel} /{' '}
            {context.timeWindowLabel}
          </span>
        </div>
      </div>

      <div className="og2p-dash-context-bar">
        <div className="og2p-dash-context" aria-label="Dashboard context">
          <div className="og2p-dash-ctx-group">
            <span className="og2p-dash-ctx-label">Register</span>
            <select
              className="og2p-dash-select"
              value={context.register}
              onChange={(e) => setRegister(e.target.value)}
              aria-label="Register"
            >
              <option value="all">All registers</option>
              {context.registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="og2p-dash-ctx-group">
            <span className="og2p-dash-ctx-label">Geography</span>
            <select
              className="og2p-dash-select"
              value={context.geography}
              onChange={(e) => setGeography(e.target.value)}
              aria-label="Geography"
            >
              {context.geographies.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="og2p-dash-ctx-group">
            <span className="og2p-dash-ctx-label">Time</span>
            <div className="og2p-dash-pillbar" role="group" aria-label="Time window">
              {context.timeWindows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="og2p-dash-pill"
                  aria-pressed={w.id === context.timeWindow}
                  onClick={() => setTimeWindow(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {context.comparisons?.length ? (
            <div className="og2p-dash-ctx-group">
              <span className="og2p-dash-ctx-label">Compare</span>
              <select
                className="og2p-dash-select"
                value={context.comparison}
                onChange={(e) => setComparison(e.target.value)}
                aria-label="Comparison"
              >
                {context.comparisons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="og2p-dash-ctx-spacer" />

          <button type="button" className="og2p-dash-refresh-btn" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>
    </>
  );
}
