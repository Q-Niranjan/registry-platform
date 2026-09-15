import type { HomepageUserLayout } from '@openg2p/dashboard-widgets';

export const HOMEPAGE_LAYOUT_STORAGE_KEY = 'openg2p.homepage.userLayout.v1';

export function readLocalHomepageLayout(): HomepageUserLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomepageUserLayout;
    if (!parsed || parsed.version !== '1.0' || !Array.isArray(parsed.widgets)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalHomepageLayout(layout: HomepageUserLayout): void {
  window.localStorage.setItem(
    HOMEPAGE_LAYOUT_STORAGE_KEY,
    JSON.stringify({
      ...layout,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearLocalHomepageLayout(): void {
  window.localStorage.removeItem(HOMEPAGE_LAYOUT_STORAGE_KEY);
}

export async function fetchHomepageLayout(): Promise<HomepageUserLayout | null> {
  try {
    const res = await fetch('/api/homepage/layout', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.status === 204 || res.status === 404) return readLocalHomepageLayout();
    if (!res.ok) return readLocalHomepageLayout();
    const data = (await res.json()) as HomepageUserLayout | { layout?: null };
    if (!data || !('widgets' in data) || !Array.isArray((data as HomepageUserLayout).widgets)) {
      return readLocalHomepageLayout();
    }
    return data as HomepageUserLayout;
  } catch {
    return readLocalHomepageLayout();
  }
}

export async function saveHomepageLayout(
  layout: HomepageUserLayout,
): Promise<HomepageUserLayout> {
  writeLocalHomepageLayout(layout);

  try {
    const { withCsrfHeaders } = await import('@/shared/utils/csrf');
    const res = await fetch('/api/homepage/layout', {
      method: 'PUT',
      credentials: 'include',
      headers: withCsrfHeaders('PUT', { 'Content-Type': 'application/json' }),
      body: JSON.stringify(layout),
    });
    if (res.ok) {
      const data = (await res.json()) as HomepageUserLayout;
      if (data?.widgets) {
        writeLocalHomepageLayout(data);
        return data;
      }
    }
  } catch {
    // local persistence is enough until backend exists
  }

  return layout;
}

export async function resetHomepageLayout(): Promise<void> {
  clearLocalHomepageLayout();
  try {
    const { withCsrfHeaders } = await import('@/shared/utils/csrf');
    await fetch('/api/homepage/layout', {
      method: 'DELETE',
      credentials: 'include',
      headers: withCsrfHeaders('DELETE'),
    });
  } catch {
    // ignore
  }
}
