import { useState } from "react";
import { SimulatorProvider } from "./state/context";
import { useSimulator } from "./state/use-simulator";
import { CommandPanel } from "./ui/components/CommandPanel";
import { DAGGraphView } from "./ui/components/DAGGraphView";
import { CommitDAGView } from "./ui/components/CommitDAGView";
import { DetailPanel } from "./ui/components/DetailPanel";
import { ConflictResolver } from "./ui/components/ConflictResolver";
import "./App.css";

// =============================================================================
// Design colors
// =============================================================================

const COLORS = {
  blob: "#3B82F6",
  tree: "#10B981",
  commit: "#F59E0B",
  branch: "#8B5CF6",
  head: "#EF4444",
  bg: "#F9FAFB",
  border: "#E5E7EB",
  text: "#1F2937",
  muted: "#6B7280",
} as const;

type CenterViewMode = "board" | "dag";

// =============================================================================
// Header
// =============================================================================

function Header() {
  const { state, dispatch } = useSimulator();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 48,
        borderBottom: `1px solid ${COLORS.border}`,
        background: "#fff",
        flexShrink: 0,
      }}
    >
      {/* Title */}
      <h1 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: 0 }}>
        物理Gitシミュレータ
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Error / Notification */}
        {state.errorMessage && (
          <span
            role="alert"
            style={{
              fontSize: 12,
              color: COLORS.head,
              background: "#FEF2F2",
              padding: "2px 8px",
              borderRadius: 4,
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title={state.errorMessage}
            onClick={() => dispatch({ type: "DISMISS_MESSAGE" })}
          >
            ⚠ {state.errorMessage}
            <span style={{ fontSize: 10, opacity: 0.6 }}>✕</span>
          </span>
        )}
        {state.notification && !state.errorMessage && (
          <span
            role="status"
            style={{
              fontSize: 12,
              color: COLORS.tree,
              background: "#F0FDF4",
              padding: "2px 8px",
              borderRadius: 4,
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title={state.notification}
            onClick={() => dispatch({ type: "DISMISS_MESSAGE" })}
          >
            ℹ {state.notification}
            <span style={{ fontSize: 10, opacity: 0.6 }}>✕</span>
          </span>
        )}

      </div>
    </header>
  );
}

// =============================================================================
// Legend - オブジェクト種別の凡例
// =============================================================================

const LEGEND_ITEMS: { label: string; color: string; shape: string; category: string }[] = [
  { label: "Blob", color: COLORS.blob, shape: "■", category: "不変オブジェクト" },
  { label: "Tree", color: COLORS.tree, shape: "📁", category: "不変オブジェクト" },
  { label: "Commit", color: COLORS.commit, shape: "●", category: "不変オブジェクト" },
  { label: "Branch", color: COLORS.branch, shape: "🏷", category: "可変参照" },
  { label: "HEAD", color: COLORS.head, shape: "➤", category: "可変参照" },
];

function Legend() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "4px 16px",
        borderTop: `1px solid ${COLORS.border}`,
        background: "#fff",
        fontSize: 12,
        color: COLORS.muted,
        flexShrink: 0,
        height: 32,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 11 }}>凡例:</span>
      {LEGEND_ITEMS.map((item) => (
        <span
          key={item.label}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          title={`${item.label} (${item.category})`}
        >
          <span style={{ color: item.color, fontSize: 14 }}>{item.shape}</span>
          <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
          <span style={{ fontSize: 10, color: COLORS.muted }}>({item.category})</span>
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// MainLayout - 3-column layout
// =============================================================================

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: CenterViewMode;
  onChange: (mode: CenterViewMode) => void;
}) {
  const baseButtonStyle: React.CSSProperties = {
    appearance: "none",
    border: "none",
    background: "transparent",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "#fff",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 4px 10px rgba(31,41,55,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => onChange("board")}
        style={{
          ...baseButtonStyle,
          background: mode === "board" ? "#FDE68A" : "transparent",
          color: mode === "board" ? COLORS.text : COLORS.muted,
        }}
      >
        付箋
      </button>
      <button
        type="button"
        onClick={() => onChange("dag")}
        style={{
          ...baseButtonStyle,
          background: mode === "dag" ? "#FDE68A" : "transparent",
          color: mode === "dag" ? COLORS.text : COLORS.muted,
        }}
      >
        DAG
      </button>
    </div>
  );
}

function MainLayout() {
  const [centerViewMode, setCenterViewMode] = useState<CenterViewMode>("board");

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* Left: CommandPanel ~280px */}
      <div style={{ width: 280, flexShrink: 0, overflow: "hidden" }}>
        <CommandPanel />
      </div>

      {/* Center: board / DAG view */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          borderLeft: `1px solid ${COLORS.border}`,
          borderRight: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "rgba(249,250,251,0.92)",
            borderBottom: `1px solid ${COLORS.border}`,
            backdropFilter: "blur(10px)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
              中央ビュー
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>
              デフォルトは付箋表示。必要なときだけ DAG に切り替えられます。
            </div>
          </div>
          <ViewModeToggle mode={centerViewMode} onChange={setCenterViewMode} />
        </div>
        {centerViewMode === "board" ? <DAGGraphView /> : <CommitDAGView />}
      </div>

      {/* Right: DetailPanel ~300px */}
      <div style={{ width: 300, flexShrink: 0, overflow: "hidden" }}>
        <DetailPanel />
      </div>
    </div>
  );
}

// =============================================================================
// SimulatorApp - inner app wrapped by provider
// =============================================================================

function SimulatorApp() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Header />
      <MainLayout />
      <Legend />
      <ConflictResolver />
    </div>
  );
}

// =============================================================================
// App - top-level with SimulatorProvider
// =============================================================================

function App() {
  return (
    <SimulatorProvider>
      <SimulatorApp />
    </SimulatorProvider>
  );
}

export default App;
