import {
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type { SimulatorState } from "./types";
import { simulatorReducer, createInitialState } from "./reducer";
import {
  saveState,
  loadState,
} from "../core/persistence";
import { serializeState, deserializeState } from "./persistence-helpers";
import { SimulatorContext } from "./simulator-context";

function initializeState(): SimulatorState {
  const persisted = loadState();
  if (persisted) {
    try {
      return deserializeState(persisted);
    } catch {
      // 復元に失敗した場合はフレッシュな状態で開始
      return createInitialState();
    }
  }
  return createInitialState();
}

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simulatorReducer, null, initializeState);

  // Auto-save to localStorage on every state change
  useEffect(() => {
    saveState(serializeState(state));
  }, [state]);

  return (
    <SimulatorContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulatorContext.Provider>
  );
}
