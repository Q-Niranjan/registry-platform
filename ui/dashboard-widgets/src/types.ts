export type PermissionRequirement = {
  action?: string;
  any?: readonly string[];
  all?: readonly string[];
};

export type WidgetScope = {
  register?: boolean;
  geography?: boolean;
  time?: boolean;
};

export type DrillConfig = {
  route?: string;
  label?: string;
  filters?: Record<string, string>;
};

export type ScreenContextState = {
  register: string;
  geography: string;
  geographyLabel: string;
  timeWindow: string;
  timeWindowLabel: string;
  comparison: string;
  comparisonLabel: string;
  registers: Array<{ id: string; label: string; firstClass?: boolean }>;
  geographies: Array<{ id: string; label: string; sparse?: boolean }>;
  timeWindows: Array<{ id: string; label: string }>;
  comparisons?: Array<{ id: string; label: string }>;
};

export type ScreenIdentity = {
  name: string;
  type: string;
  authority: string;
  jurisdiction: string;
  environment?: string;
  sealInitials?: string;
  tagline?: string;
};

export type ScreenTrust = {
  asOf: string;
  freshness: 'live' | 'near-real-time' | 'periodic';
  freshnessLabel: string;
};

export type WidgetPosition = {
  row: number;
  col: number;
  /** Width in 12-column grid units. */
  span: number;
  /** Height in grid row units (optional; defaults to 1). */
  rowSpan?: number;
};

export type WidgetDataBinding = {
  /** Logical data source key resolved by the host app (e.g. register.total). */
  source: string;
};

export type DashboardWidgetBase = {
  id: string;
  type: string;
  position?: WidgetPosition;
  permission?: PermissionRequirement;
  scope?: WidgetScope;
  drill?: DrillConfig;
  /** When set, widget values are loaded via DashboardDataSourceApi. */
  data?: WidgetDataBinding;
  config?: Record<string, unknown>;
};

export type MetricWidgetConfig = {
  label: string;
  compact: string;
  exact?: string;
  deltaLabel?: string;
  delta?: number;
  status?: 'on-track' | 'watch' | 'critical';
  sparkline?: number[];
  scopeCaption?: string;
};

export type AttentionItem = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  count: number;
  aging: string;
  owner: string;
  unscoped?: boolean;
  permission?: PermissionRequirement;
  drill?: DrillConfig;
};

export type ActionItem = {
  id: string;
  label: string;
  primary?: boolean;
  overflow?: boolean;
  icon?: string;
  permission?: PermissionRequirement;
  drill?: DrillConfig;
};

export type PortfolioItem = {
  id: string;
  label: string;
  compact: string;
  health: 'on-track' | 'watch' | 'critical';
  healthLabel: string;
  firstClass?: boolean;
};

export type SearchMode = { id: string; label: string; permission?: PermissionRequirement };
export type SearchSuggestion = {
  id: string;
  name: string;
  meta: string;
  register: string;
  registerLabel: string;
};

export type DashboardScreenConfig = {
  version: string;
  demo?: boolean;
  screen: {
    id: string;
    title: string;
    primaryAction?: string;
    identity?: ScreenIdentity;
    trust: ScreenTrust;
    context: ScreenContextState;
    layout?: {
      type: 'grid';
      columns: number;
      gap?: 'sm' | 'md' | 'lg';
    };
    widgets: DashboardWidgetBase[];
  };
};

export type PermissionChecker = {
  can: (action: string) => boolean;
  canAny: (actions: readonly string[]) => boolean;
  canAll: (actions: readonly string[]) => boolean;
};

export type DrillHandler = (drill: DrillConfig, meta?: { widgetId: string; label?: string }) => void;

export type DashboardWidgetProps = {
  widget: DashboardWidgetBase;
  onDrill?: DrillHandler;
};
