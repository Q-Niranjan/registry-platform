'use client';

import type { DashboardWidgetProps } from '../types';

export function IdentityWidget({ widget }: DashboardWidgetProps) {
  const identity = (widget.config?.identity || {}) as {
    name?: string;
    type?: string;
    authority?: string;
    jurisdiction?: string;
    sealInitials?: string;
    environment?: string;
    tagline?: string;
  };

  const hasContent = Boolean(
    identity.name ||
      identity.type ||
      identity.authority ||
      identity.jurisdiction ||
      identity.sealInitials ||
      identity.tagline,
  );

  // Empty identity config must not reserve layout space (no default "G2P" chrome).
  if (!hasContent) return null;

  return (
    <header className="og2p-dash-chrome">
      <div className="og2p-dash-seal" aria-hidden>
        {identity.sealInitials || 'G2P'}
      </div>
      <div className="og2p-dash-chrome-brand">
        <h1 className="og2p-dash-chrome-registry">{identity.name}</h1>
        <div className="og2p-dash-chrome-meta">
          {[identity.type, identity.authority, identity.jurisdiction]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {identity.tagline ? (
          <div className="og2p-dash-chrome-meta">{identity.tagline}</div>
        ) : null}
      </div>
      {identity.environment && identity.environment !== 'production' ? (
        <span className={`og2p-dash-env ${identity.environment}`}>
          {identity.environment}
        </span>
      ) : null}
    </header>
  );
}
