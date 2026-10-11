import { describe, expect, it } from "vitest";
import { buildCommentTree, countDescendants, flattenVisible, type CommentView } from "./comments";

const GOAL = "a".repeat(64);

function comment(id: string, parentId: string | null, createdAt: number): CommentView {
  return {
    id,
    pubkey: "b".repeat(64),
    createdAt,
    content: id.slice(0, 4),
    rootId: GOAL,
    rootKind: "9041",
    parentId,
    parentKind: "1111",
  };
}

function flatten(nodes: ReturnType<typeof buildCommentTree>): string[] {
  const out: string[] = [];
  const walk = (list: ReturnType<typeof buildCommentTree>) => {
    for (const node of list) {
      out.push(`${node.comment.id.slice(0, 1)}${node.depth}`);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

describe("buildCommentTree", () => {
  it("nests 3 levels and clamps deeper", () => {
    const tree = buildCommentTree(
      [
        comment("1".repeat(64), GOAL, 1),
        comment("2".repeat(64), "1".repeat(64), 2),
        comment("3".repeat(64), "2".repeat(64), 3),
        comment("4".repeat(64), "3".repeat(64), 4),
        comment("5".repeat(64), "4".repeat(64), 5),
      ],
      GOAL,
    );
    expect(flatten(tree)).toEqual(["11", "22", "33", "43", "53"]);
  });
  it("treats orphans and self-parents as roots, skips cycles", () => {
    const a = "a1".padEnd(64, "0");
    const b = "b1".padEnd(64, "0");
    const tree = buildCommentTree(
      [
        comment(a, b, 1),
        comment(b, a, 2),
        comment("c1".padEnd(64, "0"), "zz".repeat(32), 3),
        comment("d1".padEnd(64, "0"), "d1".padEnd(64, "0"), 4),
      ],
      GOAL,
    );
    const roots = tree.map((n) => n.comment.id);
    expect(roots).toContain("c1".padEnd(64, "0"));
    expect(roots).toContain("d1".padEnd(64, "0"));
    // 循環は全体が消えずにいずれかが残る
    expect(flatten(tree).length).toBeGreaterThan(0);
  });
  it("sorts by time", () => {
    const tree = buildCommentTree(
      [comment("2".repeat(64), GOAL, 20), comment("1".repeat(64), GOAL, 10)],
      GOAL,
    );
    expect(tree.map((n) => n.comment.id)).toEqual(["1".repeat(64), "2".repeat(64)]);
  });
});

describe("countDescendants", () => {
  it("counts nested children", () => {
    const tree = buildCommentTree(
      [
        comment("1".repeat(64), GOAL, 1),
        comment("2".repeat(64), "1".repeat(64), 2),
        comment("3".repeat(64), "2".repeat(64), 3),
      ],
      GOAL,
    );
    expect(countDescendants(tree[0])).toBe(2);
    expect(countDescendants(tree[0].children[0])).toBe(1);
  });
});

describe("flattenVisible", () => {
  const ids = ["1".repeat(64), "2".repeat(64), "3".repeat(64), "4".repeat(64)];
  const build = () =>
    buildCommentTree(
      [
        comment(ids[0], GOAL, 1),
        comment(ids[1], ids[0], 2),
        comment(ids[2], ids[1], 3),
        comment(ids[3], GOAL, 4),
      ],
      GOAL,
    );
  it("flattens pre-order", () => {
    expect(flattenVisible(build(), new Set()).map((n) => n.comment.id)).toEqual(ids);
  });
  it("hides collapsed subtrees", () => {
    expect(flattenVisible(build(), new Set([ids[0]])).map((n) => n.comment.id)).toEqual([
      ids[0],
      ids[3],
    ]);
  });
});
