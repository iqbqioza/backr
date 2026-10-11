import { describe, expect, it } from "vitest";
import { buildReport, isGoalReport, validateReport } from "./report";

const AUTHOR = "a".repeat(64);
const GOAL = "b".repeat(64);

describe("buildReport", () => {
  it("builds NIP-23 + goal tag shape", () => {
    const draft = buildReport({
      authorPubkey: AUTHOR,
      goalId: GOAL,
      relayHint: "wss://relay.nostrfy.org",
      identifier: "backr-abc123",
      title: "会場が決まりました",
      summary: "進捗報告",
      content: "本文です。",
      createdAt: 1700000000,
    });
    expect(draft).toEqual({
      pubkey: AUTHOR,
      created_at: 1700000000,
      kind: 30023,
      tags: [
        ["d", "backr-abc123"],
        ["title", "会場が決まりました"],
        ["goal", GOAL, "wss://relay.nostrfy.org"],
        ["summary", "進捗報告"],
      ],
      content: "本文です。",
    });
  });
  it("rejects bad input", () => {
    const base = {
      authorPubkey: AUTHOR,
      goalId: GOAL,
      identifier: "x",
      title: "t",
      content: "c",
    };
    expect(buildReport({ ...base, title: "  " })).toBeNull();
    expect(buildReport({ ...base, identifier: "" })).toBeNull();
    expect(buildReport({ ...base, goalId: "zz" })).toBeNull();
    expect(buildReport({ ...base, image: "gopher://x" })).toBeNull();
  });
});

describe("validateReport/isGoalReport", () => {
  const ev = {
    id: "c".repeat(64),
    pubkey: AUTHOR,
    created_at: 1,
    kind: 30023,
    tags: [
      ["d", "backr-1"],
      ["title", "t"],
      ["goal", GOAL, ""],
    ],
    content: "本文",
    sig: "d".repeat(128),
  };
  it("accepts and matches", () => {
    expect(validateReport(ev).ok).toBe(true);
    expect(isGoalReport(ev, GOAL)).toBe(true);
    expect(isGoalReport(ev, "a".repeat(64))).toBe(false);
  });
  it("rejects missing tags", () => {
    expect(validateReport({ ...ev, kind: 1 }).ok).toBe(false);
    expect(validateReport({ ...ev, tags: [["title", "t"]] }).ok).toBe(false);
  });
});
