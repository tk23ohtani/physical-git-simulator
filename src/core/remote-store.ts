import type { ObjectId } from "./types";
import type { ObjectStore } from "./object-store";

/**
 * RemoteStore - リモートリポジトリの状態を管理するクラス
 *
 * 実際のネットワーク通信はなく、「リモートのブランチ → コミットID」の
 * スナップショットをローカルで模倣する。
 *
 * - push: ローカルブランチ先端をリモートスナップショットに反映
 * - fetch: リモートスナップショットからローカルのトラッキング情報を更新
 * - push --force: fast-forward チェックなしで強制上書き
 */
export class RemoteStore {
  /** リモート名 → (ブランチ名 → コミットID) */
  private remotes: Map<string, Map<string, ObjectId>> = new Map();
  private objectStore: ObjectStore;

  constructor(objectStore: ObjectStore) {
    this.objectStore = objectStore;
  }

  /** 現在の状態をクローンする（新しい ObjectStore インスタンスに紐付ける） */
  clone(newObjectStore: ObjectStore): RemoteStore {
    const copy = new RemoteStore(newObjectStore);
    for (const [remoteName, branches] of this.remotes) {
      copy.remotes.set(remoteName, new Map(branches));
    }
    return copy;
  }

  // ---------------------------------------------------------------------------
  // リモート管理
  // ---------------------------------------------------------------------------

  /** リモートを追加する（既存なら無視） */
  addRemote(name: string): void {
    if (!this.remotes.has(name)) {
      this.remotes.set(name, new Map());
    }
  }

  /** リモートが存在するか確認する */
  hasRemote(name: string): boolean {
    return this.remotes.has(name);
  }

  /** すべてのリモート名を返す */
  getRemoteNames(): string[] {
    return Array.from(this.remotes.keys());
  }

  // ---------------------------------------------------------------------------
  // ブランチ操作
  // ---------------------------------------------------------------------------

  /**
   * リモートブランチの現在の先端コミットIDを返す
   * リモートまたはブランチが存在しない場合は undefined
   */
  getRemoteBranch(remoteName: string, branchName: string): ObjectId | undefined {
    return this.remotes.get(remoteName)?.get(branchName);
  }

  /** リモートの全ブランチ情報を返す */
  getAllRemoteBranches(remoteName: string): Map<string, ObjectId> {
    return new Map(this.remotes.get(remoteName) ?? []);
  }

  /**
   * push（通常）を試みる
   *
   * リモートブランチが存在する場合、ローカルのコミットがリモート先端の
   * 子孫（fast-forward可能）でなければ拒否する。
   *
   * @returns "ok" | "rejected-non-ff" | "up-to-date"
   */
  push(
    remoteName: string,
    branchName: string,
    localCommitId: ObjectId
  ): "ok" | "rejected-non-ff" | "up-to-date" {
    this.ensureRemote(remoteName);
    const branches = this.remotes.get(remoteName)!;
    const remoteCommitId = branches.get(branchName);

    if (remoteCommitId === undefined) {
      // リモートにブランチが存在しない → 新規作成は常に OK
      branches.set(branchName, localCommitId);
      return "ok";
    }

    if (remoteCommitId === localCommitId) {
      return "up-to-date";
    }

    // fast-forward チェック: リモートの先端がローカルコミットの祖先かどうか
    if (this.isAncestor(remoteCommitId, localCommitId)) {
      branches.set(branchName, localCommitId);
      return "ok";
    }

    return "rejected-non-ff";
  }

  /**
   * push --force を実行する
   *
   * fast-forward チェックなしでリモートを強制上書きする。
   * 以前のリモート先端コミット ID を返す（巻き戻し確認用）。
   *
   * @returns 上書き前のリモートコミット ID（存在しなかった場合は null）
   */
  forcePush(
    remoteName: string,
    branchName: string,
    localCommitId: ObjectId
  ): ObjectId | null {
    this.ensureRemote(remoteName);
    const branches = this.remotes.get(remoteName)!;
    const previousId = branches.get(branchName) ?? null;
    branches.set(branchName, localCommitId);
    return previousId;
  }

  /**
   * fetch を実行する
   *
   * リモートブランチのスナップショットを返す（読み取り専用）。
   * 実際のトラッキングブランチ更新は RefStore 側で行う。
   */
  fetchSnapshot(remoteName: string): Map<string, ObjectId> {
    return this.getAllRemoteBranches(remoteName);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private ensureRemote(name: string): void {
    if (!this.remotes.has(name)) {
      throw new Error(`リモート "${name}" は存在しません。先に addRemote() を呼んでください。`);
    }
  }

  /**
   * candidateAncestor が descendant の祖先（またはそれ自身）かどうかを BFS で確認する
   */
  private isAncestor(candidateAncestor: ObjectId, descendant: ObjectId): boolean {
    const visited = new Set<ObjectId>();
    const queue: ObjectId[] = [descendant];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === candidateAncestor) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const obj = this.objectStore.get(current);
      if (obj?.type === "commit") {
        for (const parentId of obj.parentIds) {
          queue.push(parentId);
        }
      }
    }

    return false;
  }
}
