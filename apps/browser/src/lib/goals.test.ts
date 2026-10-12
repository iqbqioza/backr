import { describe, expect, it } from "vitest";
import {
  dedupeReports,
  goalRemaining,
  goalStatus,
  parseProfile,
  profilesByKey,
  toGoalCard,
  toReportData,
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

describe("toReportData", () => {
  const goalId = "a".repeat(64);
  const ev = {
    id: "b".repeat(64),
    pubkey: "c".repeat(64),
    created_at: 100,
    kind: 30023,
    tags: [
      ["d", "backr-1"],
      ["title", "進捗"],
      ["goal", goalId, ""],
    ],
    content: "本文です。",
    sig: "d".repeat(128),
  };
  it("extracts body and matches goal", () => {
    expect(toReportData(ev, goalId)).toEqual({
      id: ev.id,
      author: ev.pubkey,
      identifier: "backr-1",
      title: "進捗",
      createdAt: 100,
      content: "本文です。",
    });
    expect(toReportData(ev, "f".repeat(64))).toBeNull();
    expect(toReportData({ ...ev, kind: 1 }, goalId)).toBeNull();
    expect(toReportData({ ...ev, tags: [["title", "x"]] }, goalId)).toBeNull();
  });
  it("reads optional summary and image tags", () => {
    const withMeta = {
      ...ev,
      tags: [
        ...ev.tags,
        ["summary", "概要"],
        ["image", "https://example.com/a.png"],
      ],
    };
    expect(toReportData(withMeta, goalId)).toMatchObject({
      summary: "概要",
      image: "https://example.com/a.png",
    });
  });
});

describe("goalStatus", () => {
  it("prioritizes achieved over ended", () => {
    expect(goalStatus(2000n, 1000n, 9999, 100)).toBe("achieved");
    expect(goalStatus(500n, 1000n, 9999, 100)).toBe("ended");
    expect(goalStatus(500n, 1000n, 100, 100 + 86400)).toBe("ending-soon");
    expect(goalStatus(500n, 1000n, 100, undefined)).toBe("active");
    expect(goalStatus(0n, 0n, 100, undefined)).toBe("active");
  });
});

describe("goalRemaining", () => {
  it("returns remaining or zero", () => {
    expect(goalRemaining(300n, 1000n)).toBe(700n);
    expect(goalRemaining(1500n, 1000n)).toBe(0n);
    expect(goalRemaining(0n, 0n)).toBe(0n);
  });
});

describe("dedupeReports", () => {
  it("keeps newest per author+identifier", () => {
    const base = {
      author: "c".repeat(64),
      identifier: "backr-1",
      title: "t",
      content: "c",
    };
    const deduped = dedupeReports([
      { ...base, id: "1".repeat(64), createdAt: 100 },
      { ...base, id: "2".repeat(64), createdAt: 200 },
      { ...base, id: "3".repeat(64), author: "d".repeat(64), createdAt: 50 },
    ]);
    expect(deduped.map((r) => r.id)).toEqual(["2".repeat(64), "3".repeat(64)]);
  });
});

describe("profilesByKey", () => {
  it("indexes first profile per pubkey", () => {
    const ev = (content: string) => ({
      id: "b".repeat(64),
      pubkey: "c".repeat(64),
      created_at: 1,
      kind: 0,
      tags: [],
      content,
      sig: "d".repeat(128),
    });
    const map = profilesByKey([
      ev(JSON.stringify({ name: "アリス" })),
      ev(JSON.stringify({ name: "上書き" })),
      { ...ev("{}"), kind: 1 },
    ]);
    expect(map.size).toBe(1);
    expect(map.get("c".repeat(64))?.name).toBe("アリス");
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
    expect(
      parseProfile("b".repeat(64), JSON.stringify({ name: "x", about: "自己紹介です" }))?.about,
    ).toBe("自己紹介です");
  });
  it("falls back and rejects garbage", () => {
    expect(parseProfile("b".repeat(64), JSON.stringify({}))?.name).toBe("bbbbbbbbbbbb");
    expect(parseProfile("b".repeat(64), "not json")).toBeNull();
  });
});
