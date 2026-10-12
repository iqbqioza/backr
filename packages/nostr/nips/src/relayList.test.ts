import { describe, expect, it } from "vitest";
import { parseRelayList } from "./relayList";

function ev(tags: string[][]) {
  return {
    id: "a".repeat(64),
    pubkey: "b".repeat(64),
    created_at: 1,
    kind: 10002,
    tags,
    content: "",
    sig: "c".repeat(128),
  };
}

describe("parseRelayList", () => {
  it("splits read/write and defaults bare entries to both", () => {
    expect(
      parseRelayList(
        ev([
          ["r", "wss://a.example", "read"],
          ["r", "wss://b.example", "write"],
          ["r", "wss://c.example"],
        ]),
      ),
    ).toEqual({
      read: ["wss://a.example", "wss://c.example"],
      write: ["wss://b.example", "wss://c.example"],
    });
  });
  it("drops non-wss urls, dupes and unknown markers", () => {
    expect(
      parseRelayList(
        ev([
          ["r", "https://a.example", "read"],
          ["r", "wss://a.example", "read"],
          ["r", "wss://a.example", "read"],
          ["r", "wss://b.example", "spam"],
        ]),
      ),
    ).toEqual({ read: ["wss://a.example"], write: [] });
  });
  it("rejects non-10002 kinds", () => {
    expect(parseRelayList({ ...ev([]), kind: 3 })).toBeNull();
  });
});
