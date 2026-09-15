import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_METRICS_RESPONSE,
  type ExpectedMetricsResponse,
  type HomepageScopeRequest,
} from '@/features/homepage/contracts';
import { getNsrStubMetrics, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';
import {
  fetchLiveIntakePending,
  fetchLiveRegisterCounts,
  fetchLiveTaskCount,
} from '@/features/homepage/server/liveEnrichment';

/**
 * POST /api/homepage/metrics
 *
 * Temporary NSR stub, enriched with live register summary / intake / task
 * stats from existing staff-api endpoints when available.
 *
 * @see EXPECTED_METRICS_RESPONSE
 */
void EXPECTED_METRICS_RESPONSE;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { sources?: string[]; context?: HomepageScopeRequest } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!NSR_STUB_ENABLED) {
    return NextResponse.json(
      { statusText: 'Homepage metrics backend is not configured', code: 501 },
      { status: 501 },
    );
  }

  const sources = body.sources ?? [];
  const liveCounts = await fetchLiveRegisterCounts(req);
  const metricsPayload = getNsrStubMetrics(sources, liveCounts);

  const intakePending = await fetchLiveIntakePending(req);
  if (
    intakePending !== null &&
    (!sources.length || sources.includes('intake.pending'))
  ) {
    metricsPayload.metrics['intake.pending'] = {
      ...(metricsPayload.metrics['intake.pending'] || {
        source: 'intake.pending',
        label: 'Pending submissions',
        status: 'watch',
        sparkline: [],
        scopeCaption: 'Intake',
      }),
      source: 'intake.pending',
      compact: new Intl.NumberFormat('en-IN').format(intakePending),
      exact: new Intl.NumberFormat('en-IN').format(intakePending),
    };
  }

  const taskCount = await fetchLiveTaskCount(req);
  if (taskCount !== null && (!sources.length || sources.includes('tasks.open'))) {
    metricsPayload.metrics['tasks.open'] = {
      ...(metricsPayload.metrics['tasks.open'] || {
        source: 'tasks.open',
        label: 'Open tasks',
        status: 'on-track',
        sparkline: [],
        scopeCaption: 'Verification',
      }),
      source: 'tasks.open',
      compact: new Intl.NumberFormat('en-IN').format(taskCount),
      exact: new Intl.NumberFormat('en-IN').format(taskCount),
    };
  }

  return NextResponse.json(metricsPayload satisfies ExpectedMetricsResponse);
}
