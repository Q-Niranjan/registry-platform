'use client';

import { useEffect, useMemo } from 'react';
import { ScreenContextProvider } from './ScreenContext';
import { dashboardWidgetRegistry } from './registry';
import { registerDefaultDashboardWidgets } from './widgets/defaultWidgets';
import type {
  DashboardScreenConfig,
  DashboardWidgetBase,
  DrillHandler,
} from './types';
import type { DashboardDataSourceApi } from './DataSourceContext';
import { DashboardDataProvider } from './DataSourceContext';
import {
  gridPlacementStyle,
  normalizePosition,
} from './builder/layoutModel';

registerDefaultDashboardWidgets();

function sortWidgets(widgets: DashboardWidgetBase[]) {
  return [...widgets].sort((a, b) => {
    const rowA = a.position?.row ?? 999;
    const rowB = b.position?.row ?? 999;
    if (rowA !== rowB) return rowA - rowB;
    return (a.position?.col ?? 0) - (b.position?.col ?? 0);
  });
}

function usesFreeformLayout(body: DashboardWidgetBase[]) {
  // Customized layouts and multi-column defaults use explicit grid placement.
  return body.length > 0;
}

function WidgetHost({
  widget,
  onDrill,
  freeform,
}: {
  widget: DashboardWidgetBase;
  onDrill?: DrillHandler;
  freeform?: boolean;
}) {
  const entry = dashboardWidgetRegistry.get(widget.type);
  if (!entry) {
    return (
      <div className="og2p-dash-unknown" role="note">
        Unsupported widget type: <code>{widget.type}</code>
      </div>
    );
  }
  const Component = entry.component;
  const position = normalizePosition(widget);
  const style = freeform
    ? gridPlacementStyle(position)
    : { gridColumn: `span ${position.span}` };

  return (
    <div
      className="og2p-dash-widget-slot"
      style={style}
      data-widget-type={widget.type}
      data-widget-id={widget.id}
    >
      <Component widget={widget} onDrill={onDrill} />
    </div>
  );
}

export function ScreenRenderer({
  config,
  onDrill,
  className,
  dataSource,
}: {
  config: DashboardScreenConfig;
  onDrill?: DrillHandler;
  className?: string;
  dataSource?: DashboardDataSourceApi;
}) {
  useEffect(() => {
    registerDefaultDashboardWidgets();
  }, []);

  const widgets = useMemo(
    () => sortWidgets(config.screen.widgets || []),
    [config.screen.widgets],
  );

  const chrome = widgets.filter(
    (w) => w.type === 'identity' || w.type === 'context_bar',
  );
  const body = widgets.filter(
    (w) => w.type !== 'identity' && w.type !== 'context_bar',
  );

  const identityFromScreen = config.screen.identity;
  const trustFromScreen = config.screen.trust;

  const chromeWithScreenData = chrome
    .map((widget) => {
      if (widget.type === 'identity') {
        const identity =
          (widget.config?.identity as object | undefined) || identityFromScreen;
        if (!identity) return null;
        return {
          ...widget,
          config: {
            ...(widget.config || {}),
            identity,
          },
        };
      }
      if (widget.type === 'context_bar') {
        return {
          ...widget,
          config: {
            ...(widget.config || {}),
            trust: (widget.config?.trust as object) || trustFromScreen,
          },
        };
      }
      return widget;
    })
    .filter((widget): widget is DashboardWidgetBase => widget !== null);

  const freeform = usesFreeformLayout(body);

  const content = (
    <ScreenContextProvider
      initialContext={config.screen.context}
      asOf={config.screen.trust.asOf}
    >
      <div className={`og2p-dash-root ${className || ''}`.trim()}>
        {chromeWithScreenData.map((widget) => (
          <WidgetHost key={widget.id} widget={widget} onDrill={onDrill} />
        ))}

        <main className="og2p-dash-page">
          <div className="og2p-dash-screen-title-row">
            <h2 className="og2p-dash-screen-title">{config.screen.title}</h2>
          </div>

          <div
            className={`og2p-dash-grid ${freeform ? 'og2p-dash-grid--freeform' : ''}`}
          >
            {body.map((widget) => (
              <WidgetHost
                key={widget.id}
                widget={widget}
                onDrill={onDrill}
                freeform={freeform}
              />
            ))}
          </div>
        </main>
      </div>
    </ScreenContextProvider>
  );

  if (!dataSource) return content;

  return <DashboardDataProvider api={dataSource}>{content}</DashboardDataProvider>;
}
