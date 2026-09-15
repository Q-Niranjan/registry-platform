export type {
  ActionItem,
  AttentionItem,
  DashboardScreenConfig,
  DashboardWidgetBase,
  DashboardWidgetProps,
  DrillConfig,
  DrillHandler,
  MetricWidgetConfig,
  PermissionChecker,
  PermissionRequirement,
  PortfolioItem,
  ScreenContextState,
  ScreenIdentity,
  ScreenTrust,
  SearchMode,
  SearchSuggestion,
  WidgetDataBinding,
  WidgetScope,
} from './types';

export { ScreenRenderer } from './ScreenRenderer';
export { ScreenContextProvider, useScreenContext } from './ScreenContext';
export {
  DashboardDataProvider,
  useDashboardDataSource,
} from './DataSourceContext';
export type {
  DashboardDataSourceApi,
  HomepageScope,
  DraftDataItem,
  RecentDataItem,
} from './DataSourceContext';
export { dashboardWidgetRegistry } from './registry';
export { registerDefaultDashboardWidgets } from './widgets/defaultWidgets';
export { filterScreenByPermission } from './filterByPermission';

export { HomepageLayoutBuilder } from './builder/HomepageLayoutBuilder';
export type { HomepageLayoutBuilderProps } from './builder/HomepageLayoutBuilder';
export {
  applyUserLayout,
  createEmptyLayout,
  createLayoutFromWidgets,
  ensureLayoutPositions,
  getAllowedPalette,
  renumberLayoutRows,
  widgetDescription,
  widgetDisplayLabel,
} from './builder/layoutModel';
export type { HomepageUserLayout, PaletteWidget } from './builder/layoutModel';
