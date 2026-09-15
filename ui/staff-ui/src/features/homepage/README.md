# Homepage (staff-ui)

## Temporary NSR mode

While homepage staff-api endpoints are not ready, routes return **National Social Registry** one-shot responses from `nsrStub.ts` (`NSR_STUB_ENABLED = true`).

Where possible they also call **existing** staff-api endpoints:

| Enrichment | Existing backend |
|---|---|
| Register counts / portfolio | `/register-metadata/get_dashboard_registers` |
| Search suggestions | `/register-data/search_in_a_register` |
| Pending submissions metric | `/intake-form-data/get_intake_form_submissions_summary` |
| Open tasks metric | `/awe/my_task_stats` |

Flip `NSR_STUB_ENABLED` off once real `/homepage/*` APIs exist and restore `proxyToBackend` in each route.

## Customize homepage

- UI: `/homepage/customize` (`HomepageLayoutBuilder`)
- Personal layout stored in `localStorage` (`layoutStorage.ts`) until backend exists
- BFF stub: `GET/PUT/DELETE /api/homepage/layout`
- Homepage applies saved layout via `applyUserLayout`, then permission-filters again

## BFF routes

| Staff-ui route | Planned staff-api | Contract |
|---|---|---|
| `GET /api/homepage/primary-screen` | `POST /homepage/get_primary_screen` | `EXPECTED_PRIMARY_SCREEN_RESPONSE` |
| `GET /api/homepage/screen?screenId=` | `POST /homepage/get_screen` | same screen shape |
| `POST /api/homepage/metrics` | `POST /homepage/get_metrics` | `EXPECTED_METRICS_RESPONSE` |
| `POST /api/homepage/attention` | `POST /homepage/get_attention` | `EXPECTED_ATTENTION_RESPONSE` |
| `POST /api/homepage/portfolio` | `POST /homepage/get_portfolio` | `EXPECTED_PORTFOLIO_RESPONSE` |
| `POST /api/homepage/drafts` | `POST /homepage/get_drafts` | `EXPECTED_DRAFTS_RESPONSE` |
| `POST /api/homepage/recent-records` | `POST /homepage/get_recent_records` | `EXPECTED_RECENT_RECORDS_RESPONSE` |
| `POST /api/homepage/search/suggest` | `POST /homepage/search_suggest` | `EXPECTED_SEARCH_SUGGEST_RESPONSE` |
