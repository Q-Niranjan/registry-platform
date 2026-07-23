import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Build a `toStorePath` resolver without React – usable in pure utility functions.
 * Returns undefined when sectionRegisterId is absent (no-op mode).
 * Always scopes relative paths as `<sectionRegisterId>.<path>`.
 */
export function buildScopeResolver(
  sectionRegisterId: string | undefined,
): ((relative: string) => string) | undefined {
  if (!sectionRegisterId) return undefined;
  return (relative: string) => {
    if (!relative) return relative;
    return `${sectionRegisterId}.${relative}`;
  };
}

export type DataPath = string | Record<string, string>;

export interface SectionScope {
  sectionRegisterId: string;
  /**
   * Convert a schema-relative field path to its absolute store key.
   *   "prefix"            → "<sectionRegisterId>.prefix"
   *   "documents.photo"   → "<sectionRegisterId>.documents.photo"
   */
  toStorePath: (relative: string) => string;
  /**
   * Resolve a widget-data-path (string or object map) from schema-relative
   * to absolute store paths.
   */
  resolveDataPath: (path: DataPath | undefined) => DataPath | undefined;
}

const SectionScopeContext = createContext<SectionScope | null>(null);

export const useSectionScope = (): SectionScope | null =>
  useContext(SectionScopeContext);

export interface SectionScopeProviderProps {
  sectionRegisterId: string;
  children: ReactNode;
}

export const SectionScopeProvider = ({
  sectionRegisterId,
  children,
}: SectionScopeProviderProps) => {
  const scope = useMemo<SectionScope>(() => {
    const toStorePath = (relative: string): string => {
      if (!relative) return relative;
      return `${sectionRegisterId}.${relative}`;
    };

    const resolveDataPath = (path: DataPath | undefined): DataPath | undefined => {
      if (!path) return path;
      if (typeof path === 'string') return toStorePath(path);
      const resolved: Record<string, string> = {};
      for (const [key, val] of Object.entries(path)) {
        resolved[key] = toStorePath(val);
      }
      return resolved;
    };

    return { sectionRegisterId, toStorePath, resolveDataPath };
  }, [sectionRegisterId]);

  return (
    <SectionScopeContext.Provider value={scope}>
      {children}
    </SectionScopeContext.Provider>
  );
};
