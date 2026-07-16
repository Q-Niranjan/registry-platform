import { NextRequest, NextResponse } from 'next/server';

import { getBackendConfig } from '@/app/api/_lib/backend-config';
import {
    APP_MNEMONIC_HEADER,
    SESSION_TOKEN_HEADER,
    clearAuthCookies,
    requireAuth,
} from '@/app/api/_lib/requireAuth';

export async function POST(req: NextRequest) {
    const auth = requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const backendConfig = getBackendConfig();
    const iamUrl = `${backendConfig.iamUrl}/auth/logout`;

    await fetch(iamUrl, {
        method: 'POST',
        headers: {
            ...auth.backendHeaders,
            accept: 'application/json',
            'Content-Type': 'application/json',
            [SESSION_TOKEN_HEADER]: auth.sessionToken,
            [APP_MNEMONIC_HEADER]: backendConfig.applicationMnemonic,
        },
        body: '{}',
        cache: 'no-store',
    }).catch(() => {/* best-effort */});

    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    return response;
}

export async function GET(req: NextRequest) {
    const backendConfig = getBackendConfig();
    const redirectUri = req.nextUrl.searchParams.get('redirect_uri') || '/';
    const iamLogout = new URL(`${backendConfig.iamUrl}/auth/logout`);
    if (redirectUri) {
        iamLogout.searchParams.set('redirect_uri', redirectUri);
    }
    const response = NextResponse.redirect(iamLogout.toString());
    clearAuthCookies(response);
    return response;
}
