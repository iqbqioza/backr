import { describe, expect, it } from "vitest";
import type { GoalCardData } from "./goals";
import { pickSections } from "./sections";
import type { ValidatedGoalZap } from "./supporters";

function card(id: string, createdAt: number, closedAt?: number): GoalCardData {
  return {
    id,
    pubkey: "b".repeat(64),
    createdAt,
    description: "d",
    summary: "s",
    title: id,
    goalMsats: 1000n,
    closedAt,
    relays: [],
    relatedUrls: [],
  };
}

function zap(total: bigint): ValidatedGoalZap {
  return { totalMsats: total, count: 1, supporters: [], verified: true };
}

describe("pickSections", () => {
  it("splits featured/recommended/ending/fresh", () => {
    const cards = [card("a", 300, 9999), card("b", 100, 1111), card("c", 200)];
    const zapData = new Map([
      ["a", zap(100n)],
      ["b", zap(900n)],
      ["c", zap(500n)],
    ]);
    const sections = pickSections(cards, zapData, 1000);
    expect(sections.featured?.id).toBe("b");
    expect(sections.recommended.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(sections.endingSoon.map((c) => c.id)).toEqual(["b", "a"]);
    expect(sections.fresh.map((c) => c.id)).toEqual(["a", "c", "b"]);
  });
  it("returns empty sections without cards", () => {
    expect(pickSections([], new Map(), 0)).toEqual({
      featured: null,
      recommended: [],
      endingSoon: [],
      fresh: [],
    });
  });
});
