import { describe, expect, it } from "vitest";
import { toGoalCard } from "./goals";

const BASE = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  created_at: 1700000000,
  kind: 9041,
  content: "本文です。",
  sig: "c".repeat(64),
};

describe("toGoalCard", () => {
  it("maps a valid goal", () => {
    const card = toGoalCard({
      ...BASE,
      tags: [
        ["relays", "wss://relay.nostrfy.org"],
        ["amount", "1000000"],
        ["summary", "テスト企画"],
        ["t", "backr"],
      ],
    });
    expect(card?.title).toBe("テスト企画");
    expect(card?.goalMsats).toBe(1000000n);
  });
  it("rejects an invalid goal", () => {
    expect(toGoalCard({ ...BASE, tags: [] })).toBeNull();
  });
});
