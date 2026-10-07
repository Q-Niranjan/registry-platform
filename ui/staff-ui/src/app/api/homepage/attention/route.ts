import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_ATTENTION_RESPONSE,
  type ExpectedAttentionResponse,
} from '@/features/homepage/contracts';
import { getNsrStubAttention, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';

/**
 * POST /api/homepage/attention
 *
 * Temporary NSR stub response.
 * @see EXPECTED_ATTENTION_RESPONSE
 */
void EXPECTED_ATTENTION_RESPONSE;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!NSR_STUB_ENABLED) {
    return NextResponse.json(
      { statusText: 'Homepage attention backend is not configured', code: 501 },
      { status: 501 },
    );
  }

  return NextResponse.json(getNsrStubAttention() satisfies ExpectedAttentionResponse);
}
