import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_PRIMARY_SCREEN_RESPONSE,
  type ExpectedScreenResponse,
} from '@/features/homepage/contracts';
import { getNsrStubScreen, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';

/**
 * GET /api/homepage/screen?screenId=
 *
 * Temporary: returns NSR screen JSON for the requested id (currently command).
 * Later: proxy to POST /homepage/get_screen
 *
 * @see EXPECTED_PRIMARY_SCREEN_RESPONSE
 */
void EXPECTED_PRIMARY_SCREEN_RESPONSE;
type _Contract = ExpectedScreenResponse;

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const screenId = req.nextUrl.searchParams.get('screenId') || 'command';

  if (NSR_STUB_ENABLED) {
    return NextResponse.json(getNsrStubScreen(screenId) satisfies _Contract);
  }

  return NextResponse.json(
    { statusText: 'Homepage screen backend is not configured', code: 501 },
    { status: 501 },
  );
}
