import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { getBackendConfig } from '@/app/api/_lib/backend-config';
import { createBackendRequest } from '@/app/api/_lib/backend-request';
import type { BackendResponse, RequestBody } from '@/app/api/_lib/backend-types';
import { requireAuth } from '@/app/api/_lib/requireAuth';

/**
 * Call an existing staff-api endpoint with the same envelope as proxyToBackend.
 * Returns unwrapped response_payload (or null on failure) — used by homepage
 * stubs to reuse live register/stats APIs when available.
 */
export async function callExistingBackend<T = unknown>(
  req: NextRequest,
  targetEndpoint: string,
  payload: RequestBody,
): Promise<T | null> {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return null;

  try {
    const backendConfig = getBackendConfig();
    const backendUrl = `${backendConfig.backendApiUrl}${targetEndpoint}`;

    const h = req.headers;
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    const origin = h.get('origin') || `${proto}://${host}`;

    const backendRequest = createBackendRequest(payload, origin);
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        ...auth.backendHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendRequest),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const backendResponse = (await response.json()) as BackendResponse<T>;
    if (backendResponse.response_header?.response_status === 'ERROR') {
      return null;
    }

    return (backendResponse.response_body?.response_payload ?? null) as T | null;
  } catch {
    return null;
  }
}
