import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_PORTFOLIO_RESPONSE,
  type ExpectedPortfolioResponse,
} from '@/features/homepage/contracts';
import { getNsrStubPortfolio, NSR_STUB_ENABLED } from '@/features/homepage/nsrStub';
import { fetchLiveRegisterCounts } from '@/features/homepage/server/liveEnrichment';

/**
 * POST /api/homepage/portfolio
 *
 * Temporary NSR stub, enriched with live register counts when available.
 * @see EXPECTED_PORTFOLIO_RESPONSE
 */
void EXPECTED_PORTFOLIO_RESPONSE;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!NSR_STUB_ENABLED) {
    return NextResponse.json(
      { statusText: 'Homepage portfolio backend is not configured', code: 501 },
      { status: 501 },
    );
  }

  const liveCounts = await fetchLiveRegisterCounts(req);
  return NextResponse.json(
    getNsrStubPortfolio(liveCounts) satisfies ExpectedPortfolioResponse,
  );
}
