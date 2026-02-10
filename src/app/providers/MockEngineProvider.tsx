import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { MockEngine } from "../../mock";

interface MockEngineProviderProps {
  children: ReactNode;
  engine?: MockEngine;
}

const MockEngineContext = createContext<MockEngine | null>(null);

export function MockEngineProvider({ children, engine }: MockEngineProviderProps) {
  const value = useMemo(() => engine ?? new MockEngine(), [engine]);

  return <MockEngineContext.Provider value={value}>{children}</MockEngineContext.Provider>;
}

export const useMockEngine = (): MockEngine => {
  const context = useContext(MockEngineContext);
  if (!context) {
    throw new Error("useMockEngine must be used within MockEngineProvider");
  }
  return context;
};
