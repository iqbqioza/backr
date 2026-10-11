import { describe, expect, it } from "vitest";
import {
  computeEventId,
  derivePublicKey,
  generateSecretKey,
  signEvent,
  verifyEventSignature,
  type UnsignedEvent,
} from "./crypto";

const SECRET_ONE = "0".repeat(63) + "1";
// secp256k1 生成点 G の x 座標 (秘密鍵 1 に対する公開鍵)
const PUBKEY_ONE = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";

const DRAFT: UnsignedEvent = {
  pubkey: PUBKEY_ONE,
  created_at: 1700000000,
  kind: 9041,
  tags: [
    ["relays", "wss://relay.nostrfy.org"],
    ["amount", "1000000"],
  ],
  content: "test goal",
};

describe("derivePublicKey", () => {
  it("derives generator point for secret 1", () => {
    expect(derivePublicKey(SECRET_ONE)).toBe(PUBKEY_ONE);
  });
  it("rejects garbage", () => {
    expect(derivePublicKey("zz")).toBeNull();
    expect(derivePublicKey("0".repeat(64))).toBeNull();
  });
});

describe("generateSecretKey", () => {
  it("generates distinct valid secrets", () => {
    const a = generateSecretKey();
    const b = generateSecretKey();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(derivePublicKey(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("signEvent/verifyEventSignature", () => {
  it("roundtrips", () => {
    const signed = signEvent(DRAFT, SECRET_ONE);
    expect(signed).not.toBeNull();
    if (signed === null) return;
    expect(signed.id).toBe(computeEventId(DRAFT));
    expect(verifyEventSignature(signed)).toBe(true);
  });
  it("rejects tampered content", () => {
    const signed = signEvent(DRAFT, SECRET_ONE);
    expect(signed).not.toBeNull();
    if (signed === null) return;
    expect(verifyEventSignature({ ...signed, content: "forged" })).toBe(false);
  });
  it("rejects bad drafts", () => {
    expect(signEvent({ ...DRAFT, pubkey: "zz" }, SECRET_ONE)).toBeNull();
    expect(signEvent(DRAFT, "zz")).toBeNull();
  });
});
