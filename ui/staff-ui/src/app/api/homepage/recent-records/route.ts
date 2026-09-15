import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_RECENT_RECORDS_RESPONSE,
  type ExpectedRecentRecordsResponse,
} from '@/features/homepage/contracts';
import { getNsrStubRecentRecords, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';

/**
 * POST /api/homepage/recent-records
 *
 * Temporary NSR stub response.
 * @see EXPECTED_RECENT_RECORDS_RESPONSE
 */
void EXPECTED_RECENT_RECORDS_RESPONSE;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!NSR_STUB_ENABLED) {
    return NextResponse.json(
      { statusText: 'Homepage recent-records backend is not configured', code: 501 },
      { status: 501 },
    );
  }

  return NextResponse.json(
    getNsrStubRecentRecords() satisfies ExpectedRecentRecordsResponse,
  );
}
