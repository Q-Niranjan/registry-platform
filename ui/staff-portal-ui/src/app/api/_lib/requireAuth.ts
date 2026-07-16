import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

import { getBackendConfig } from './backend-config';

export const SESSION_TOKEN_HEADER = 'X-Session-Token';
export const APP_MNEMONIC_HEADER = 'X-App-Mnemonic';
export const ACCESS_TOKEN_COOKIE = 'X-Access-Token';
export const SESSION_TOKEN_COOKIE = 'X-Session-Token';
export const ID_TOKEN_COOKIE = 'X-ID-Token';

export interface AuthContext {
    accessToken: string;
    sessionToken: string;
    backendHeaders: Record<string, string>;
}

function bearerFromAuthorization(value: string | null): string | undefined {
    if (!value) return undefined;
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || undefined;
}

/** Host-only auth cookies set by this BFF (never stamped with a shared parent domain). */
export function applyAuthCookies(
    response: NextResponse,
    tokens: { accessToken: string; sessionToken: string; idToken?: string; maxAge?: number },
): void {
    const maxAge = tokens.maxAge ?? 60 * 30;
    const common = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge,
    };
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, common);
    response.cookies.set(SESSION_TOKEN_COOKIE, tokens.sessionToken, common);
    if (tokens.idToken) {
        response.cookies.set(ID_TOKEN_COOKIE, tokens.idToken, common);
    }
}

export function clearAuthCookies(response: NextResponse): void {
    for (const name of [ACCESS_TOKEN_COOKIE, SESSION_TOKEN_COOKIE, ID_TOKEN_COOKIE]) {
        response.cookies.set(name, '', { httpOnly: true, path: '/', maxAge: 0 });
    }
}

/** Build IAM-bound auth headers from access + session tokens. */
export function buildBackendAuthHeaders(
    accessToken: string,
    sessionToken: string,
): Record<string, string> {
    const backendConfig = getBackendConfig();
    return {
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        [SESSION_TOKEN_HEADER]: sessionToken,
        [APP_MNEMONIC_HEADER]: backendConfig.applicationMnemonic,
    };
}

function authFromTokens(
    accessToken: string | undefined,
    sessionToken: string | null | undefined,
): AuthContext | NextResponse {
    if (!accessToken && !sessionToken) {
        return NextResponse.json(
            {
                errors: [
                    {
                        code: 'G2P-AUT-LOGIN-REQUIRED',
                        message: 'Authentication required. No valid tokens found.',
                    },
                ],
            },
            { status: 401 },
        );
    }

    if (!accessToken) {
        return NextResponse.json(
            { errors: [{ code: 'G2P-AUT-401', message: 'Unauthorized' }] },
            { status: 401 },
        );
    }

    if (!sessionToken) {
        return NextResponse.json(
            {
                errors: [
                    {
                        code: 'G2P-AUT-LOGIN-REQUIRED',
                        message: 'Authentication required. Missing session token.',
                    },
                ],
            },
            { status: 401 },
        );
    }

    return {
        accessToken,
        sessionToken,
        backendHeaders: buildBackendAuthHeaders(accessToken, sessionToken),
    };
}

export function requireAuth(req: NextRequest): AuthContext | NextResponse {
    const accessToken =
        bearerFromAuthorization(req.headers.get('authorization')) ||
        req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const sessionToken =
        req.headers.get(SESSION_TOKEN_HEADER) ||
        req.cookies.get(SESSION_TOKEN_COOKIE)?.value;
    return authFromTokens(accessToken, sessionToken);
}

/**
 * Server-component helper: headers first, then host-only BFF cookies.
 */
export async function requireAuthFromHeaders(): Promise<AuthContext | null> {
    const headerStore = await headers();
    const cookieStore = await cookies();
    const accessToken =
        bearerFromAuthorization(headerStore.get('authorization')) ||
        cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const sessionToken =
        headerStore.get(SESSION_TOKEN_HEADER) ||
        cookieStore.get(SESSION_TOKEN_COOKIE)?.value;
    if (!accessToken || !sessionToken) {
        return null;
    }
    return {
        accessToken,
        sessionToken,
        backendHeaders: buildBackendAuthHeaders(accessToken, sessionToken),
    };
}

/** @deprecated Prefer requireAuthFromHeaders — cookie-domain forwarding has been removed. */
export const requireAuthFromCookies = requireAuthFromHeaders;
