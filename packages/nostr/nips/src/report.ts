import { isHex32, type NostrEventLike } from "./event";
import type { UnsignedEvent } from "./crypto";

export interface ReportArgs {
  authorPubkey: string;
  goalId: string;
  relayHint?: string;
  identifier: string;
  title: string;
  summary?: string;
  image?: string;
  content: string;
  createdAt?: number;
}

function firstTag(tags: string[][], name: string): string[] | undefined {
  return tags.find((t) => t[0] === name);
}

/**
 * NIP-23 活動報告 (kind:30023) + NIP-75 goal タグ。
 * d タグ必須 (addressable/編集可能性のため)。
 */
export function buildReport(args: ReportArgs): UnsignedEvent | null {
  if (!isHex32(args.authorPubkey) || !isHex32(args.goalId)) return null;
  if (args.identifier.trim().length === 0 || args.identifier.length > 255) return null;
  if (args.title.trim().length === 0) return null;
  if (typeof args.content !== "string" || args.content.trim().length === 0) return null;
  const hint = args.relayHint ?? "";
  const tags: string[][] = [
    ["d", args.identifier],
    ["title", args.title],
    ["goal", args.goalId, hint],
  ];
  if (args.summary !== undefined && args.summary.trim().length > 0) {
    tags.push(["summary", args.summary]);
  }
  if (args.image !== undefined && args.image.trim().length > 0) {
    try {
      const url = new URL(args.image);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      tags.push(["image", args.image]);
    } catch {
      return null;
    }
  }
  return {
    pubkey: args.authorPubkey,
    created_at: args.createdAt ?? Math.floor(Date.now() / 1000),
    kind: 30023,
    tags,
    content: args.content,
  };
}

export interface ReportValidation {
  ok: boolean;
  errors: string[];
}

/** 報告記事の構造検証 (署名は問わない) */
export function validateReport(input: unknown): ReportValidation {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) return { ok: false, errors: ["not an object"] };
  const e = input as Record<string, unknown>;
  if (e["kind"] !== 30023) errors.push("kind must be 30023");
  if (!isHex32(e["id"]) && typeof e["id"] !== "undefined") errors.push("invalid id");
  if (typeof e["pubkey"] !== "string") errors.push("invalid pubkey");
  if (typeof e["content"] !== "string" || (e["content"] as string).trim().length === 0) {
    errors.push("invalid content");
  }
  const tagsRaw = e["tags"];
  const tagsOk =
    Array.isArray(tagsRaw) &&
    (tagsRaw as unknown[]).every(
      (t) => Array.isArray(t) && (t as unknown[]).every((x) => typeof x === "string"),
    );
  if (!tagsOk) errors.push("invalid tags");
  if (errors.length > 0 || !tagsOk) return { ok: false, errors };
  const tags = (e["tags"] as string[][]);
  if (firstTag(tags, "d")?.[1]?.trim().length === 0 || firstTag(tags, "d") === undefined) {
    errors.push("missing d tag");
  }
  if (firstTag(tags, "title")?.[1]?.trim().length === 0 || firstTag(tags, "title") === undefined) {
    errors.push("missing title");
  }
  const goal = firstTag(tags, "goal")?.[1] ?? "";
  if (!isHex32(goal)) errors.push("missing/invalid goal tag");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, errors: [] };
}

export function isGoalReport(ev: NostrEventLike, goalId: string): boolean {
  return (
    ev.kind === 30023 && ev.tags.some((t) => t[0] === "goal" && t[1] === goalId)
  );
}
