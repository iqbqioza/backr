import { describe, expect, it } from "vitest";
import { buildActivityFeed, recentSupporterCount } from "./activity";
import type { CommentView } from "./comments";
import type { ReportData } from "./goals";
import type { Supporter } from "./supporters";

const supporter = (at: number): Supporter => ({
  pubkey: "a".repeat(64),
  msats: 1000n,
  comment: "",
  createdAt: at,
});
const comment = (at: number): CommentView => ({
  id: "b".repeat(64),
  pubkey: "c".repeat(64),
  createdAt: at,
  content: "x",
  rootId: null,
  rootKind: "9041",
  parentId: null,
  parentKind: "9041",
});
const report = (at: number): ReportData => ({
  id: "d".repeat(64),
  author: "e".repeat(64),
  identifier: "backr-1",
  title: "進捗",
  createdAt: at,
  content: "c",
});

describe("buildActivityFeed", () => {
  it("merges newest-first with limit", () => {
    const feed = buildActivityFeed([supporter(100)], [comment(300)], [report(200)], 2);
    expect(feed.map((f) => f.kind)).toEqual(["comment", "report"]);
    expect(feed[1].text).toContain("進捗");
  });
});

describe("recentSupporterCount", () => {
  it("counts last 24h", () => {
    expect(recentSupporterCount([supporter(1000), supporter(-85000)], 2000)).toBe(1);
  });
});
