import { describe, expect, it } from "vitest";
import { derivePublicKey } from "./crypto";
import {
  base64Decode,
  base64Encode,
  calcPaddedLen,
  conversationKey,
  nip44Decrypt,
  nip44Encrypt,
} from "./nip44";

const SEC1 = "0000000000000000000000000000000000000000000000000000000000000001";
const SEC2 = "0000000000000000000000000000000000000000000000000000000000000002";
// NIP-44 公式ベクター
const CONV = "c41c775356fd92eadc63ff5a0dc1da211b268cbea22316767095b2871ea1412d";
const NONCE = "0000000000000000000000000000000000000000000000000000000000000001";
const PAYLOAD =
  "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABee0G5VSK0/9YypIObAtDKfYEAjD35uVkHyB0F4DwrcNaCXlCWZKaArsGrY6M9wnuTMxWfp1RTN9Xga8no+kF5Vsb";

describe("base64", () => {
  it("roundtrips RFC4648 vectors", () => {
    expect(base64Encode(new Uint8Array([102, 111, 111]))).toBe("Zm9v");
    expect(base64Encode(new Uint8Array([102, 111]))).toBe("Zm8=");
    expect(base64Decode("Zm8=")).toEqual(new Uint8Array([102, 111]));
    expect(base64Encode(new Uint8Array([102]))).toBe("Zg==");
    expect(base64Decode("Zm9v")).toEqual(new Uint8Array([102, 111, 111]));
    expect(base64Decode("Zg==")).toEqual(new Uint8Array([102]));
    expect(base64Decode("!!!")).toBeNull();
  });
});

describe("conversationKey (NIP-44 vector)", () => {
  it("matches official vector both ways", () => {
    const pub2 = derivePublicKey(SEC2);
    const pub1 = derivePublicKey(SEC1);
    expect(pub2).not.toBeNull();
    expect(conversationKey(SEC1, pub2 ?? "")).toBe(CONV);
    expect(conversationKey(SEC2, pub1 ?? "")).toBe(CONV);
  });
  it("rejects garbage", () => {
    expect(conversationKey("zz", "00".repeat(32))).toBeNull();
    expect(conversationKey(SEC1, "ff".repeat(32))).toBeNull();
  });
});

describe("calcPaddedLen", () => {
  it("matches spec buckets", () => {
    expect(calcPaddedLen(1)).toBe(32);
    expect(calcPaddedLen(32)).toBe(32);
    expect(calcPaddedLen(33)).toBe(64);
    expect(calcPaddedLen(65)).toBe(96);
    expect(calcPaddedLen(256)).toBe(256);
    expect(calcPaddedLen(257)).toBe(320);
    expect(calcPaddedLen(65535)).toBe(65536);
    expect(calcPaddedLen(65536)).toBe(65536);
    expect(calcPaddedLen(65537)).toBe(81920);
  });
});

describe("encrypt/decrypt (NIP-44 vector)", () => {
  it("reproduces official payload", () => {
    expect(nip44Encrypt("a", CONV, NONCE)).toBe(PAYLOAD);
  });
  it("roundtrips", () => {
    expect(nip44Decrypt(PAYLOAD, CONV)).toBe("a");
    const fresh = nip44Encrypt("hello world", CONV);
    expect(fresh).not.toBeNull();
    expect(fresh === null ? null : nip44Decrypt(fresh, CONV)).toBe("hello world");
  });
  it("rejects tampered and wrong-key payloads", () => {
    const tampered = `${PAYLOAD.slice(0, 10)}${PAYLOAD[10] === "A" ? "B" : "A"}${PAYLOAD.slice(11)}`;
    expect(nip44Decrypt(tampered, CONV)).toBeNull();
    expect(nip44Decrypt(PAYLOAD, "00".repeat(32))).toBeNull();
    expect(nip44Decrypt("short", CONV)).toBeNull();
    expect(nip44Encrypt("", CONV)).toBeNull();
  });
});
