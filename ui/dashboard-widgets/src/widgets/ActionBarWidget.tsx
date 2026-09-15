'use client';

import { useState } from 'react';
import type { ActionItem, DashboardWidgetProps } from '../types';

export function ActionBarWidget({ widget, onDrill }: DashboardWidgetProps) {
  const actions = ((widget.config?.actions as ActionItem[]) || []).filter(Boolean);
  const primary = actions.filter((a) => !a.overflow);
  const extra = actions.filter((a) => a.overflow);
  const [open, setOpen] = useState(false);

  if (!actions.length) return null;

  return (
    <nav className="og2p-dash-actions" aria-label="Primary actions">
      {primary.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`og2p-dash-action ${a.primary ? 'primary' : ''}`}
          onClick={() =>
            onDrill?.(a.drill || { label: a.label }, {
              widgetId: widget.id,
              label: a.label,
            })
          }
        >
          {a.label}
        </button>
      ))}

      {extra.length > 0 ? (
        <div className="og2p-dash-overflow-wrap">
          <button
            type="button"
            className="og2p-dash-action"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            More actions
          </button>
          {open ? (
            <div className="og2p-dash-overflow-menu">
              {extra.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="og2p-dash-row-btn"
                  onClick={() => {
                    setOpen(false);
                    onDrill?.(a.drill || { label: a.label }, {
                      widgetId: widget.id,
                      label: a.label,
                    });
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
