import { describe, expect, it } from "vitest";
import { decodeLud06, encodeLud06, lud16ToPayUrl } from "./lnurl";

describe("lud16ToPayUrl", () => {
  it("builds well-known url", () => {
    expect(lud16ToPayUrl("alice@example.com")).toBe("https://example.com/.well-known/lnurlp/alice");
  });
  it("rejects garbage", () => {
    expect(lud16ToPayUrl("alice")).toBeNull();
    expect(lud16ToPayUrl("a@b@c")).toBeNull();
    expect(lud16ToPayUrl("@example.com")).toBeNull();
    expect(lud16ToPayUrl("")).toBeNull();
  });
});

describe("lud06 roundtrip", () => {
  it("encodes and decodes", () => {
    const url = "https://example.com/.well-known/lnurlp/alice";
    const lnurl = encodeLud06(url);
    expect(lnurl?.startsWith("lnurl1")).toBe(true);
    expect(lnurl === null ? null : decodeLud06(lnurl)).toBe(url);
  });
  it("decodes NIP-57 example prefix", () => {
    const url = decodeLud06(
      "lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wahz7mrww4excup0dajx2mrv92x9xp",
    );
    expect(url?.startsWith("https://")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(decodeLud06("not-a-lnurl")).toBeNull();
    expect(encodeLud06("gopher://example.com")).toBeNull();
  });
});
