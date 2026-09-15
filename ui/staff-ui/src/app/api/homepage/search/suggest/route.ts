import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/requireAuth';
import {
  EXPECTED_SEARCH_SUGGEST_RESPONSE,
  type ExpectedSearchSuggestResponse,
} from '@/features/homepage/contracts';
import {
  getNsrStubSearchSuggest,
  NSR_STUB_ENABLED,
} from '@/features/homepage/nsrStub';
import { searchRegisterSuggestions } from '@/features/homepage/server/liveEnrichment';

/**
 * POST /api/homepage/search/suggest
 *
 * Prefers live `/register-data/search_in_a_register` via existing staff-api.
 * Falls back to NSR stub suggestions when search is unavailable.
 *
 * @see EXPECTED_SEARCH_SUGGEST_RESPONSE
 */
void EXPECTED_SEARCH_SUGGEST_RESPONSE;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: {
    query?: string;
    mode?: string;
    register?: string;
    limit?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const query = body.query ?? '';

  const live = await searchRegisterSuggestions(req, {
    query,
    registerMnemonic: body.register,
    limit: body.limit ?? 8,
  });

  if (live !== null) {
    return NextResponse.json({
      suggestions: live,
    } satisfies ExpectedSearchSuggestResponse);
  }

  if (!NSR_STUB_ENABLED) {
    return NextResponse.json(
      { statusText: 'Homepage search suggest backend is not configured', code: 501 },
      { status: 501 },
    );
  }

  const stub = getNsrStubSearchSuggest(query);
  if (body.register && body.register !== 'all') {
    return NextResponse.json({
      suggestions: stub.suggestions.filter((s) => s.register === body.register),
    } satisfies ExpectedSearchSuggestResponse);
  }

  return NextResponse.json(stub);
}
