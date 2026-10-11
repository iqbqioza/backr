import { describe, expect, it } from "vitest";
import { normalizeEventLike } from "./event";

const LOWER = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  created_at: 1,
  kind: 9041,
  tags: [["e", "c".repeat(64)]],
  content: "x",
  sig: "d".repeat(64),
};

describe("normalizeEventLike", () => {
  it("lowercases hex ids and tag refs", () => {
    const normalized = normalizeEventLike({
      ...LOWER,
      id: "A".repeat(64),
      pubkey: "B".repeat(64),
      sig: "D".repeat(128),
      tags: [["e", "C".repeat(64), "wss://x"], ["t", "Backr"]],
    });
    expect(normalized.id).toBe("a".repeat(64));
    expect(normalized.pubkey).toBe("b".repeat(64));
    expect(normalized.sig).toBe("d".repeat(128));
    expect(normalized.tags).toEqual([
      ["e", "c".repeat(64), "wss://x"],
      ["t", "Backr"],
    ]);
  });
  it("keeps lowercase input unchanged", () => {
    expect(normalizeEventLike(LOWER)).toEqual(LOWER);
  });
});
