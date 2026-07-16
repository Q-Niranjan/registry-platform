import {
    ACCESS_TOKEN_KEY,
    ID_TOKEN_KEY,
    SESSION_TOKEN_HEADER,
    authRequestHeaders,
    clearAuthTokens,
    getAccessToken,
    getSessionToken,
    setAccessToken,
    setIdToken,
    setSessionToken,
} from './session-auth';

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange opaque session token for a fresh access token via the Next.js BFF.
 * Uses sessionStorage token when present; otherwise relies on host-only BFF cookies.
 */
export async function refreshAccessToken(): Promise<boolean> {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        try {
            const sessionToken = getSessionToken();
            const headers: Record<string, string> = {
                accept: 'application/json',
            };
            if (sessionToken) {
                headers[SESSION_TOKEN_HEADER] = sessionToken;
            }
            const res = await fetch('/api/auth/token', {
                method: 'POST',
                headers,
                cache: 'no-store',
            });
            if (!res.ok) {
                return false;
            }
            const data = await res.json();
            if (!data?.access_token) {
                return false;
            }
            setAccessToken(data.access_token);
            if (data.id_token) {
                setIdToken(data.id_token);
            }
            // Keep sessionStorage aligned when the BFF used a cookie-only session.
            if (sessionToken) {
                // already stored
            }
            return true;
        } catch {
            return false;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

export type AuthFetchOptions = RequestInit & {
    /** When false, skip the single 401 → refresh → retry cycle. Default true. */
    retryOnUnauthorized?: boolean;
};

/**
 * Authenticated fetch: injects Bearer + X-Session-Token, refreshes once on 401.
 */
export async function authFetch(
    input: RequestInfo | URL,
    options: AuthFetchOptions = {},
): Promise<Response> {
    const { retryOnUnauthorized = true, headers: initHeaders, ...rest } = options;
    const headers = authRequestHeaders(initHeaders);

    const res = await fetch(input, {
        ...rest,
        headers,
        cache: rest.cache ?? 'no-store',
    });

    if (res.status !== 401 || !retryOnUnauthorized) {
        return res;
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
        return res;
    }

    return fetch(input, {
        ...rest,
        headers: authRequestHeaders(initHeaders),
        cache: rest.cache ?? 'no-store',
    });
}

export async function bootstrapSessionFromToken(sessionToken: string): Promise<boolean> {
    setSessionToken(sessionToken);
    return refreshAccessToken();
}

export function hasStoredSession(): boolean {
    return Boolean(getSessionToken() && getAccessToken());
}

export { clearAuthTokens, getAccessToken, getSessionToken, ACCESS_TOKEN_KEY, ID_TOKEN_KEY };
