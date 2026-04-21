import { useSimulator } from "../../state/use-simulator";
import type { Blob, Commit, ObjectId, Tree } from "../../core/types";
import { formatObjectId } from "../id-format";

// =============================================================================
// DAGGraphView - 中央ペインの盤面表示
// =============================================================================

const COLORS = {
  blob: "#3B82F6",
  tree: "#10B981",
  commit: "#F59E0B",
  branch: "#8B5CF6",
  head: "#EF4444",
  text: "#1F2937",
  bg: "#F6F1E8",
  panel: "#FBF7F0",
  border: "#D6CCB8",
  muted: "#6B7280",
} as const;

const boardStyle: React.CSSProperties = {
  minHeight: "100%",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))," +
    "repeating-linear-gradient(0deg, rgba(120,94,54,0.05), rgba(120,94,54,0.05) 1px, transparent 1px, transparent 28px)",
  padding: 20,
};

const columnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 260,
};

const noteBaseStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(31,41,55,0.08)",
  boxShadow: "0 10px 24px rgba(31,41,55,0.10), inset 0 1px 0 rgba(255,255,255,0.5)",
  padding: 14,
  color: COLORS.text,
};

function pinStyle(color: string): React.CSSProperties {
  return {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: color,
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    position: "absolute",
    top: 10,
    right: 12,
  };
}

function NoteShell({
  color,
  highlighted = false,
  children,
}: {
  color: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...noteBaseStyle,
        position: "relative",
        background: `linear-gradient(180deg, ${color}, rgba(255,255,255,0.45))`,
        outline: highlighted ? `3px solid ${COLORS.head}` : "none",
        outlineOffset: 2,
      }}
    >
      <div style={pinStyle("rgba(255,255,255,0.92)")} />
      {children}
    </div>
  );
}

function StickyHeader({
  title,
  subtitle,
  color,
}: {
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "10px 12px",
        boxShadow: "0 4px 10px rgba(31,41,55,0.06)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{title}</div>
      <div style={{ fontSize: 11, color: COLORS.muted }}>{subtitle}</div>
    </div>
  );
}

function ClickableNote({
  objectId,
  color,
  highlighted,
  children,
  onClick,
}: {
  objectId: ObjectId;
  color: string;
  highlighted?: boolean;
  children: React.ReactNode;
  onClick: (id: ObjectId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(objectId)}
      style={{
        appearance: "none",
        border: "none",
        background: "transparent",
        padding: 0,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
      }}
      aria-label={objectId}
    >
      <NoteShell color={color} highlighted={highlighted}>
        {children}
      </NoteShell>
    </button>
  );
}

function NoteTitle({
  label,
  objectId,
  accent,
}: {
  label: string;
  objectId: ObjectId;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: accent }}>
        {label}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800 }}>
        {formatObjectId(objectId)}
      </span>
    </div>
  );
}

function BlobNote({ blob, onClick, highlighted }: {
  blob: Blob;
  onClick: (id: ObjectId) => void;
  highlighted: boolean;
}) {
  return (
    <ClickableNote objectId={blob.id} color="#DCEEFF" highlighted={highlighted} onClick={onClick}>
      <NoteTitle label="BLOB" objectId={blob.id} accent={COLORS.blob} />
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>中身</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.06em" }}>{blob.content}</div>
    </ClickableNote>
  );
}

function TreeNote({
  tree,
  onClick,
  highlighted,
}: {
  tree: Tree;
  onClick: (id: ObjectId) => void;
  highlighted: boolean;
}) {
  return (
    <ClickableNote objectId={tree.id} color="#DDF7EA" highlighted={highlighted} onClick={onClick}>
      <NoteTitle label="TREE" objectId={tree.id} accent={COLORS.tree} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tree.entries.length === 0 ? (
          <div style={{ fontSize: 12, color: COLORS.muted }}>空の tree</div>
        ) : (
          tree.entries.map((entry) => (
            <div
              key={`${tree.id}-${entry.name}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 12,
                borderTop: "1px dashed rgba(31,41,55,0.12)",
                paddingTop: 6,
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{entry.name}</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                {formatObjectId(entry.objectId)}
              </span>
            </div>
          ))
        )}
      </div>
    </ClickableNote>
  );
}

function CommitNote({
  commit,
  onClick,
  highlighted,
  branchNames,
  isHead,
}: {
  commit: Commit;
  onClick: (id: ObjectId) => void;
  highlighted: boolean;
  branchNames: string[];
  isHead: boolean;
}) {
  return (
    <ClickableNote objectId={commit.id} color="#FFF1C9" highlighted={highlighted} onClick={onClick}>
      <NoteTitle label="COMMIT" objectId={commit.id} accent={COLORS.commit} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {isHead && (
          <span style={{ background: COLORS.head, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999 }}>
            HEAD
          </span>
        )}
        {branchNames.map((name) => (
          <span key={name} style={{ background: COLORS.branch, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>
            {name}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>tree</div>
          <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{formatObjectId(commit.treeId)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>parent</div>
          <div style={{ fontFamily: "monospace", fontWeight: 700 }}>
            {commit.parentIds.length === 0
              ? "-"
              : commit.parentIds.map((id) => formatObjectId(id)).join(", ")}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>msg</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{commit.message || "(no message)"}</div>
        </div>
      </div>
    </ClickableNote>
  );
}

function sortById<T extends { id: ObjectId }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMatch = a.id.match(/-(\d+)$/);
    const bMatch = b.id.match(/-(\d+)$/);
    if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
    return a.id.localeCompare(b.id);
  });
}

export function DAGGraphView() {
  const { state, dispatch } = useSimulator();
  const handleClick = (objectId: ObjectId) => {
    dispatch({ type: "SELECT_OBJECT", objectId });
  };
  const recentStep = state.stepHistory[state.stepHistory.length - 1] ?? null;
  const recentObjects = new Set(recentStep?.objectsCreated ?? []);
  const branches = state.refStore.getAllBranches();
  const head = state.refStore.getHead();
  const blobs = sortById(state.objectStore.getAllByType("blob") as Blob[]);
  const trees = sortById(state.objectStore.getAllByType("tree") as Tree[]);
  const commits = sortById(state.objectStore.getAllByType("commit") as Commit[]);
  const branchMap = new Map<ObjectId, string[]>();

  for (const [name, commitId] of branches) {
    const names = branchMap.get(commitId) ?? [];
    names.push(name);
    branchMap.set(commitId, names);
  }

  if (blobs.length === 0 && trees.length === 0 && commits.length === 0) {
    return (
      <div style={{ ...boardStyle, color: COLORS.muted }}>
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
          付箋はまだありません。左ペインの操作から Blob / Tree / Commit を追加すると、ここに盤面として並びます。
        </div>
      </div>
    );
  }

  return (
    <div style={boardStyle}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: "fit-content" }}>
        <div style={columnStyle}>
          <StickyHeader title="Blob 付箋" subtitle={`${blobs.length} 枚`} color={COLORS.blob} />
          {blobs.map((blob) => (
            <BlobNote
              key={blob.id}
              blob={blob}
              highlighted={recentObjects.has(blob.id)}
              onClick={handleClick}
            />
          ))}
        </div>
        <div style={columnStyle}>
          <StickyHeader title="Tree 付箋" subtitle={`${trees.length} 枚`} color={COLORS.tree} />
          {trees.map((tree) => (
            <TreeNote
              key={tree.id}
              tree={tree}
              highlighted={recentObjects.has(tree.id)}
              onClick={handleClick}
            />
          ))}
        </div>
        <div style={columnStyle}>
          <StickyHeader title="Commit 付箋" subtitle={`${commits.length} 枚`} color={COLORS.commit} />
          {commits.map((commit) => {
            const branchNames = branchMap.get(commit.id) ?? [];
            const isHead = head.type === "detached"
              ? head.commitId === commit.id
              : branches.get(head.name) === commit.id;
            return (
              <CommitNote
                key={commit.id}
                commit={commit}
                highlighted={recentObjects.has(commit.id)}
                onClick={handleClick}
                branchNames={branchNames}
                isHead={isHead}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
