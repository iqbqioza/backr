import { isHex32, normalizeEventLike, type NostrEventLike } from "./event";

export interface Goal9041View {
  id: string;
  pubkey: string;
  createdAt: number;
  description: string;
  summary: string;
  image?: string;
  goalMsats: bigint;
  closedAt?: number;
  relays: string[];
}

export type GoalValidation = { ok: true; value: Goal9041View } | { ok: false; errors: string[] };

function firstTag(tags: string[][], name: string): string[] | undefined {
  return tags.find((t) => t[0] === name);
}

function isValidWss(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "wss:" || u.protocol === "ws:";
  } catch {
    return false;
  }
}

/** NIP-75 kind:9041 の検証。独自タグは要求しない */
export function validateGoal9041(input: unknown): GoalValidation {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: ["not an object"] };
  }
  const e = input as Record<string, unknown>;
  if (e["kind"] !== 9041) errors.push("kind must be 9041");
  if (typeof e["id"] !== "string") errors.push("invalid id");
  if (typeof e["pubkey"] !== "string") errors.push("invalid pubkey");
  if (typeof e["created_at"] !== "number" || !Number.isInteger(e["created_at"])) {
    errors.push("invalid created_at");
  }
  if (typeof e["content"] !== "string") errors.push("invalid content");
  const tagsRaw = e["tags"];
  const tagsOk =
    Array.isArray(tagsRaw) &&
    (tagsRaw as unknown[]).every(
      (t) => Array.isArray(t) && (t as unknown[]).every((x) => typeof x === "string"),
    );
  if (!tagsOk) errors.push("invalid tags");
  if (typeof e["sig"] !== "string") errors.push("invalid sig");
  if (errors.length > 0 || !tagsOk) return { ok: false, errors };

  const ev = normalizeEventLike(input as NostrEventLike);
  if (!isHex32(ev.id)) errors.push("invalid id");
  if (!isHex32(ev.pubkey)) errors.push("invalid pubkey");
  if (!/^[0-9a-f]{128}$/.test(ev.sig)) errors.push("invalid sig");
  if (errors.length > 0) return { ok: false, errors };
  const tags = ev.tags;

  let goalMsats = 0n;
  const amountTag = firstTag(tags, "amount");
  const amountRaw = amountTag?.[1] ?? "";
  if (!/^\d+$/.test(amountRaw)) {
    errors.push("missing/invalid amount");
  } else {
    goalMsats = BigInt(amountRaw);
    if (goalMsats <= 0n) errors.push("amount must be > 0");
  }

  const relaysTag = tags.find((t) => t[0] === "relays");
  const relays = relaysTag ? relaysTag.slice(1) : [];
  if (relays.length === 0) {
    errors.push("missing relays");
  } else if (!relays.every(isValidWss)) {
    errors.push("invalid relay url");
  }

  let closedAt: number | undefined;
  const closedTag = firstTag(tags, "closed_at");
  if (closedTag !== undefined) {
    const raw = closedTag[1] ?? "";
    if (!/^\d+$/.test(raw)) errors.push("invalid closed_at");
    else closedAt = Number(raw);
  }

  let image: string | undefined;
  const imageTag = firstTag(tags, "image");
  if (imageTag !== undefined) {
    try {
      const u = new URL(imageTag[1]);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
      image = imageTag[1];
    } catch {
      errors.push("invalid image");
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      id: ev.id,
      pubkey: ev.pubkey,
      createdAt: ev.created_at,
      description: ev.content,
      summary: firstTag(tags, "summary")?.[1] ?? "",
      image,
      goalMsats,
      closedAt,
      relays,
    },
  };
}

/** 表示タイトル: summary 先頭行、なければ content 先頭行 (9041 に title は定義なし) */
export function goalTitle(value: { summary: string; description: string }): string {
  const first = (value.summary.split("\n")[0] ?? "").trim() || (value.description.split("\n")[0] ?? "").trim();
  if (first.length === 0) return "Untitled goal";
  return first.length > 80 ? `${first.slice(0, 80)}…` : first;
}
