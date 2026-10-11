import { describe, expect, it } from "vitest";
import {
  parseProfile,
  sortGoalCards,
  toGoalCard,
  type GoalCardData,
} from "./goals";

const BASE = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  created_at: 1700000000,
  kind: 9041,
  content: "本文です。",
  sig: "c".repeat(128),
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

function card(id: string, createdAt: number, goalMsats: bigint, closedAt?: number): GoalCardData {
  return {
    id,
    pubkey: "b".repeat(64),
    createdAt,
    description: "d",
    summary: "s",
    title: id,
    goalMsats,
    closedAt,
    relays: ["wss://relay.nostrfy.org"],
  };
}

describe("sortGoalCards", () => {
  const cards = [
    card("a", 300, 1000n, 9999),
    card("b", 100, 1000n, 1111),
    card("c", 200, 1000n),
  ];
  const tallies = new Map([
    ["a", 100n],
    ["b", 900n],
    ["c", 500n],
  ]);
  it("sorts by new", () => {
    expect(sortGoalCards(cards, tallies, "new").map((c) => c.id)).toEqual(["a", "c", "b"]);
  });
  it("sorts by progress", () => {
    expect(sortGoalCards(cards, tallies, "progress").map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
  it("sorts by deadline (no deadline last)", () => {
    expect(sortGoalCards(cards, tallies, "deadline").map((c) => c.id)).toEqual(["b", "a", "c"]);
  });
});

describe("parseProfile", () => {
  it("parses kind:0 content", () => {
    const profile = parseProfile(
      "b".repeat(64),
      JSON.stringify({ display_name: "アリス", picture: "https://example.com/a.png", lud16: "alice@example.com" }),
    );
    expect(profile).toEqual({
      pubkey: "b".repeat(64),
      name: "アリス",
      image: "https://example.com/a.png",
      lud16: "alice@example.com",
    });
  });
  it("falls back and rejects garbage", () => {
    expect(parseProfile("b".repeat(64), JSON.stringify({}))?.name).toBe("bbbbbbbbbbbb");
    expect(parseProfile("b".repeat(64), "not json")).toBeNull();
  });
});
