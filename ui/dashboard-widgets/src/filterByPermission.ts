import type {
  ActionItem,
  AttentionItem,
  DashboardScreenConfig,
  DashboardWidgetBase,
  PermissionChecker,
  PermissionRequirement,
  SearchMode,
} from './types';

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

function filterActions(actions: ActionItem[] | undefined, checker: PermissionChecker) {
  return (actions || []).filter((action) => allows(action.permission, checker));
}

function filterAttention(items: AttentionItem[] | undefined, checker: PermissionChecker) {
  return (items || []).filter((item) => allows(item.permission, checker));
}

function filterSearchModes(modes: SearchMode[] | undefined, checker: PermissionChecker) {
  return (modes || []).filter((mode) => allows(mode.permission, checker));
}

function filterWidgetConfig(
  widget: DashboardWidgetBase,
  checker: PermissionChecker,
): DashboardWidgetBase | null {
  if (!allows(widget.permission, checker)) return null;

  const config = { ...(widget.config || {}) };

  if (widget.type === 'action_bar' && Array.isArray(config.actions)) {
    config.actions = filterActions(config.actions as ActionItem[], checker);
    if ((config.actions as ActionItem[]).length === 0) return null;
  }

  if (widget.type === 'attention' && Array.isArray(config.items)) {
    config.items = filterAttention(config.items as AttentionItem[], checker);
  }

  if (widget.type === 'search' && Array.isArray(config.modes)) {
    config.modes = filterSearchModes(config.modes as SearchMode[], checker);
  }

  if (widget.type === 'config_shortcuts' && Array.isArray(config.actions)) {
    config.actions = filterActions(config.actions as ActionItem[], checker);
    if ((config.actions as ActionItem[]).length === 0) return null;
  }

  return { ...widget, config };
}

/** Drop unauthorized widgets/actions using the signed-in user's real permissions. */
export function filterScreenByPermission(
  screen: DashboardScreenConfig,
  checker: PermissionChecker,
): DashboardScreenConfig {
  const widgets = screen.screen.widgets
    .map((widget) => filterWidgetConfig(widget, checker))
    .filter((widget): widget is DashboardWidgetBase => widget !== null);

  return {
    ...screen,
    screen: {
      ...screen.screen,
      widgets,
    },
  };
}
