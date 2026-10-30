# @openg2p/dashboard-widgets

Config-driven staff homepage widgets for OpenG2P Registry.

## Responsibilities

- Render a versioned screen JSON through a business widget registry
- Share screen context (register / geography / time)
- Resolve widget values through a host-provided `DashboardDataSourceApi`
- Filter widgets/actions by permissions supplied by the host

Screen composition and metric/attention **data** come from staff-ui BFF APIs (which proxy staff-api). This package does not embed mock business data.

## Development

From `ui/dashboard-widgets`:

```bash
npm install
npm run build
npm pack
```

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run build` | Compile `src` to `dist` (CJS, ESM, and types) |
| `npm run clean` | Remove `dist` |
| `npm pack` | Create a tarball from `dist` for local installs |

Build before `npm pack`. The published package includes `dist` plus the CSS entry files.

## Usage

```tsx
import {
  ScreenRenderer,
  filterScreenByPermission,
  type DashboardDataSourceApi,
} from '@openg2p/dashboard-widgets';
import '@openg2p/dashboard-widgets/styles.css';

const visible = filterScreenByPermission(screenFromApi, { can, canAny, canAll });

return (
  <ScreenRenderer
    config={visible}
    dataSource={dataSourceApi}
    onDrill={navigate}
  />
);
```

## Widget data binding

Widgets that need live values declare:

```json
{ "type": "metric", "data": { "source": "register.total" }, "config": { "label": "Records" } }
```
