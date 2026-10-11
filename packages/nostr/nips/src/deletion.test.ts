import { describe, expect, it } from "vitest";
import { buildDeletionEvent } from "./deletion";

const PUBKEY = "b".repeat(64);
const ID_A = "a".repeat(64);
const ID_B = "c".repeat(64);

describe("buildDeletionEvent", () => {
  it("builds kind:5 with e tags", () => {
    const draft = buildDeletionEvent({
      pubkey: PUBKEY,
      eventIds: [ID_A, ID_B],
      relayHint: "wss://relay.nostrfy.org",
      reason: "test cleanup",
      createdAt: 1700000000,
    });
    expect(draft).toEqual({
      pubkey: PUBKEY,
      created_at: 1700000000,
      kind: 5,
      tags: [
        ["e", ID_A, "wss://relay.nostrfy.org"],
        ["e", ID_B, "wss://relay.nostrfy.org"],
      ],
      content: "test cleanup",
    });
  });
  it("dedupes ids and omits empty hint", () => {
    const draft = buildDeletionEvent({ pubkey: PUBKEY, eventIds: [ID_A, ID_A] });
    expect(draft?.tags).toEqual([["e", ID_A]]);
  });
  it("rejects bad input", () => {
    expect(buildDeletionEvent({ pubkey: "zz", eventIds: [ID_A] })).toBeNull();
    expect(buildDeletionEvent({ pubkey: PUBKEY, eventIds: [] })).toBeNull();
    expect(buildDeletionEvent({ pubkey: PUBKEY, eventIds: ["zz"] })).toBeNull();
  });
});
