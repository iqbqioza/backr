import { describe, expect, it } from "vitest";
import {
  bech32Decode,
  decodeBare,
  decodeNaddr,
  decodeNevent,
  decodeNprofile,
  encodeBare,
  encodeNaddr,
  encodeNevent,
} from "./nip19";

describe("nip19 bare keys (NIP-19 vectors)", () => {
  it("decodes npub vector", () => {
    expect(decodeBare("npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg", "npub")).toBe(
      "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
    );
  });
  it("roundtrips npub vector", () => {
    expect(
      encodeBare("npub", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"),
    ).toBe("npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6");
  });
  it("roundtrips nsec vector", () => {
    const hex = "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa";
    expect(decodeBare("nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5", "nsec")).toBe(
      hex,
    );
    expect(encodeBare("nsec", hex)).toBe(
      "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5",
    );
  });
  it("rejects wrong prefix and bad checksum", () => {
    expect(
      decodeBare("npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg", "nsec"),
    ).toBeNull();
    expect(
      decodeBare("npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptx", "npub"),
    ).toBeNull();
    expect(bech32Decode("npub1MixedCase8x8j9")).toBeNull();
  });
});

describe("nprofile TLV (NIP-19 vector)", () => {
  it("decodes pubkey and relays", () => {
    const decoded = decodeNprofile(
      "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p",
    );
    expect(decoded?.pubkey).toBe(
      "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    );
    expect(decoded?.relays).toEqual(["wss://r.x.com", "wss://djbas.sadkb.com"]);
  });
});

describe("nevent", () => {
  const id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const author = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  it("roundtrips id/author/kind/relays", () => {
    const encoded = encodeNevent({
      id,
      relays: ["wss://relay.nostrfy.org"],
      author,
      kind: 9041,
    });
    expect(encoded).not.toBeNull();
    expect(decodeNevent(encoded ?? "")).toEqual({
      id,
      relays: ["wss://relay.nostrfy.org"],
      author,
      kind: 9041,
    });
  });
  it("roundtrips id only", () => {
    const encoded = encodeNevent({ id });
    expect(decodeNevent(encoded ?? "")).toEqual({ id, relays: [] });
  });
  it("rejects missing id", () => {
    expect(decodeNevent("nevent1qqsqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toBeNull();
    expect(encodeNevent({ id: "zz" })).toBeNull();
  });
});

describe("naddr", () => {
  const author = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  it("roundtrips identifier/author/kind/relays", () => {
    const encoded = encodeNaddr({
      identifier: "backr-1",
      author,
      kind: 30023,
      relays: ["wss://relay.nostrfy.org"],
    });
    expect(encoded).not.toBeNull();
    expect(encoded?.startsWith("naddr1")).toBe(true);
    expect(decodeNaddr(encoded ?? "")).toEqual({
      identifier: "backr-1",
      author,
      kind: 30023,
      relays: ["wss://relay.nostrfy.org"],
    });
  });
  it("rejects bad identifier/author/kind", () => {
    expect(encodeNaddr({ identifier: "", author, kind: 30023 })).toBeNull();
    expect(encodeNaddr({ identifier: "x", author: "zz", kind: 30023 })).toBeNull();
    expect(encodeNaddr({ identifier: "x", author, kind: -1 })).toBeNull();
    expect(decodeNaddr("naddr1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toBeNull();
  });
});
