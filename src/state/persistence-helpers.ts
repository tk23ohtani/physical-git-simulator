import type { SimulatorState } from "./types";
import type { PersistedState } from "../core/persistence";
import { ObjectStore } from "../core/object-store";
import { RefStore } from "../core/ref-store";
import { RemoteStore } from "../core/remote-store";
import { IDGenerator } from "../core/id-generator";
import type { GitObject } from "../core/types";

export function serializeState(state: SimulatorState): PersistedState {
  const objects: PersistedState["objects"] = [];
  for (const type of ["blob", "tree", "commit"] as const) {
    for (const obj of state.objectStore.getAllByType(type)) {
      objects.push({ id: obj.id, type, data: obj });
    }
  }

  const branches: PersistedState["branches"] = [];
  for (const [name, commitId] of state.refStore.getAllBranches()) {
    branches.push({ name, commitId });
  }

  const remotes: PersistedState["remotes"] = [];
  for (const remoteName of state.remoteStore.getRemoteNames()) {
    const remoteBranches: Array<{ name: string; commitId: string }> = [];
    for (const [branchName, commitId] of state.remoteStore.getAllRemoteBranches(remoteName)) {
      remoteBranches.push({ name: branchName, commitId });
    }
    remotes.push({ name: remoteName, branches: remoteBranches });
  }

  return {
    version: 1,
    objects,
    branches,
    head: state.refStore.getHead(),
    idMode: state.idMode,
    remotes,
  };
}

export function deserializeState(persisted: PersistedState): SimulatorState {
  const idGenerator = new IDGenerator();
  idGenerator.setMode(persisted.idMode);

  const objectStore = new ObjectStore(idGenerator);
  const refStore = new RefStore(objectStore);
  const remoteStore = new RemoteStore(objectStore);

  const byType: Record<string, typeof persisted.objects> = {
    blob: [],
    tree: [],
    commit: [],
  };
  for (const entry of persisted.objects) {
    byType[entry.type].push(entry);
  }

  for (const entry of byType.blob) {
    restoreObject(objectStore, entry.data);
  }
  for (const entry of byType.tree) {
    restoreObject(objectStore, entry.data);
  }
  for (const entry of byType.commit) {
    restoreObject(objectStore, entry.data);
  }

  for (const { name, commitId } of persisted.branches) {
    refStore.createBranch(name, commitId);
  }

  if (persisted.head.type === "branch") {
    if (refStore.getBranch(persisted.head.name) !== undefined) {
      refStore.checkoutBranch(persisted.head.name);
    }
  } else {
    refStore.checkoutCommit(persisted.head.commitId);
  }

  // リモートの復元
  if (persisted.remotes && persisted.remotes.length > 0) {
    for (const remote of persisted.remotes) {
      remoteStore.addRemote(remote.name);
      for (const branch of remote.branches) {
        remoteStore.forcePush(remote.name, branch.name, branch.commitId);
      }
    }
  } else {
    // 旧データには remotes がない: デフォルトの origin を追加
    remoteStore.addRemote("origin");
  }

  return {
    objectStore,
    refStore,
    remoteStore,
    idMode: persisted.idMode,
    selectedObjectId: null,
    mergeState: null,
    stepHistory: [],
    errorMessage: null,
    notification: null,
  };
}

function restoreObject(objectStore: ObjectStore, data: GitObject): void {
  switch (data.type) {
    case "blob":
      objectStore.addBlob(data.content);
      break;
    case "tree":
      objectStore.addTree([...data.entries]);
      break;
    case "commit":
      objectStore.addCommit(data.treeId, [...data.parentIds], data.message);
      break;
  }
}
