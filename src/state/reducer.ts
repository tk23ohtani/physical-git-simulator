import type { ObjectId, TreeEntry, ConflictEntry } from "../core/types";
import type {
  SimulatorState,
  SimulatorAction,
  StepRecord,
} from "./types";
import { ObjectStore } from "../core/object-store";
import { RefStore } from "../core/ref-store";
import { RemoteStore } from "../core/remote-store";
import { IDGenerator } from "../core/id-generator";
import { MergeEngine } from "../core/merge-engine";

/**
 * 初期状態を生成する
 */
export function createInitialState(): SimulatorState {
  const idGenerator = new IDGenerator();
  const objectStore = new ObjectStore(idGenerator);
  const refStore = new RefStore(objectStore);
  const remoteStore = new RemoteStore(objectStore);
  remoteStore.addRemote("origin");
  return {
    objectStore,
    refStore,
    remoteStore,
    idMode: idGenerator.getMode(),
    selectedObjectId: null,
    mergeState: null,
    stepHistory: [],
    errorMessage: null,
    notification: null,
  };
}

/**
 * 状態のシャローコピーを作成する（React が変更を検知できるよう新しいオブジェクト参照を返す）
 * ObjectStore / RefStore はミュータブルクラスなので同一インスタンスを再利用する。
 */
function cloneState(state: SimulatorState): SimulatorState {
  const objectStore = state.objectStore.clone();
  const refStore = state.refStore.clone(objectStore);
  const remoteStore = state.remoteStore.clone(objectStore);
  return {
    ...state,
    objectStore,
    refStore,
    remoteStore,
    errorMessage: null,
    notification: null,
  };
}

/**
 * simulatorReducer - 全14アクションを処理する純粋関数
 */
export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction
): SimulatorState {
  const next = cloneState(state);

  try {
    switch (action.type) {
      case "CREATE_BLOB":
        return handleCreateBlob(next, action.content);

      case "CREATE_TREE":
        return handleCreateTree(next, action.entries);

      case "CREATE_COMMIT":
        return handleCreateCommit(
          next,
          action.treeId,
          action.parentIds,
          action.message
        );

      case "HIGH_LEVEL_COMMIT":
        return handleHighLevelCommit(next, action.files, action.message);

      case "CREATE_BRANCH":
        return handleCreateBranch(next, action.name, action.commitId);

      case "MOVE_BRANCH":
        return handleMoveBranch(next, action.name, action.commitId);

      case "CHECKOUT_BRANCH":
        return handleCheckoutBranch(next, action.name);

      case "CHECKOUT_COMMIT":
        return handleCheckoutCommit(next, action.commitId);

      case "START_MERGE":
        return handleStartMerge(next, action.sourceBranch);

      case "RESOLVE_CONFLICT":
        return handleResolveConflict(next, action.path, action.choice);

      case "COMPLETE_MERGE":
        return handleCompleteMerge(next, action.message);

      case "FIX_COMMIT":
        return handleFixCommit(next, action.files, action.message);

      case "SET_ID_MODE":
        return handleSetIdMode(next, action.mode);

      case "SELECT_OBJECT":
        return handleSelectObject(next, action.objectId);

      case "DISMISS_MESSAGE":
        return { ...state, errorMessage: null, notification: null };

      case "PUSH":
        return handlePush(next, action.remoteName, action.branchName, false);

      case "FORCE_PUSH":
        return handlePush(next, action.remoteName, action.branchName, true);

      case "FETCH":
        return handleFetch(next, action.remoteName);

      case "PULL":
        return handlePull(next, action.remoteName, action.branchName);

      default:
        return next;
    }
  } catch (error: unknown) {
    let message: string;
    if (error instanceof TypeError) {
      // Object.freeze による不変オブジェクト変更試行時のエラー
      message = "不変オブジェクトのため変更できません。Blob・Tree・Commitは作成後に変更不可です。";
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = "不明なエラーが発生しました";
    }
    return { ...state, errorMessage: message, notification: null };
  }
}


// =============================================================================
// Action Handlers
// =============================================================================

function addStep(state: SimulatorState, step: StepRecord): void {
  state.stepHistory = [...state.stepHistory, step];
}

function handleCreateBlob(
  state: SimulatorState,
  content: string
): SimulatorState {
  const { blob, existing } = state.objectStore.addBlob(content);

  if (existing) {
    state.notification = `同一内容のBlobが既に存在します: ${blob.id}`;
  }

  addStep(state, {
    action: "CREATE_BLOB",
    description: `Blob "${blob.id}" を作成 (content: "${content.slice(0, 30)}${content.length > 30 ? "..." : ""}")`,
    objectsCreated: existing ? [] : [blob.id],
    refsUpdated: [],
  });

  return state;
}

function handleCreateTree(
  state: SimulatorState,
  entries: TreeEntry[]
): SimulatorState {
  const tree = state.objectStore.addTree(entries);

  addStep(state, {
    action: "CREATE_TREE",
    description: `Tree "${tree.id}" を作成 (${entries.length} entries)`,
    objectsCreated: [tree.id],
    refsUpdated: [],
  });

  return state;
}

function handleCreateCommit(
  state: SimulatorState,
  treeId: ObjectId,
  parentIds: ObjectId[],
  message: string
): SimulatorState {
  const commit = state.objectStore.addCommit(treeId, parentIds, message);
  state.refStore.advanceHead(commit.id);

  addStep(state, {
    action: "CREATE_COMMIT",
    description: `Commit "${commit.id}" を作成: ${message}`,
    objectsCreated: [commit.id],
    refsUpdated: [getHeadLabel(state)],
  });

  return state;
}

function handleHighLevelCommit(
  state: SimulatorState,
  files: { name: string; content: string }[],
  message: string
): SimulatorState {
  const objectsCreated: ObjectId[] = [];
  const steps: StepRecord[] = [];

  // Step 1: Create Blobs for each file
  const treeEntries: TreeEntry[] = [];
  for (const file of files) {
    const { blob, existing } = state.objectStore.addBlob(file.content);
    if (!existing) {
      objectsCreated.push(blob.id);
    }
    treeEntries.push({ name: file.name, objectId: blob.id });

    steps.push({
      action: "CREATE_BLOB",
      description: `Blob "${blob.id}" を作成 (file: ${file.name})${existing ? " [既存]" : ""}`,
      objectsCreated: existing ? [] : [blob.id],
      refsUpdated: [],
    });
  }

  // Step 2: Create Tree
  const tree = state.objectStore.addTree(treeEntries);
  objectsCreated.push(tree.id);

  steps.push({
    action: "CREATE_TREE",
    description: `Tree "${tree.id}" を作成 (${treeEntries.length} entries)`,
    objectsCreated: [tree.id],
    refsUpdated: [],
  });

  // Step 3: Create Commit with current HEAD as parent
  const parentIds = resolveCurrentCommitId(state);
  const commit = state.objectStore.addCommit(
    tree.id,
    parentIds ? [parentIds] : [],
    message
  );
  objectsCreated.push(commit.id);
  state.refStore.advanceHead(commit.id);

  const headLabel = getHeadLabel(state);
  steps.push({
    action: "CREATE_COMMIT",
    description: `Commit "${commit.id}" を作成: ${message}`,
    objectsCreated: [commit.id],
    refsUpdated: [headLabel],
  });

  // Record all steps
  state.stepHistory = [...state.stepHistory, ...steps];

  return state;
}

function handleCreateBranch(
  state: SimulatorState,
  name: string,
  commitId: ObjectId
): SimulatorState {
  state.refStore.createBranch(name, commitId);

  addStep(state, {
    action: "CREATE_BRANCH",
    description: `Branch "${name}" を作成 → ${commitId}`,
    objectsCreated: [],
    refsUpdated: [name],
  });

  return state;
}

function handleMoveBranch(
  state: SimulatorState,
  name: string,
  commitId: ObjectId
): SimulatorState {
  state.refStore.moveBranch(name, commitId);

  addStep(state, {
    action: "MOVE_BRANCH",
    description: `Branch "${name}" を ${commitId} に移動`,
    objectsCreated: [],
    refsUpdated: [name],
  });

  return state;
}

function handleCheckoutBranch(
  state: SimulatorState,
  name: string
): SimulatorState {
  state.refStore.checkoutBranch(name);

  addStep(state, {
    action: "CHECKOUT_BRANCH",
    description: `Branch "${name}" にチェックアウト`,
    objectsCreated: [],
    refsUpdated: ["HEAD"],
  });

  return state;
}

function handleCheckoutCommit(
  state: SimulatorState,
  commitId: ObjectId
): SimulatorState {
  state.refStore.checkoutCommit(commitId);
  state.notification = `Detached HEAD 状態: ${commitId}`;

  addStep(state, {
    action: "CHECKOUT_COMMIT",
    description: `Commit "${commitId}" にチェックアウト (Detached HEAD)`,
    objectsCreated: [],
    refsUpdated: ["HEAD"],
  });

  return state;
}


function handleStartMerge(
  state: SimulatorState,
  sourceBranch: string
): SimulatorState {
  const head = state.refStore.getHead();
  if (head.type !== "branch") {
    throw new Error("Detached HEAD 状態ではMergeを開始できません");
  }
  const targetBranch = head.name;

  const mergeEngine = new MergeEngine(state.objectStore, state.refStore);
  const result = mergeEngine.merge(sourceBranch, targetBranch);

  switch (result.type) {
    case "fast-forward": {
      addStep(state, {
        action: "START_MERGE",
        description: `Fast-Forward Merge: "${sourceBranch}" → "${targetBranch}"`,
        objectsCreated: [],
        refsUpdated: [targetBranch],
      });
      return state;
    }
    case "normal": {
      const mergeCommit = result as { type: "normal"; mergeCommit: { id: ObjectId } };
      addStep(state, {
        action: "START_MERGE",
        description: `Normal Merge: "${sourceBranch}" → "${targetBranch}" (Commit: ${mergeCommit.mergeCommit.id})`,
        objectsCreated: [mergeCommit.mergeCommit.id],
        refsUpdated: [targetBranch],
      });
      return state;
    }
    case "conflict": {
      const conflictResult = result as { type: "conflict"; conflicts: ConflictEntry[] };
      state.mergeState = {
        sourceBranch,
        targetBranch,
        conflicts: conflictResult.conflicts,
        resolved: new Map(),
      };
      addStep(state, {
        action: "START_MERGE",
        description: `Conflict検出: "${sourceBranch}" → "${targetBranch}" (${conflictResult.conflicts.length} conflicts)`,
        objectsCreated: [],
        refsUpdated: [],
      });
      return state;
    }
    default:
      return state;
  }
}

function handleResolveConflict(
  state: SimulatorState,
  path: string,
  choice: import("../core/types").ResolveChoice
): SimulatorState {
  if (!state.mergeState) {
    throw new Error("Merge進行中ではありません");
  }

  const conflict = state.mergeState.conflicts.find((c) => c.path === path);
  if (!conflict) {
    throw new Error(`Conflictが見つかりません: ${path}`);
  }

  const mergeEngine = new MergeEngine(state.objectStore, state.refStore);
  const resolvedContent = mergeEngine.resolveConflict(conflict, choice);

  const newResolved = new Map(state.mergeState.resolved);
  newResolved.set(path, resolvedContent);
  state.mergeState = { ...state.mergeState, resolved: newResolved };

  addStep(state, {
    action: "RESOLVE_CONFLICT",
    description: `Conflict解決: "${path}" → ${typeof choice === "string" ? choice : "manual"}`,
    objectsCreated: [],
    refsUpdated: [],
  });

  return state;
}

function handleCompleteMerge(
  state: SimulatorState,
  message: string
): SimulatorState {
  if (!state.mergeState) {
    throw new Error("Merge進行中ではありません");
  }

  const { sourceBranch, targetBranch, conflicts, resolved } = state.mergeState;

  // Verify all conflicts are resolved
  for (const conflict of conflicts) {
    if (!resolved.has(conflict.path)) {
      throw new Error(`未解決のConflictがあります: ${conflict.path}`);
    }
  }

  // Build tree entries from resolved content
  const treeEntries: TreeEntry[] = [];
  const objectsCreated: ObjectId[] = [];

  for (const [name, content] of resolved) {
    const { blob, existing } = state.objectStore.addBlob(content);
    if (!existing) {
      objectsCreated.push(blob.id);
    }
    treeEntries.push({ name, objectId: blob.id });
  }

  treeEntries.sort((a, b) => a.name.localeCompare(b.name));

  const tree = state.objectStore.addTree(treeEntries);
  objectsCreated.push(tree.id);

  const sourceCommitId = state.refStore.getBranch(sourceBranch);
  const targetCommitId = state.refStore.getBranch(targetBranch);

  if (!sourceCommitId || !targetCommitId) {
    throw new Error("Merge元またはMerge先のBranchが見つかりません");
  }

  const mergeCommit = state.objectStore.addCommit(
    tree.id,
    [targetCommitId, sourceCommitId],
    message
  );
  objectsCreated.push(mergeCommit.id);

  state.refStore.advanceHead(mergeCommit.id);
  state.mergeState = null;

  addStep(state, {
    action: "COMPLETE_MERGE",
    description: `Merge完了: "${sourceBranch}" → "${targetBranch}" (Commit: ${mergeCommit.id})`,
    objectsCreated,
    refsUpdated: [targetBranch],
  });

  return state;
}

function handleFixCommit(
  state: SimulatorState,
  files: { name: string; content: string }[],
  message: string
): SimulatorState {
  // FIX_COMMIT works like HIGH_LEVEL_COMMIT — creates a new commit on top of HEAD
  // The key difference is semantic: it represents a fix for a previous change
  return handleHighLevelCommit(state, files, `[fix] ${message}`);
}

function handleSetIdMode(
  state: SimulatorState,
  mode: import("../core/types").IdMode
): SimulatorState {
  state.objectStore.getIdGenerator().setMode(mode);
  state.idMode = mode;

  addStep(state, {
    action: "SET_ID_MODE",
    description: `IDモードを "${mode}" に変更`,
    objectsCreated: [],
    refsUpdated: [],
  });

  return state;
}

function handleSelectObject(
  state: SimulatorState,
  objectId: ObjectId | null
): SimulatorState {
  state.selectedObjectId = objectId;
  // SELECT_OBJECT does not add a step record (UI-only action)
  return state;
}

// =============================================================================
// Remote Action Handlers
// =============================================================================

/**
 * handlePush / handleForcePush
 *
 * push (force=false):
 *   - ローカルブランチの先端がリモート先端の子孫なら fast-forward push OK
 *   - 非 fast-forward なら rejected → エラーメッセージ表示
 *
 * push --force (force=true):
 *   - チェックなしで強制上書き
 *   - 上書き前後のコミット ID を通知で表示
 */
function handlePush(
  state: SimulatorState,
  remoteName: string,
  branchName: string,
  force: boolean
): SimulatorState {
  const localCommitId = state.refStore.getBranch(branchName);
  if (!localCommitId) {
    throw new Error(`ローカルブランチ "${branchName}" が存在しません`);
  }

  if (force) {
    const previousId = state.remoteStore.forcePush(remoteName, branchName, localCommitId);
    const prevLabel = previousId ? previousId.slice(0, 6) : "(新規)";
    state.notification = `⚡ force push 完了: ${remoteName}/${branchName} ${prevLabel} → ${localCommitId.slice(0, 6)}${previousId ? " ⚠ リモートの履歴を上書きしました" : ""}`;

    addStep(state, {
      action: "FORCE_PUSH",
      description: `force push: ${branchName} → ${remoteName}/${branchName}${previousId ? ` (上書き前: ${previousId.slice(0, 6)})` : " (新規)"}`,
      objectsCreated: [],
      refsUpdated: [`${remoteName}/${branchName}`],
    });
  } else {
    const result = state.remoteStore.push(remoteName, branchName, localCommitId);

    switch (result) {
      case "ok":
        state.notification = `push 完了: ${branchName} → ${remoteName}/${branchName}`;
        addStep(state, {
          action: "PUSH",
          description: `push: ${branchName} → ${remoteName}/${branchName} (${localCommitId.slice(0, 6)})`,
          objectsCreated: [],
          refsUpdated: [`${remoteName}/${branchName}`],
        });
        break;

      case "up-to-date":
        state.notification = `Already up-to-date: ${remoteName}/${branchName} はすでに最新です`;
        break;

      case "rejected-non-ff":
        throw new Error(
          `push が拒否されました: ${remoteName}/${branchName} はローカルより進んでいます（non-fast-forward）。\n` +
          `先に fetch & merge して最新を取り込むか、強制的に上書きするには push --force を使ってください。`
        );
    }
  }

  return state;
}

/**
 * handleFetch
 *
 * リモートのスナップショットをローカルの RefStore に
 * トラッキングブランチ（origin/xxx）として反映する。
 *
 * 実装として: RemoteStore のスナップショットを読んで
 * RefStore に "origin/xxx" ブランチとして作成 or 移動する。
 */
function handleFetch(
  state: SimulatorState,
  remoteName: string
): SimulatorState {
  const snapshot = state.remoteStore.fetchSnapshot(remoteName);
  if (snapshot.size === 0) {
    state.notification = `${remoteName} にブランチがありません（push してからfetchしてください）`;
    return state;
  }

  const updated: string[] = [];

  for (const [branchName, commitId] of snapshot) {
    const trackingName = `${remoteName}/${branchName}`;
    const existing = state.refStore.getBranch(trackingName);
    if (existing === undefined) {
      state.refStore.createBranch(trackingName, commitId);
    } else if (existing !== commitId) {
      state.refStore.moveBranch(trackingName, commitId);
    }
    updated.push(trackingName);
  }

  state.notification = `fetch 完了: ${updated.join(", ")} を更新しました`;

  addStep(state, {
    action: "FETCH",
    description: `fetch ${remoteName}: ${updated.join(", ")}`,
    objectsCreated: [],
    refsUpdated: updated,
  });

  return state;
}

/**
 * handlePull
 *
 * fetch + merge を実行する。
 * 1. fetch でトラッキングブランチを更新
 * 2. 現在 HEAD が branchName を指していることを確認
 * 3. origin/branchName を現在のブランチにマージ
 */
function handlePull(
  state: SimulatorState,
  remoteName: string,
  branchName: string
): SimulatorState {
  // Step 1: fetch
  state = handleFetch(state, remoteName);

  const trackingBranch = `${remoteName}/${branchName}`;
  const trackingCommitId = state.refStore.getBranch(trackingBranch);
  if (!trackingCommitId) {
    throw new Error(`${trackingBranch} が見つかりません。先に push して fetch してください。`);
  }

  // Step 2: HEAD が対象ブランチかチェック
  const head = state.refStore.getHead();
  if (head.type !== "branch" || head.name !== branchName) {
    throw new Error(
      `pull するには HEAD が "${branchName}" を指している必要があります。` +
      `現在の HEAD: ${head.type === "branch" ? head.name : "(detached)"}`
    );
  }

  const localCommitId = state.refStore.getBranch(branchName);
  if (localCommitId === trackingCommitId) {
    state.notification = `Already up-to-date: ${branchName} はすでに ${remoteName} と同じです`;
    return state;
  }

  // Step 3: merge origin/branchName → branchName
  // MergeEngine を使って merge を試みる
  const mergeEngine = new MergeEngine(state.objectStore, state.refStore);
  const result = mergeEngine.merge(trackingBranch, branchName);

  switch (result.type) {
    case "fast-forward":
      state.notification = `pull 完了 (fast-forward): ${branchName} を ${trackingBranch} に合わせました`;
      addStep(state, {
        action: "PULL",
        description: `pull (fast-forward): ${trackingBranch} → ${branchName}`,
        objectsCreated: [],
        refsUpdated: [branchName],
      });
      break;

    case "normal": {
      const mergeCommit = (result as { type: "normal"; mergeCommit: { id: ObjectId } }).mergeCommit;
      state.notification = `pull 完了 (merge commit): ${mergeCommit.id.slice(0, 6)}`;
      addStep(state, {
        action: "PULL",
        description: `pull (merge): ${trackingBranch} → ${branchName} (merge commit: ${mergeCommit.id.slice(0, 6)})`,
        objectsCreated: [mergeCommit.id],
        refsUpdated: [branchName],
      });
      break;
    }

    case "conflict": {
      const conflictResult = result as { type: "conflict"; conflicts: import("../core/types").ConflictEntry[] };
      state.mergeState = {
        sourceBranch: trackingBranch,
        targetBranch: branchName,
        conflicts: conflictResult.conflicts,
        resolved: new Map(),
      };
      state.notification = `pull: conflict が発生しました。Conflict解決パネルで解決してください`;
      addStep(state, {
        action: "PULL",
        description: `pull: conflict 発生 (${conflictResult.conflicts.length} conflicts)`,
        objectsCreated: [],
        refsUpdated: [],
      });
      break;
    }
  }

  return state;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * 現在のHEADが指すCommit IDを解決する
 */
function resolveCurrentCommitId(state: SimulatorState): ObjectId | null {
  const head = state.refStore.getHead();
  if (head.type === "branch") {
    return state.refStore.getBranch(head.name) ?? null;
  }
  return head.commitId;
}

/**
 * HEADのラベル表現を返す
 */
function getHeadLabel(state: SimulatorState): string {
  const head = state.refStore.getHead();
  if (head.type === "branch") {
    return head.name;
  }
  return `HEAD(${head.commitId})`;
}
