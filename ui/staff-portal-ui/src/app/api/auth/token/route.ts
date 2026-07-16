import { NextRequest, NextResponse } from 'next/server';

    import { getBackendConfig } from '@/app/api/_lib/backend-config';
    import {
        APP_MNEMONIC_HEADER,
        SESSION_TOKEN_COOKIE,
        SESSION_TOKEN_HEADER,
        applyAuthCookies,
    } from '@/app/api/_lib/requireAuth';

/**
 * BFF proxy for IAM ``POST /auth/token`` — exchanges opaque session token for access token.
 * Sets host-only cookies so server components can authenticate without a shared cookie domain.
 */
export async function POST(req: NextRequest) {
    const sessionToken =
        req.headers.get(SESSION_TOKEN_HEADER) ||
        req.cookies.get(SESSION_TOKEN_COOKIE)?.value;
    if (!sessionToken) {
        return NextResponse.json(
            { errors: [{ code: 'G2P-AUT-401', message: 'Missing session token.' }] },
            { status: 401 },
        );
    }

    const backendConfig = getBackendConfig();
    const iamUrl = `${backendConfig.iamUrl}/auth/token`;

    const res = await fetch(iamUrl, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            [SESSION_TOKEN_HEADER]: sessionToken,
            [APP_MNEMONIC_HEADER]: backendConfig.applicationMnemonic,
        },
        cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
    }

    const response = NextResponse.json(data, { status: res.status });
    if (data.access_token) {
        applyAuthCookies(response, {
            accessToken: data.access_token,
            sessionToken,
            idToken: data.id_token,
            maxAge: typeof data.expires_in === 'number' ? data.expires_in : 60 * 30,
        });
    }
    return response;
}
