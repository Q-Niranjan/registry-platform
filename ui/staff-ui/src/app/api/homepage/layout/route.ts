import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import type { HomepageUserLayout } from '@openg2p/dashboard-widgets';
import { EXPECTED_HOMEPAGE_LAYOUT_RESPONSE } from '@/features/homepage/contracts';

/**
 * GET /api/homepage/layout
 * PUT /api/homepage/layout
 * DELETE /api/homepage/layout
 *
 * Temporary stub: personal homepage layout is stored in the browser
 * (localStorage) until staff-api homepage layout endpoints exist.
 *
 * @see EXPECTED_HOMEPAGE_LAYOUT_RESPONSE
 */
void EXPECTED_HOMEPAGE_LAYOUT_RESPONSE;

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  // No server-side personal layout yet.
  return new NextResponse(null, { status: 204 });
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: HomepageUserLayout;
  try {
    body = (await req.json()) as HomepageUserLayout;
  } catch {
    return NextResponse.json(
      { statusText: 'Invalid layout payload', code: 400 },
      { status: 400 },
    );
  }

  if (body?.version !== '1.0' || !Array.isArray(body.widgets)) {
    return NextResponse.json(
      { statusText: 'Layout must be version 1.0 with widgets[]', code: 400 },
      { status: 400 },
    );
  }

  // Echo accepted layout — persistence is client-side until backend lands.
  return NextResponse.json({
    ...body,
    updatedAt: new Date().toISOString(),
  } satisfies HomepageUserLayout);
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  return new NextResponse(null, { status: 204 });
}
