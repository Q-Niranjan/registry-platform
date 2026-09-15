import type {
  DashboardScreenConfig,
  DashboardWidgetBase,
  PermissionChecker,
  PermissionRequirement,
  WidgetPosition,
} from '../types';

export type HomepageUserLayout = {
  version: '1.0';
  baseScreenId: string;
  /** Ordered widget ids referencing the base screen catalog (and optional full widgets). */
  widgets: DashboardWidgetBase[];
  updatedAt?: string;
};

export type PaletteWidget = {
  widget: DashboardWidgetBase;
  label: string;
  description: string;
};

export const HOMEPAGE_GRID_COLUMNS = 12;
export const HOMEPAGE_GRID_GAP_PX = 16;
export const HOMEPAGE_GRID_ROW_PX = 56;

function allows(
  requirement: PermissionRequirement | undefined,
  checker: PermissionChecker,
): boolean {
  if (!requirement) return true;
  if (requirement.action) return checker.can(requirement.action);
  if (requirement.any?.length) return checker.canAny(requirement.any);
  if (requirement.all?.length) return checker.canAll(requirement.all);
  return true;
}

export function widgetDisplayLabel(widget: DashboardWidgetBase): string {
  const cfg = widget.config || {};
  if (typeof cfg.label === 'string' && cfg.label.trim()) return cfg.label;
  if (typeof cfg.title === 'string' && cfg.title.trim()) return cfg.title;
  if (widget.type === 'search') return 'Search';
  if (widget.type === 'action_bar') return 'Actions';
  if (widget.type === 'context_bar') return 'Context filters';
  if (widget.type === 'identity') return 'Identity';
  if (widget.type === 'attention') return 'Needs attention';
  if (widget.type === 'portfolio') return 'Portfolio';
  if (widget.type === 'drafts') return 'Drafts';
  if (widget.type === 'recent_records') return 'Recent records';
  if (widget.type === 'config_shortcuts') return 'Configuration';
  return widget.id;
}

export function widgetDescription(widget: DashboardWidgetBase): string {
  switch (widget.type) {
    case 'search':
      return 'Search records and related work';
    case 'action_bar':
      return 'Primary actions for this role';
    case 'metric':
      return 'Headline metric card';
    case 'attention':
      return 'Tasks and alerts that need action';
    case 'portfolio':
      return 'Multi-register portfolio';
    case 'drafts':
      return 'Drafts and intake pulse';
    case 'recent_records':
      return 'Recently opened records';
    case 'context_bar':
      return 'Register, geography, and time filters';
    case 'identity':
      return 'Registry identity chrome';
    default:
      return widget.type;
  }
}

export function defaultRowSpan(type: string): number {
  switch (type) {
    case 'metric':
      return 4;
    case 'search':
    case 'action_bar':
      return 3;
    case 'attention':
    case 'portfolio':
    case 'drafts':
    case 'recent_records':
    case 'config_shortcuts':
      return 6;
    default:
      return 4;
  }
}

export function clampSpan(span: number): number {
  return Math.min(
    HOMEPAGE_GRID_COLUMNS,
    Math.max(1, Math.round(span)),
  );
}

export function clampRowSpan(rowSpan: number): number {
  return Math.min(24, Math.max(1, Math.round(rowSpan)));
}

export function normalizePosition(
  widget: DashboardWidgetBase,
  fallbackIndex = 0,
): WidgetPosition {
  const span = clampSpan(widget.position?.span ?? HOMEPAGE_GRID_COLUMNS);
  const rowSpan = clampRowSpan(
    widget.position?.rowSpan ?? defaultRowSpan(widget.type),
  );
  const col = Math.min(
    HOMEPAGE_GRID_COLUMNS - span + 1,
    Math.max(1, Math.round(widget.position?.col ?? 1)),
  );
  const row = Math.max(1, Math.round(widget.position?.row ?? fallbackIndex + 1));
  return { row, col, span, rowSpan };
}

/** Preserve freeform positions; fill any missing fields. */
export function ensureLayoutPositions(
  widgets: DashboardWidgetBase[],
): DashboardWidgetBase[] {
  return widgets.map((widget, index) => ({
    ...widget,
    position: normalizePosition(widget, index),
  }));
}

/**
 * @deprecated Prefer ensureLayoutPositions for freeform layouts.
 * Kept for callers that want a simple stacked list.
 */
export function renumberLayoutRows(
  widgets: DashboardWidgetBase[],
): DashboardWidgetBase[] {
  let row = 1;
  return widgets.map((widget) => {
    const span = clampSpan(widget.position?.span ?? HOMEPAGE_GRID_COLUMNS);
    const rowSpan = clampRowSpan(
      widget.position?.rowSpan ?? defaultRowSpan(widget.type),
    );
    const positioned = {
      ...widget,
      position: { row, col: 1, span, rowSpan },
    };
    row += rowSpan;
    return positioned;
  });
}

/** Widgets the user may place on their homepage (permission-filtered catalog). */
export function getAllowedPalette(
  baseScreen: DashboardScreenConfig,
  checker: PermissionChecker,
): PaletteWidget[] {
  return (baseScreen.screen.widgets || [])
    .filter((widget) => allows(widget.permission, checker))
    .filter((widget) => widget.type !== 'identity')
    .map((widget) => ({
      widget: structuredClone(widget),
      label: widgetDisplayLabel(widget),
      description: widgetDescription(widget),
    }));
}

/** Apply a saved user layout onto the base screen shell (context/trust/title). */
export function applyUserLayout(
  baseScreen: DashboardScreenConfig,
  layout: HomepageUserLayout | null | undefined,
): DashboardScreenConfig {
  if (!layout?.widgets) return baseScreen;

  const catalog = new Map(
    (baseScreen.screen.widgets || []).map((w) => [w.id, w] as const),
  );

  const widgets: DashboardWidgetBase[] = layout.widgets.map((saved, index) => {
    const fromCatalog = catalog.get(saved.id);
    const position = normalizePosition(
      {
        ...(fromCatalog || saved),
        position: saved.position ?? fromCatalog?.position,
      },
      index,
    );

    if (fromCatalog) {
      return {
        ...structuredClone(fromCatalog),
        position,
      };
    }

    return {
      ...structuredClone(saved),
      position,
    };
  });

  return {
    ...baseScreen,
    screen: {
      ...baseScreen.screen,
      widgets,
    },
  };
}

export function createEmptyLayout(baseScreenId: string): HomepageUserLayout {
  return {
    version: '1.0',
    baseScreenId,
    widgets: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createLayoutFromWidgets(
  baseScreenId: string,
  widgets: DashboardWidgetBase[],
): HomepageUserLayout {
  return {
    version: '1.0',
    baseScreenId,
    widgets: ensureLayoutPositions(widgets).map((widget) =>
      structuredClone(widget),
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function nextOpenRow(widgets: DashboardWidgetBase[]): number {
  return widgets.reduce((max, widget) => {
    const pos = normalizePosition(widget);
    return Math.max(max, pos.row + pos.rowSpan! - 1);
  }, 0) + 1;
}

export function gridPlacementStyle(position: WidgetPosition): {
  gridColumn: string;
  gridRow: string;
} {
  const span = clampSpan(position.span);
  const rowSpan = clampRowSpan(position.rowSpan ?? 1);
  const col = Math.min(
    HOMEPAGE_GRID_COLUMNS - span + 1,
    Math.max(1, position.col),
  );
  const row = Math.max(1, position.row);
  return {
    gridColumn: `${col} / span ${span}`,
    gridRow: `${row} / span ${rowSpan}`,
  };
}
