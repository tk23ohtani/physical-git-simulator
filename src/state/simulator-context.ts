import { createContext } from "react";
import type { SimulatorState, SimulatorAction } from "./types";

export interface SimulatorContextValue {
  state: SimulatorState;
  dispatch: React.Dispatch<SimulatorAction>;
}

export const SimulatorContext = createContext<SimulatorContextValue | null>(null);
