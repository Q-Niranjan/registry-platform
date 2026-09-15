import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_PRIMARY_SCREEN_RESPONSE,
} from '@/features/homepage/contracts';
import { getNsrStubScreen, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';

/**
 * GET /api/homepage/primary-screen
 *
 * Temporary: returns NSR command-centre screen JSON.
 * Later: proxy to POST /homepage/get_primary_screen
 *
 * @see EXPECTED_PRIMARY_SCREEN_RESPONSE
 */
void EXPECTED_PRIMARY_SCREEN_RESPONSE;

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (NSR_STUB_ENABLED) {
    return NextResponse.json(getNsrStubScreen('command'));
  }

  return NextResponse.json(
    { statusText: 'Homepage primary screen backend is not configured', code: 501 },
    { status: 501 },
  );
}
