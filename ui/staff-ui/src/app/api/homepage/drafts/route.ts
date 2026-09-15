import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_DRAFTS_RESPONSE,
  type ExpectedDraftsResponse,
} from '@/features/homepage/contracts';
import { getNsrStubDrafts, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';

/**
 * POST /api/homepage/drafts
 *
 * Temporary NSR stub response.
 * @see EXPECTED_DRAFTS_RESPONSE
 */
void EXPECTED_DRAFTS_RESPONSE;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!NSR_STUB_ENABLED) {
    return NextResponse.json(
      { statusText: 'Homepage drafts backend is not configured', code: 501 },
      { status: 501 },
    );
  }

  return NextResponse.json(getNsrStubDrafts() satisfies ExpectedDraftsResponse);
}
