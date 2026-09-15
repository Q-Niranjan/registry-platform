'use client';

import type { ActionItem, DashboardWidgetProps } from '../types';

export function ConfigShortcutsWidget({ widget, onDrill }: DashboardWidgetProps) {
  const actions = (widget.config?.actions as ActionItem[]) || [];
  const title = (widget.config?.title as string) || 'Configuration';

  if (!actions.length) return null;

  return (
    <section className="og2p-dash-card" aria-label={title}>
      <h2>{title}</h2>
      <div className="og2p-dash-actions" style={{ marginTop: 8 }}>
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className="og2p-dash-action"
            onClick={() =>
              onDrill?.(a.drill || { route: '/configuration', label: a.label }, {
                widgetId: widget.id,
                label: a.label,
              })
            }
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
