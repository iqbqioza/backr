import { describe, expect, it } from "vitest";
import type { NostrEventLike } from "./event";
import { tallyZaps } from "./zap";

function receipt(id: string, createdAt: number): NostrEventLike {
  return {
    id,
    pubkey: "d".repeat(64),
    created_at: createdAt,
    kind: 9735,
    tags: [
      ["e", "a".repeat(64)],
      ["bolt11", "dummy"],
    ],
    content: "",
    sig: "e".repeat(64),
  };
}

const AMOUNTS = new Map<string, bigint | null>([
  ["r1", 1000n],
  ["r2", 2000n],
  ["r3", null],
]);

describe("tallyZaps", () => {
  it("sums valid receipts and skips others", () => {
    const events = [
      receipt("r1", 100),
      receipt("r2", 200),
      receipt("r3", 300),
      { ...receipt("r4", 400), kind: 1 },
    ];
    const tally = tallyZaps(events, "a".repeat(64), undefined, (ev) => AMOUNTS.get(ev.id) ?? 500n);
    expect(tally).toEqual({ totalMsats: 3500n, count: 3 });
  });
  it("excludes receipts after closed_at", () => {
    const events = [receipt("r1", 100), receipt("r2", 200)];
    const tally = tallyZaps(events, "a".repeat(64), 150, (ev) => AMOUNTS.get(ev.id) ?? null);
    expect(tally).toEqual({ totalMsats: 1000n, count: 1 });
  });
});
