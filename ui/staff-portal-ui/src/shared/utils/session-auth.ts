/**
 * Client-side opaque session / access token storage (sessionStorage).
 * No cross-domain cookie dependency — works with local UI against remote IAM.
 */

export const SESSION_TOKEN_KEY = 'openg2p_session_token';
export const ACCESS_TOKEN_KEY = 'openg2p_access_token';
export const ID_TOKEN_KEY = 'openg2p_id_token';

export const SESSION_TOKEN_HEADER = 'X-Session-Token';
export const APP_MNEMONIC_HEADER = 'X-App-Mnemonic';

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function getSessionToken(): string | null {
    if (!canUseStorage()) return null;
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
    if (!canUseStorage()) return;
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
    if (!canUseStorage()) return null;
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
    if (!canUseStorage()) return;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getIdToken(): string | null {
    if (!canUseStorage()) return null;
    return sessionStorage.getItem(ID_TOKEN_KEY);
}

export function setIdToken(token: string): void {
    if (!canUseStorage()) return;
    sessionStorage.setItem(ID_TOKEN_KEY, token);
}

export function clearAuthTokens(): void {
    if (!canUseStorage()) return;
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);
}

/** Capture ``session_token`` from the OAuth redirect query and strip it from the URL. */
export function captureSessionTokenFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('session_token');
    if (!token) return null;
    setSessionToken(token);
    url.searchParams.delete('session_token');
    const cleaned = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', cleaned || '/');
    return token;
}

/** Headers for authenticated calls to Next.js API routes (proxy adds app mnemonic). */
export function authRequestHeaders(extra?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {
        ...(extra as Record<string, string> | undefined),
    };
    const accessToken = getAccessToken();
    const sessionToken = getSessionToken();
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    if (sessionToken) {
        headers[SESSION_TOKEN_HEADER] = sessionToken;
    }
    return headers;
}
