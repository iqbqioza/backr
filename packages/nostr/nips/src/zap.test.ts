import { describe, expect, it } from "vitest";
import { derivePublicKey, signEvent } from "./crypto";
import type { NostrEventLike } from "./event";
import { tallyZaps, validateZapReceipt } from "./zap";
import { buildZapRequest } from "./zapRequest";

function receipt(id: string, createdAt: number): NostrEventLike {
  return {
    id,
    pubkey: "d".repeat(64),
    created_at: createdAt,
    kind: 9735,
    tags: [
      ["e", "a".repeat(64)],
      ["bolt11", "dummy"],
    ],
    content: "",
    sig: "e".repeat(64),
  };
}

const AMOUNTS = new Map<string, bigint | null>([
  ["r1", 1000n],
  ["r2", 2000n],
  ["r3", null],
]);

describe("validateZapReceipt", () => {
  const SIGNER_SECRET = "1".repeat(64);
  const SENDER_SECRET = "2".repeat(64);
  const signer = derivePublicKey(SIGNER_SECRET) ?? "";
  const sender = derivePublicKey(SENDER_SECRET) ?? "";
  const recipient = "b".repeat(64);
  const goal = "a".repeat(64);
  // lnbc10u = 1,000,000 msats
  const INVOICE = "lnbc10u1abcdef";

  function validReceipt(): NostrEventLike | null {
    const draft = buildZapRequest({
      senderPubkey: sender,
      recipientPubkey: recipient,
      goalId: goal,
      amountMsats: 1000000n,
      relays: ["wss://x"],
      lnurl: "lnurl1test",
    });
    if (draft === null) return null;
    const request = signEvent(draft, SENDER_SECRET);
    if (request === null) return null;
    return signEvent(
      {
        pubkey: signer,
        created_at: 100,
        kind: 9735,
        tags: [
          ["p", recipient],
          ["P", sender],
          ["e", goal],
          ["bolt11", INVOICE],
          ["description", JSON.stringify(request)],
        ],
        content: "",
      },
      SIGNER_SECRET,
    );
  }

  const amountOf = (tags: string[][]): bigint | null =>
    tags.find((t) => t[0] === "bolt11")?.[1] === INVOICE ? 1000000n : null;
  const ctx = { goalId: goal, expectedSigner: signer, expectedLnurl: "lnurl1test" };

  it("accepts a well-formed receipt", () => {
    const receipt = validReceipt();
    expect(receipt).not.toBeNull();
    expect(validateZapReceipt(receipt ?? ({} as NostrEventLike), ctx, amountOf)).toEqual([]);
  });
  it("rejects wrong signer, tampered amount, late and bad sig", () => {
    const receipt = validReceipt();
    if (receipt === null) throw new Error("unreachable");
    expect(
      validateZapReceipt(receipt, { ...ctx, expectedSigner: "f".repeat(64) }, amountOf),
    ).toContain("unexpected signer");
    expect(validateZapReceipt(receipt, { ...ctx, closedAt: 50 }, amountOf)).toContain(
      "after closed_at",
    );
    expect(
      validateZapReceipt({ ...receipt, sig: "0".repeat(128) }, ctx, amountOf),
    ).toContain("invalid signature");
    expect(validateZapReceipt({ ...receipt, kind: 1 }, ctx, amountOf)).toContain(
      "kind must be 9735",
    );
  });
});
describe("tallyZaps", () => {
  it("sums valid receipts and skips others", () => {
    const events = [
      receipt("r1", 100),
      receipt("r2", 200),
      receipt("r3", 300),
      { ...receipt("r4", 400), kind: 1 },
    ];
    const tally = tallyZaps(events, "a".repeat(64), undefined, (ev) => AMOUNTS.get(ev.id) ?? 500n);
    expect(tally).toEqual({ totalMsats: 3500n, count: 3 });
  });
  it("excludes receipts after closed_at", () => {
    const events = [receipt("r1", 100), receipt("r2", 200)];
    const tally = tallyZaps(events, "a".repeat(64), 150, (ev) => AMOUNTS.get(ev.id) ?? null);
    expect(tally).toEqual({ totalMsats: 1000n, count: 1 });
  });
});
