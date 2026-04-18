import { useSimulator } from "../../state/context";

const COLORS = {
  bg: "#F8FAFC",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  sticky: ["#FEF3C7", "#DBEAFE", "#DCFCE7", "#FCE7F3", "#EDE9FE", "#FDE68A"] as const,
} as const;

function getActionColor(action: string): string {
  if (action.includes("BLOB")) return "#3B82F6";
  if (action.includes("TREE")) return "#10B981";
  if (action.includes("COMMIT")) return "#F59E0B";
  if (action.includes("BRANCH")) return "#8B5CF6";
  if (action.includes("CHECKOUT")) return "#EF4444";
  if (action.includes("MERGE") || action.includes("CONFLICT")) return "#7C3AED";
  return COLORS.muted;
}

export function StickyNotesView() {
  const { state } = useSimulator();
  const notes = [...state.stepHistory].reverse();

  if (notes.length === 0) {
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
      {notes.map((step, index) => {
        const accent = getActionColor(step.action);
        const stickyColor = COLORS.sticky[index % COLORS.sticky.length];
        return (
          <article
            key={`${step.action}-${index}`}
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
              Step {notes.length - index}
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
          </article>
        );
      })}
    </div>
  );
}
