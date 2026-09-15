'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboardDataSource } from '../DataSourceContext';
import type {
  DashboardWidgetProps,
  SearchMode,
  SearchSuggestion,
} from '../types';

export function SearchWidget({ widget, onDrill }: DashboardWidgetProps) {
  const cfg = widget.config || {};
  const modes = (cfg.modes as SearchMode[]) || [];
  const placeholder =
    (cfg.placeholder as string) || 'Search registry by name or ID';
  const registers =
    (cfg.registers as Array<{ id: string; label: string }>) || [];
  const dataApi = useDashboardDataSource();
  const bound = Boolean(widget.data?.source && dataApi);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(modes[0]?.id || 'records');
  const [scope, setScope] = useState('all');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bound || !dataApi) {
      setSuggestions([]);
      return;
    }
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      dataApi
        .fetchSuggestions({
          query: q,
          mode,
          register: scope === 'all' ? undefined : scope,
          limit: 8,
        })
        .then((items) => {
          if (!cancelled) setSuggestions(items);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [bound, dataApi, query, mode, scope]);

  const filtered = useMemo(() => suggestions.slice(0, 8), [suggestions]);

  const handleSearch = () => {
    onDrill?.(
      {
        route: (cfg.defaultRoute as string) || '/register',
        filters: {
          search: query.trim(),
          mode,
          ...(scope !== 'all' ? { register: scope } : {}),
        },
      },
      { widgetId: widget.id, label: 'Search' },
    );
  };

  return (
    <section className="og2p-dash-search-block" aria-label="Primary search">
      <div className="og2p-dash-search-row">
        {registers.length > 0 ? (
          <select
            className="og2p-dash-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="Search register scope"
          >
            <option value="all">All registers</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        ) : null}

        {modes.length > 0 ? (
          <select
            className="og2p-dash-select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            aria-label="Search mode"
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        ) : null}

        <input
          className="og2p-dash-search-input"
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          aria-label={placeholder}
        />
        <button type="button" className="og2p-dash-search-go" onClick={handleSearch}>
          Search
        </button>
      </div>

      {loading ? (
        <div className="og2p-dash-suggest og2p-dash-zero-suggest">
          <p>Searching…</p>
        </div>
      ) : null}

      {!loading && query.trim() && filtered.length === 0 ? (
        <div className="og2p-dash-suggest og2p-dash-zero-suggest">
          <b>No matches</b>
          <p>Submit to open full search results.</p>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="og2p-dash-suggest">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              className="og2p-dash-suggest-item"
              onClick={() =>
                onDrill?.(
                  {
                    route: `/register/${s.register}/${s.id}`,
                    label: s.name,
                  },
                  { widgetId: widget.id, label: s.name },
                )
              }
            >
              <span>
                <b>{s.name}</b> · {s.meta}
              </span>
              <span className="og2p-dash-id">{s.id}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
