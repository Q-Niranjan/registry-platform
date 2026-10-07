import { dashboardWidgetRegistry } from '../registry';
import { IdentityWidget } from './IdentityWidget';
import { ContextBarWidget } from './ContextBarWidget';
import { SearchWidget } from './SearchWidget';
import { MetricWidget } from './MetricWidget';
import { ActionBarWidget } from './ActionBarWidget';
import { AttentionWidget } from './AttentionWidget';
import { PortfolioWidget } from './PortfolioWidget';
import { DraftsWidget } from './DraftsWidget';
import { RecentRecordsWidget } from './RecentRecordsWidget';
import { ConfigShortcutsWidget } from './ConfigShortcutsWidget';

let registered = false;

export function registerDefaultDashboardWidgets() {
  if (registered) return;
  dashboardWidgetRegistry.registerMany([
    { type: 'identity', component: IdentityWidget },
    { type: 'context_bar', component: ContextBarWidget },
    { type: 'search', component: SearchWidget },
    { type: 'metric', component: MetricWidget },
    { type: 'action_bar', component: ActionBarWidget },
    { type: 'attention', component: AttentionWidget },
    { type: 'portfolio', component: PortfolioWidget },
    { type: 'drafts', component: DraftsWidget },
    { type: 'recent_records', component: RecentRecordsWidget },
    { type: 'config_shortcuts', component: ConfigShortcutsWidget },
  ]);
  registered = true;
}
