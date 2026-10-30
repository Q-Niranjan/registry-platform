import type { ComponentType } from 'react';
import type { DashboardWidgetProps } from './types';

type Entry = {
  type: string;
  component: ComponentType<DashboardWidgetProps>;
};

class DashboardWidgetRegistry {
  private widgets = new Map<string, Entry>();

  register(entry: Entry) {
    this.widgets.set(entry.type, entry);
  }

  registerMany(entries: Entry[]) {
    entries.forEach((entry) => this.register(entry));
  }

  get(type: string) {
    return this.widgets.get(type);
  }

  has(type: string) {
    return this.widgets.has(type);
  }
}

export const dashboardWidgetRegistry = new DashboardWidgetRegistry();
