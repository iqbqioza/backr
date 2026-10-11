import { describe, expect, it } from "vitest";
import type { NostrEventLike } from "backr-nostr-nips";
import {
  firstSupporter,
  toSupporters,
  topSupporters,
  type Supporter,
} from "./supporters";

function receipt(id: string, createdAt: number, tags: string[][]): NostrEventLike {
  return {
    id,
    pubkey: "d".repeat(64),
    created_at: createdAt,
    kind: 9735,
    tags,
    content: "",
    sig: "e".repeat(64),
  };
}

const DESC = JSON.stringify({
  pubkey: "f".repeat(64),
  content: "応援してます",
  kind: 9734,
  tags: [],
});

describe("toSupporters", () => {
  it("maps P tag sender, amount and comment", () => {
    const supporters = toSupporters([
      receipt("r1", 100, [
        ["P", "a".repeat(64)],
        ["bolt11", "lnbc10u1abcdef"],
        ["description", DESC],
      ]),
    ]);
    expect(supporters).toHaveLength(1);
    expect(supporters[0].pubkey).toBe("a".repeat(64));
    expect(supporters[0].msats).toBe(1000000n);
    expect(supporters[0].comment).toBe("応援してます");
  });
  it("falls back to description pubkey", () => {
    const supporters = toSupporters([
      receipt("r1", 100, [["bolt11", "lnbc10u1abcdef"], ["description", DESC]]),
    ]);
    expect(supporters[0].pubkey).toBe("f".repeat(64));
  });
  it("skips invalid amounts and closed_at overflow", () => {
    const supporters = toSupporters(
      [
        receipt("r1", 100, [["bolt11", "lnbc1p1abcdef"]]),
        receipt("r2", 300, [["bolt11", "lnbc10u1abcdef"]]),
      ],
      200,
    );
    expect(supporters).toHaveLength(0);
  });
});

describe("firstSupporter/topSupporters", () => {
  const list: Supporter[] = [
    { pubkey: "a", msats: 100n, comment: "", createdAt: 300 },
    { pubkey: "b", msats: 500n, comment: "", createdAt: 100 },
    { pubkey: "c", msats: 300n, comment: "", createdAt: 200 },
  ];
  it("finds earliest", () => {
    expect(firstSupporter(list)?.pubkey).toBe("b");
    expect(firstSupporter([])).toBeNull();
  });
  it("ranks by amount with stable tie-break", () => {
    expect(topSupporters(list).map((s) => s.pubkey)).toEqual(["b", "c", "a"]);
    expect(topSupporters(list, 2)).toHaveLength(2);
    expect(topSupporters([], 3)).toEqual([]);
  });
});
