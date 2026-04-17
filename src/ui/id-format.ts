import type { ObjectId } from "../core/types";

function normalizePrefix(prefix: string): string {
  if (prefix === "blob") return "B";
  if (prefix === "tree") return "T";
  if (prefix === "commit") return "C";
  return prefix;
}

export function formatObjectId(objectId: ObjectId): string {
  const match = objectId.match(/^(blob|tree|commit)-(\d+)$/);
  if (!match) return objectId;
  return `${normalizePrefix(match[1])}${match[2]}`;
}

export function formatInlineIds(text: string): string {
  return text.replace(/\b(blob|tree|commit)-(\d+)\b/g, (_, prefix: string, num: string) => {
    return `${normalizePrefix(prefix)}${num}`;
  });
}
