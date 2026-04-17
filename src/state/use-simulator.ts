import { useContext } from "react";
import { SimulatorContext, type SimulatorContextValue } from "./simulator-context";

export function useSimulator(): SimulatorContextValue {
  const context = useContext(SimulatorContext);
  if (context === null) {
    throw new Error("useSimulator must be used within a SimulatorProvider");
  }
  return context;
}
