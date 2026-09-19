import { useState } from "react";
import { useSimulator } from "../../state/use-simulator";
import { formatObjectId } from "../id-format";

// =============================================================================
// RemotePanel - リモートリポジトリ操作パネル
// =============================================================================

const COLORS = {
  remote: "#0EA5E9",   // sky-500
  push: "#10B981",     // emerald-500
  force: "#EF4444",    // red-500
  fetch: "#8B5CF6",    // violet-500
  pull: "#F59E0B",     // amber-500
  branch: "#8B5CF6",
  head: "#EF4444",
  bg: "#F9FAFB",
  border: "#E5E7EB",
  text: "#1F2937",
  muted: "#6B7280",
} as const;

const sectionStyle: React.CSSProperties = {
  borderBottom: `1px solid ${COLORS.border}`,
  padding: "8px 12px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  userSelect: "none",
  fontWeight: 600,
  fontSize: 13,
  color: COLORS.text,
  padding: "4px 0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  fontSize: 12,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  boxSizing: "border-box",
  fontFamily: "monospace",
};

const btnStyle: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  color: "white",
  fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: COLORS.muted,
  marginBottom: 2,
  display: "block",
};

const fieldGap: React.CSSProperties = { marginTop: 6 };

// =============================================================================
// Collapsible Section wrapper
// =============================================================================

function Section({
  title,
  color,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={sectionStyle}>
      <div style={headerStyle} onClick={() => setOpen(!open)}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color, marginRight: 0 }}>●</span>
          {title}
          {badge && (
            <span style={{
              fontSize: 10,
              background: color,
              color: "white",
              borderRadius: 999,
              padding: "1px 6px",
              fontWeight: 700,
            }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{ fontSize: 10, color: COLORS.muted }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding: "6px 0" }}>{children}</div>}
    </div>
  );
}

// =============================================================================
// RemoteStatusView - リモートの状態一覧
// =============================================================================

function RemoteStatusView() {
  const { state } = useSimulator();
  const remoteNames = state.remoteStore.getRemoteNames();

  if (remoteNames.length === 0) {
    return (
      <div style={{ fontSize: 11, color: COLORS.muted, padding: "4px 0" }}>
        リモートがありません
      </div>
    );
  }

  return (
    <div>
      {remoteNames.map((remoteName) => {
        const branches = state.remoteStore.getAllRemoteBranches(remoteName);
        return (
          <div key={remoteName} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.remote, marginBottom: 4 }}>
              🌐 {remoteName}
            </div>
            {branches.size === 0 ? (
              <div style={{ fontSize: 11, color: COLORS.muted, paddingLeft: 12 }}>
                ブランチなし（まだ push されていません）
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {Array.from(branches.entries()).map(([branchName, commitId]) => {
                  const localCommitId = state.refStore.getBranch(branchName);
                  const isSynced = localCommitId === commitId;
                  const trackingId = state.refStore.getBranch(`${remoteName}/${branchName}`);
                  const isTrackingUpdated = trackingId === commitId;

                  return (
                    <div
                      key={branchName}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingLeft: 12,
                        paddingRight: 4,
                        paddingTop: 3,
                        paddingBottom: 3,
                        background: isSynced ? "#F0FDF4" : "#FFF7ED",
                        borderRadius: 4,
                        border: `1px solid ${isSynced ? "#BBF7D0" : "#FED7AA"}`,
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: COLORS.text }}>
                        {remoteName}/{branchName}
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.muted }}>
                        {formatObjectId(commitId)}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: isSynced ? "#16A34A" : "#EA580C",
                      }}>
                        {isSynced ? "✓ 同期済" : isTrackingUpdated ? "要 merge" : "fetch 未"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// PushPanel - push / push --force
// =============================================================================

function PushPanel() {
  const { state, dispatch } = useSimulator();
  const [remoteName, setRemoteName] = useState("origin");
  const [branchName, setBranchName] = useState("");

  const branches = state.refStore.getAllBranches();
  const localBranches = Array.from(branches.keys()).filter(
    (name) => !name.includes("/") // origin/xxx などのトラッキングブランチを除外
  );
  const remoteNames = state.remoteStore.getRemoteNames();

  const selectedCommitId = branchName ? state.refStore.getBranch(branchName) : undefined;
  const remoteCommitId = branchName ? state.remoteStore.getRemoteBranch(remoteName, branchName) : undefined;

  // push 可否の判定（UI 上の参考表示用）
  const canDetectNonFF =
    selectedCommitId !== undefined &&
    remoteCommitId !== undefined &&
    selectedCommitId !== remoteCommitId;

  const handlePush = () => {
    if (!branchName) return;
    dispatch({ type: "PUSH", remoteName, branchName });
  };

  const handleForcePush = () => {
    if (!branchName) return;
    dispatch({ type: "FORCE_PUSH", remoteName, branchName });
  };

  return (
    <Section title="push" color={COLORS.push} defaultOpen>
      <label style={labelStyle}>リモート</label>
      <select
        style={inputStyle}
        value={remoteName}
        onChange={(e) => setRemoteName(e.target.value)}
      >
        {remoteNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <div style={fieldGap}>
        <label style={labelStyle}>ローカルブランチ</label>
        <select
          style={inputStyle}
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
        >
          <option value="">-- Branch を選択 --</option>
          {localBranches.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* 状態プレビュー */}
      {branchName && (
        <div style={{
          marginTop: 8,
          padding: "6px 8px",
          background: "#F8FAFC",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          fontSize: 11,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ color: COLORS.muted }}>ローカル:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: COLORS.text }}>
              {selectedCommitId ? formatObjectId(selectedCommitId) : "(なし)"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: COLORS.muted }}>{remoteName}/{branchName}:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: remoteCommitId ? COLORS.text : COLORS.muted }}>
              {remoteCommitId ? formatObjectId(remoteCommitId) : "(未 push)"}
            </span>
          </div>
          {canDetectNonFF && (
            <div style={{
              marginTop: 4,
              padding: "3px 6px",
              background: "#FEF3C7",
              borderRadius: 3,
              color: "#92400E",
              fontWeight: 600,
              fontSize: 10,
            }}>
              ⚠ リモートとローカルが分岐しています。push が拒否される可能性があります。
            </div>
          )}
        </div>
      )}

      <div style={{ ...fieldGap, display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          style={{ ...btnStyle, background: COLORS.push }}
          onClick={handlePush}
          disabled={!branchName}
          title="通常の push（fast-forward のみ許可）"
        >
          push
        </button>
        <button
          style={{ ...btnStyle, background: COLORS.force }}
          onClick={handleForcePush}
          disabled={!branchName}
          title="push --force: リモートの履歴を強制上書き"
        >
          push --force ⚡
        </button>
      </div>

      {/* push --force の説明 */}
      <div style={{
        marginTop: 8,
        padding: "6px 8px",
        background: "#FEF2F2",
        border: `1px solid #FECACA`,
        borderRadius: 4,
        fontSize: 10,
        color: "#991B1B",
        lineHeight: 1.6,
      }}>
        <strong>push --force の危険性：</strong><br />
        リモートの履歴を強制的に書き換えます。他のメンバーがそのブランチを
        ベースに作業していた場合、そのコミットはリモートから「見えなくなり」、
        次回 pull したときに混乱が起きます。
      </div>
    </Section>
  );
}

// =============================================================================
// FetchPanel - fetch
// =============================================================================

function FetchPanel() {
  const { state, dispatch } = useSimulator();
  const [remoteName, setRemoteName] = useState("origin");

  const remoteNames = state.remoteStore.getRemoteNames();

  const handleFetch = () => {
    dispatch({ type: "FETCH", remoteName });
  };

  return (
    <Section title="fetch" color={COLORS.fetch}>
      <div style={{
        marginBottom: 8,
        padding: "6px 8px",
        background: "#F5F3FF",
        border: `1px solid #DDD6FE`,
        borderRadius: 4,
        fontSize: 11,
        color: "#5B21B6",
        lineHeight: 1.6,
      }}>
        リモートの最新情報をローカルに取り込みます。<br />
        ローカルブランチは変更せず、<code>origin/xxx</code> トラッキングブランチのみ更新します。
      </div>

      <label style={labelStyle}>リモート</label>
      <select
        style={inputStyle}
        value={remoteName}
        onChange={(e) => setRemoteName(e.target.value)}
      >
        {remoteNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <div style={{ ...fieldGap, textAlign: "right" }}>
        <button
          style={{ ...btnStyle, background: COLORS.fetch }}
          onClick={handleFetch}
        >
          fetch
        </button>
      </div>
    </Section>
  );
}

// =============================================================================
// PullPanel - pull（fetch + merge）
// =============================================================================

function PullPanel() {
  const { state, dispatch } = useSimulator();
  const [remoteName, setRemoteName] = useState("origin");
  const [branchName, setBranchName] = useState("");

  const remoteNames = state.remoteStore.getRemoteNames();
  const head = state.refStore.getHead();
  const localBranches = Array.from(state.refStore.getAllBranches().keys()).filter(
    (name) => !name.includes("/")
  );

  // デフォルト: HEAD が指しているブランチを選択
  const currentBranch = head.type === "branch" ? head.name : "";

  const handlePull = () => {
    const target = branchName || currentBranch;
    if (!target) return;
    dispatch({ type: "PULL", remoteName, branchName: target });
  };

  const effectiveBranch = branchName || currentBranch;

  return (
    <Section title="pull  (fetch + merge)" color={COLORS.pull}>
      <div style={{
        marginBottom: 8,
        padding: "6px 8px",
        background: "#FFFBEB",
        border: `1px solid #FDE68A`,
        borderRadius: 4,
        fontSize: 11,
        color: "#92400E",
        lineHeight: 1.6,
      }}>
        <code>fetch</code> + <code>merge</code> を一括実行します。<br />
        コンフリクトが発生した場合は Conflict 解決パネルで対応してください。
      </div>

      <label style={labelStyle}>リモート</label>
      <select
        style={inputStyle}
        value={remoteName}
        onChange={(e) => setRemoteName(e.target.value)}
      >
        {remoteNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <div style={fieldGap}>
        <label style={labelStyle}>
          ブランチ
          {currentBranch && !branchName && (
            <span style={{ color: COLORS.remote, marginLeft: 4 }}>(現在: {currentBranch})</span>
          )}
        </label>
        <select
          style={inputStyle}
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
        >
          <option value="">-- {currentBranch ? `現在のブランチ (${currentBranch})` : "Branch を選択"} --</option>
          {localBranches.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div style={{ ...fieldGap, textAlign: "right" }}>
        <button
          style={{ ...btnStyle, background: COLORS.pull, color: COLORS.text }}
          onClick={handlePull}
          disabled={!effectiveBranch}
        >
          pull
        </button>
      </div>
    </Section>
  );
}

// =============================================================================
// ForcePushScenarioGuide - push --force 事故のシナリオ説明
// =============================================================================

function ForcePushScenarioGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      margin: "8px 12px",
      border: `1px solid #FECACA`,
      borderRadius: 8,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "#FEF2F2",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#991B1B",
        }}
      >
        <span>💥 push --force 事故のシナリオ</span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          padding: "10px 12px",
          background: "#FFF",
          fontSize: 11,
          lineHeight: 1.8,
          color: COLORS.text,
        }}>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <strong>Alice</strong> が <code>main</code> に C1→C2→C3 とコミットして push した
            </li>
            <li>
              <strong>Bob</strong> が C3 を起点に C4 をコミット（まだ push していない）
            </li>
            <li>
              Alice が C2 に戻って別の修正 C2' を作り
              <strong style={{ color: COLORS.force }}> push --force</strong> した
            </li>
            <li>
              リモートの履歴が <code>C1→C2'</code> に書き換わり、<strong>C3 が消える</strong>
            </li>
            <li>
              Bob が <code>pull</code> すると、C4 の親 C3 がリモートに存在せず
              <strong style={{ color: COLORS.force }}> 歴史が分岐・コンフリクト地獄</strong>に
            </li>
          </ol>
          <div style={{
            marginTop: 8,
            padding: "6px 8px",
            background: "#FEF2F2",
            borderRadius: 4,
            color: "#7F1D1D",
            fontWeight: 600,
          }}>
            実際に試してみよう：<br />
            ① main に数回コミット → push<br />
            ② 過去のコミットにブランチを作って別コミット → push --force<br />
            ③ 元の main を fetch → 何が起きるか観察する
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RemotePanel - メインエクスポート
// =============================================================================

export function RemotePanel() {

  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflowY: "auto",
      background: COLORS.bg,
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* リモート状態サマリー */}
      <div style={{
        padding: "8px 12px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: "#EFF6FF",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.remote, marginBottom: 4 }}>
          🌐 リモートリポジトリ状態
        </div>
        <RemoteStatusView />
      </div>

      <ForcePushScenarioGuide />

      <PushPanel />
      <FetchPanel />
      <PullPanel />
    </div>
  );
}
