import { describe, expect, it } from "vitest";
import { derivePublicKey, signEvent } from "./crypto";
import { buildZapRequest, validateZapRequest } from "./zapRequest";

const SECRET = "e".repeat(64);
const SENDER = derivePublicKey(SECRET) ?? "";
const RECIPIENT = "b".repeat(64);
const GOAL = "c".repeat(64);

describe("buildZapRequest", () => {
  it("builds Appendix A shape", () => {
    const draft = buildZapRequest({
      senderPubkey: SENDER,
      recipientPubkey: RECIPIENT,
      goalId: GOAL,
      amountMsats: 21000n,
      relays: ["wss://relay.nostrfy.org"],
      comment: "応援してます",
    });
    expect(draft?.kind).toBe(9734);
    expect(draft?.tags).toContainEqual(["amount", "21000"]);
    expect(draft?.tags).toContainEqual(["p", RECIPIENT]);
    expect(draft?.tags).toContainEqual(["e", GOAL]);
    expect(draft?.tags).toContainEqual(["k", "9041"]);
  });
  it("rejects bad input", () => {
    const base = {
      senderPubkey: SENDER,
      recipientPubkey: RECIPIENT,
      goalId: GOAL,
      amountMsats: 21000n,
      relays: ["wss://relay.nostrfy.org"],
    };
    expect(buildZapRequest({ ...base, amountMsats: 0n })).toBeNull();
    expect(buildZapRequest({ ...base, relays: [] })).toBeNull();
    expect(buildZapRequest({ ...base, goalId: "zz" })).toBeNull();
  });
});

describe("validateZapRequest", () => {
  it("accepts a signed request and checks amount", () => {
    const draft = buildZapRequest({
      senderPubkey: SENDER,
      recipientPubkey: RECIPIENT,
      goalId: GOAL,
      amountMsats: 21000n,
      relays: ["wss://relay.nostrfy.org"],
    });
    if (draft === null) throw new Error("unreachable");
    const signed = signEvent(draft, SECRET);
    if (signed === null) throw new Error("unreachable");
    expect(validateZapRequest(signed, 21000n)).toEqual([]);
    expect(validateZapRequest(signed, 999n)).toContain("amount mismatch");
  });
});
