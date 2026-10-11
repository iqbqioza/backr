import { describe, expect, it } from "vitest";
import { buildClose, buildReq, parseRelayMessage } from "./messages";

const EVENT = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  created_at: 1700000000,
  kind: 9041,
  tags: [],
  content: "x",
  sig: "c".repeat(64),
};

describe("buildReq/buildClose", () => {
  it("builds REQ envelopes", () => {
    expect(buildReq("s1", [{ kinds: [9041] }])).toBe(
      JSON.stringify(["REQ", "s1", { kinds: [9041] }]),
    );
    expect(buildReq("", [])).toBeNull();
    expect(buildClose("s1")).toBe(JSON.stringify(["CLOSE", "s1"]));
  });
});

describe("parseRelayMessage", () => {
  it("parses EVENT/EOSE/CLOSED/NOTICE/OK", () => {
    expect(parseRelayMessage(JSON.stringify(["EVENT", "s1", EVENT]))).toEqual({
      type: "EVENT",
      subscriptionId: "s1",
      event: EVENT,
    });
    expect(parseRelayMessage(JSON.stringify(["EOSE", "s1"]))).toEqual({
      type: "EOSE",
      subscriptionId: "s1",
    });
    expect(parseRelayMessage(JSON.stringify(["CLOSED", "s1", "no"]))).toEqual({
      type: "CLOSED",
      subscriptionId: "s1",
      message: "no",
    });
    expect(parseRelayMessage(JSON.stringify(["NOTICE", "hi"]))).toEqual({
      type: "NOTICE",
      message: "hi",
    });
    expect(parseRelayMessage(JSON.stringify(["OK", "a".repeat(64), true, ""]))).toEqual({
      type: "OK",
      eventId: "a".repeat(64),
      accepted: true,
      message: "",
    });
  });
  it("rejects garbage", () => {
    expect(parseRelayMessage("not json")).toBeNull();
    expect(parseRelayMessage(JSON.stringify(["EVENT", "s1", { kind: 1 }]))).toBeNull();
    expect(parseRelayMessage(JSON.stringify(["AUTH", "x"]))).toBeNull();
  });
  it("normalizes uppercase hex", () => {
    const upper = {
      ...EVENT,
      id: "A".repeat(64),
      pubkey: "B".repeat(64),
      sig: "C".repeat(128),
      tags: [["e", "D".repeat(64)]],
    };
    expect(parseRelayMessage(JSON.stringify(["EVENT", "s1", upper]))).toEqual({
      type: "EVENT",
      subscriptionId: "s1",
      event: {
        ...upper,
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        sig: "c".repeat(128),
        tags: [["e", "d".repeat(64)]],
      },
    });
  });
});
