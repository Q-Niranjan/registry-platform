import { NextRequest, NextResponse } from 'next/server';
import { getBackendConfig } from '../_lib/backend-config';

/**
 * GET /api/sso — Two-Tier SSO entry point.
 *
 * Redirects the browser to the IAM /auth/sso endpoint with the current
 * app mnemonic and a return redirect_uri.  IAM will:
 *   1. Reuse the global session cookie and silently mint a portal session_token, OR
 *   2. Start an OIDC flow with prompt=none (Keycloak skips login form if IdP session
 *      exists), OR
 *   3. Fall through to an interactive login when no IdP session exists.
 */
export async function GET(req: NextRequest) {
    const backendConfig = getBackendConfig();
    const returnTo = req.nextUrl.searchParams.get('redirect_uri') ||
        req.headers.get('referer') ||
        '/';

    const ssoUrl = new URL(`${backendConfig.iamUrl}/auth/sso`);
    ssoUrl.searchParams.set('app_mnemonic', backendConfig.applicationMnemonic);
    ssoUrl.searchParams.set('redirect_uri', returnTo);
    ssoUrl.searchParams.set('id', backendConfig.loginProviderId);

    return NextResponse.redirect(ssoUrl.toString());
}
