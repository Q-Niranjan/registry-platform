'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ScreenContextState } from './types';

type ScreenContextValue = {
  context: ScreenContextState;
  asOf: string;
  setRegister: (id: string) => void;
  setGeography: (id: string) => void;
  setTimeWindow: (id: string) => void;
  setComparison: (id: string) => void;
  refresh: () => void;
};

const ScreenCtx = createContext<ScreenContextValue | null>(null);

export function ScreenContextProvider({
  initialContext,
  asOf,
  children,
}: {
  initialContext: ScreenContextState;
  asOf: string;
  children: ReactNode;
}) {
  const [context, setContext] = useState(initialContext);
  const [asOfStamp, setAsOfStamp] = useState(asOf);

  const setRegister = useCallback((id: string) => {
    setContext((prev) => ({ ...prev, register: id }));
  }, []);

  const setGeography = useCallback((id: string) => {
    setContext((prev) => {
      const match = prev.geographies.find((g) => g.id === id);
      return {
        ...prev,
        geography: id,
        geographyLabel: match?.label || id,
      };
    });
  }, []);

  const setTimeWindow = useCallback((id: string) => {
    setContext((prev) => {
      const match = prev.timeWindows.find((w) => w.id === id);
      return {
        ...prev,
        timeWindow: id,
        timeWindowLabel: match?.label || id,
      };
    });
  }, []);

  const setComparison = useCallback((id: string) => {
    setContext((prev) => {
      const match = prev.comparisons?.find((c) => c.id === id);
      return {
        ...prev,
        comparison: id,
        comparisonLabel: match?.label || id,
      };
    });
  }, []);

  const refresh = useCallback(() => {
    setAsOfStamp(new Date().toISOString());
  }, []);

  const value = useMemo(
    () => ({
      context,
      asOf: asOfStamp,
      setRegister,
      setGeography,
      setTimeWindow,
      setComparison,
      refresh,
    }),
    [context, asOfStamp, setRegister, setGeography, setTimeWindow, setComparison, refresh],
  );

  return <ScreenCtx.Provider value={value}>{children}</ScreenCtx.Provider>;
}

export function useScreenContext() {
  const ctx = useContext(ScreenCtx);
  if (!ctx) {
    throw new Error('useScreenContext must be used inside ScreenContextProvider');
  }
  return ctx;
}
