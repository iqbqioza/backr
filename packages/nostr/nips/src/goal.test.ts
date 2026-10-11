import { describe, expect, it } from "vitest";
import { goalTitle, validateGoal9041 } from "./goal";

const BASE = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  created_at: 1700000000,
  kind: 9041,
  content: "大阪で nostr ハッカソンを開きます。",
  sig: "c".repeat(128),
};

describe("validateGoal9041", () => {
  it("accepts a valid goal", () => {
    const result = validateGoal9041({
      ...BASE,
      tags: [
        ["relays", "wss://relay.nostrfy.org"],
        ["amount", "210000000"],
        ["closed_at", "1798767890"],
        ["summary", "Nostrハッカソン開催費"],
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goalMsats).toBe(210000000n);
      expect(result.value.closedAt).toBe(1798767890);
      expect(result.value.relays).toEqual(["wss://relay.nostrfy.org"]);
    }
  });
  it("accepts uppercase hex sig (ingest normalization)", () => {
    const result = validateGoal9041({
      ...BASE,
      sig: "C".repeat(128),
      tags: [
        ["relays", "wss://relay.nostrfy.org"],
        ["amount", "10000000"],
        ["summary", "sample page"],
      ],
    });
    expect(result.ok).toBe(true);
  });
  it("rejects missing amount/relays and bad kind", () => {
    expect(validateGoal9041({ ...BASE, kind: 1, tags: [] }).ok).toBe(false);
    expect(validateGoal9041({ ...BASE, tags: [["amount", "0"]] }).ok).toBe(false);
    expect(validateGoal9041({ ...BASE, tags: [["amount", "10"]] }).ok).toBe(false);
    expect(
      validateGoal9041({
        ...BASE,
        tags: [
          ["amount", "10"],
          ["relays", "https://example.com"],
        ],
      }).ok,
    ).toBe(false);
  });
});

describe("goalTitle", () => {
  it("uses summary first", () => {
    expect(goalTitle({ summary: "タイトル", description: "本文" })).toBe("タイトル");
  });
  it("falls back to content", () => {
    expect(goalTitle({ summary: "", description: "本文1行目\n2行目" })).toBe("本文1行目");
  });
});
