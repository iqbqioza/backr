import { describe, expect, it } from "vitest";
import {
  buildReplyComment,
  buildTopLevelComment,
  isGoalComment,
  parseComment,
} from "./comment";

const AUTHOR = "a".repeat(64);
const GOAL = "b".repeat(64);
const GOAL_AUTHOR = "c".repeat(64);
const ROOT = { id: GOAL, pubkey: GOAL_AUTHOR, kind: 9041 };

describe("buildTopLevelComment", () => {
  it("matches NIP-22 file-comment shape", () => {
    const draft = buildTopLevelComment({
      authorPubkey: AUTHOR,
      root: ROOT,
      relayHint: "wss://relay.nostrfy.org",
      content: "応援してます",
      createdAt: 1700000000,
    });
    expect(draft).toEqual({
      pubkey: AUTHOR,
      created_at: 1700000000,
      kind: 1111,
      tags: [
        ["E", GOAL, "wss://relay.nostrfy.org", GOAL_AUTHOR],
        ["K", "9041"],
        ["P", GOAL_AUTHOR, "wss://relay.nostrfy.org"],
        ["e", GOAL, "wss://relay.nostrfy.org", GOAL_AUTHOR],
        ["k", "9041"],
        ["p", GOAL_AUTHOR, "wss://relay.nostrfy.org"],
      ],
      content: "応援してます",
    });
  });
  it("rejects bad input", () => {
    const base = { authorPubkey: AUTHOR, root: ROOT, content: "x" };
    expect(buildTopLevelComment({ ...base, content: "  " })).toBeNull();
    expect(buildTopLevelComment({ ...base, authorPubkey: "zz" })).toBeNull();
  });
});

describe("buildReplyComment", () => {
  it("keeps root, repoints parent", () => {
    const parent = { id: "d".repeat(64), pubkey: "e".repeat(64), kind: 1111 };
    const draft = buildReplyComment({
      authorPubkey: AUTHOR,
      root: ROOT,
      parent,
      relayHint: "wss://r",
      content: "同感です",
      createdAt: 1,
    });
    expect(draft?.tags).toContainEqual(["E", GOAL, "wss://r", GOAL_AUTHOR]);
    expect(draft?.tags).toContainEqual(["K", "9041"]);
    expect(draft?.tags).toContainEqual(["e", parent.id, "wss://r", parent.pubkey]);
    expect(draft?.tags).toContainEqual(["k", "1111"]);
    expect(draft?.tags).toContainEqual(["p", parent.pubkey, "wss://r"]);
  });
});

describe("parseComment/isGoalComment", () => {
  it("parses and matches goal root", () => {
    const ev = {
      id: "f".repeat(64),
      pubkey: AUTHOR,
      created_at: 2,
      kind: 1111,
      tags: [
        ["E", GOAL, "", GOAL_AUTHOR],
        ["K", "9041"],
        ["P", GOAL_AUTHOR, ""],
        ["e", GOAL, "", GOAL_AUTHOR],
        ["k", "9041"],
        ["p", GOAL_AUTHOR, ""],
      ],
      content: "x",
      sig: "0".repeat(128),
    };
    const view = parseComment(ev);
    expect(view?.rootId).toBe(GOAL);
    expect(view?.parentId).toBe(GOAL);
    expect(isGoalComment(ev, GOAL)).toBe(true);
    expect(isGoalComment(ev, "a".repeat(64))).toBe(false);
  });
  it("requires K/k tags", () => {
    const ev = {
      id: "f".repeat(64),
      pubkey: AUTHOR,
      created_at: 2,
      kind: 1111,
      tags: [["e", GOAL]],
      content: "x",
      sig: "0".repeat(128),
    };
    expect(parseComment(ev)).toBeNull();
  });
});
