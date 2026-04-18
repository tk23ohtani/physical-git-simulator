import type { ReactElement } from "react";
import { useSimulator } from "../../state/context";

const COLORS = {
  bg: "#F8FAFC",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  sticky: ["#FEF3C7", "#DBEAFE", "#DCFCE7", "#FCE7F3", "#EDE9FE", "#FDE68A"] as const,
} as const;

function getActionColor(action: string): string {
  switch (action) {
    case "CREATE_BLOB":
      return "#3B82F6";
    case "CREATE_TREE":
      return "#10B981";
    case "CREATE_COMMIT":
    case "HIGH_LEVEL_COMMIT":
    case "FIX_COMMIT":
      return "#F59E0B";
    case "CREATE_BRANCH":
    case "MOVE_BRANCH":
      return "#8B5CF6";
    case "CHECKOUT_BRANCH":
    case "CHECKOUT_COMMIT":
      return "#EF4444";
    case "START_MERGE":
    case "RESOLVE_CONFLICT":
    case "COMPLETE_MERGE":
      return "#7C3AED";
    default:
      return COLORS.muted;
  }
}

export function StickyNotesView() {
  const { state } = useSimulator();
  const steps = state.stepHistory;
  const stepCount = steps.length;

  if (stepCount === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.muted,
          background: COLORS.bg,
          fontSize: 13,
          padding: 24,
          textAlign: "center",
        }}
      >
        まだ操作履歴がありません。左ペインで操作すると付箋がここに表示されます。
      </div>
    );
  }

  const noteCards: ReactElement[] = [];
  for (let stepIndex = stepCount - 1; stepIndex >= 0; stepIndex--) {
    const step = steps[stepIndex];
    const accent = getActionColor(step.action);
    const stickyColor = COLORS.sticky[stepIndex % COLORS.sticky.length];
    noteCards.push(
      <article
        key={`step-${stepIndex}`}
        style={{
          background: stickyColor,
          border: `1px solid ${COLORS.border}`,
          borderTop: `4px solid ${accent}`,
          borderRadius: 8,
          padding: 10,
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>
          Step {stepIndex + 1}
        </div>
        <div style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{step.action}</div>
        <div style={{ fontSize: 12, color: COLORS.text }}>{step.description}</div>
        {step.objectsCreated.length > 0 && (
          <div style={{ fontSize: 11, color: COLORS.muted }}>
            Created: {step.objectsCreated.join(", ")}
          </div>
        )}
        {step.refsUpdated.length > 0 && (
          <div style={{ fontSize: 11, color: COLORS.muted }}>
            Refs: {step.refsUpdated.join(", ")}
          </div>
        )}
      </article>,
    );
  }

  return (
    <div
      style={{
        padding: 16,
        background: COLORS.bg,
        minHeight: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
        alignContent: "start",
      }}
    >
      {noteCards}
    </div>
  );
}
