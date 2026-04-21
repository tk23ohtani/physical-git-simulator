import { useSimulator } from "../../state/use-simulator";
import type { ObjectId } from "../../core/types";
import { formatObjectId } from "../id-format";
import { calculateDAGLayout } from "../dag-layout";

const COLORS = {
  commit: "#F59E0B",
  branch: "#8B5CF6",
  head: "#EF4444",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#D6CCB8",
  panel: "#FBF7F0",
  canvas: "#F6F1E8",
  edge: "#9CA3AF",
} as const;

const PADDING_X = 48;
const PADDING_Y = 40;
const NODE_RADIUS = 16;

function edgeKey(from: ObjectId, to: ObjectId): string {
  return `${from}->${to}`;
}

export function CommitDAGView() {
  const { state, dispatch } = useSimulator();
  const layout = calculateDAGLayout(state.objectStore, state.refStore);
  const selectedObjectId = state.selectedObjectId;
  const nodeMap = new Map(layout.nodes.map((node) => [node.commitId, node]));

  if (layout.nodes.length === 0) {
    return (
      <div
        style={{
          minHeight: "100%",
          padding: 20,
          background: COLORS.canvas,
          color: COLORS.muted,
        }}
      >
        <div
          style={{
            maxWidth: 540,
            margin: "48px auto",
            padding: 24,
            border: `1px dashed ${COLORS.border}`,
            borderRadius: 18,
            background: "rgba(255,255,255,0.55)",
            textAlign: "center",
          }}
        >
          commit はまだありません。左ペインの操作から commit を追加すると、ここに履歴グラフを表示します。
        </div>
      </div>
    );
  }

  const width = Math.max(layout.width + PADDING_X * 2 + 180, 520);
  const height = Math.max(layout.height + PADDING_Y * 2, 240);

  return (
    <div
      style={{
        minHeight: "100%",
        padding: 20,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))," +
          "repeating-linear-gradient(0deg, rgba(120,94,54,0.05), rgba(120,94,54,0.05) 1px, transparent 1px, transparent 28px)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(255,255,255,0.6)",
          boxShadow: "0 10px 24px rgba(31,41,55,0.08)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.commit }}>Commit DAG</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>
            branch と HEAD の位置関係を commit 履歴として確認できます。
          </div>
        </div>

        <svg width={width} height={height} role="img" aria-label="Commit DAG">
          {layout.edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={edgeKey(edge.from, edge.to)}
                x1={from.x + PADDING_X}
                y1={from.y + PADDING_Y}
                x2={to.x + PADDING_X}
                y2={to.y + PADDING_Y}
                stroke={COLORS.edge}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}

          {layout.nodes.map((node) => {
            const isSelected = selectedObjectId === node.commitId;
            const x = node.x + PADDING_X;
            const y = node.y + PADDING_Y;
            return (
              <g
                key={node.commitId}
                transform={`translate(${x}, ${y})`}
                onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: node.commitId })}
                style={{ cursor: "pointer" }}
              >
                {isSelected && (
                  <circle
                    r={NODE_RADIUS + 6}
                    fill="none"
                    stroke={COLORS.head}
                    strokeWidth={3}
                  />
                )}
                <circle
                  r={NODE_RADIUS}
                  fill="#FFF1C9"
                  stroke={COLORS.commit}
                  strokeWidth={3}
                />
                <text
                  x={0}
                  y={5}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    fill: COLORS.text,
                    fontFamily: "monospace",
                  }}
                >
                  {formatObjectId(node.commitId)}
                </text>
                <text
                  x={30}
                  y={-4}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fill: COLORS.text,
                    fontFamily: "monospace",
                  }}
                >
                  {formatObjectId(node.commitId)}
                </text>
                {node.branchNames.map((name, index) => (
                  <g key={name} transform={`translate(30, ${12 + index * 20})`}>
                    <rect
                      x={0}
                      y={-11}
                      width={Math.max(36, name.length * 8 + 14)}
                      height={18}
                      rx={9}
                      fill={COLORS.branch}
                    />
                    <text
                      x={8}
                      y={2}
                      style={{ fontSize: 10, fontWeight: 700, fill: "#fff" }}
                    >
                      {name}
                    </text>
                  </g>
                ))}
                {node.isHead && (
                  <g transform="translate(-8, -34)">
                    <rect width={42} height={18} rx={9} fill={COLORS.head} />
                    <text x={9} y={12} style={{ fontSize: 10, fontWeight: 800, fill: "#fff" }}>
                      HEAD
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
