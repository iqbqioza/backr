import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkAmountRange,
  fetchLnurlPay,
  requestZapInvoice,
  resolvePayTarget,
} from "./zap";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200 });
}

describe("resolvePayTarget", () => {
  it("prefers lud16", () => {
    const target = resolvePayTarget({
      pubkey: "a".repeat(64),
      name: "alice",
      lud16: "alice@example.com",
    });
    expect(target?.payUrl).toBe("https://example.com/.well-known/lnurlp/alice");
    expect(target?.lnurl.startsWith("lnurl1")).toBe(true);
  });
  it("returns null without lightning address", () => {
    expect(resolvePayTarget({ pubkey: "a".repeat(64), name: "x" })).toBeNull();
    expect(resolvePayTarget(null)).toBeNull();
  });
});

describe("fetchLnurlPay", () => {
  it("parses payRequest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          tag: "payRequest",
          callback: "https://example.com/cb",
          minSendable: 1000,
          maxSendable: 1000000,
          allowsNostr: true,
          nostrPubkey: "a".repeat(64),
        }),
      ),
    );
    const info = await fetchLnurlPay("https://example.com/.well-known/lnurlp/alice");
    expect(info.callback).toBe("https://example.com/cb");
    expect(checkAmountRange(5000n, info)).toBeNull();
    expect(checkAmountRange(1n, info)).toContain("Minimum");
    expect(checkAmountRange(2000000n, info)).toContain("Maximum");
  });
  it("rejects non-zap wallets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ tag: "payRequest", callback: "https://example.com/cb", minSendable: 1, maxSendable: 2, allowsNostr: false, nostrPubkey: "a".repeat(64) }),
      ),
    );
    await expect(fetchLnurlPay("https://example.com/x")).rejects.toThrow("does not support zaps");
  });
  it("rejects missing nostrPubkey", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ tag: "payRequest", callback: "https://example.com/cb", minSendable: 1, maxSendable: 2, allowsNostr: true }),
      ),
    );
    await expect(fetchLnurlPay("https://example.com/x")).rejects.toThrow("nostrPubkey");
  });
});

describe("requestZapInvoice", () => {
  const zapRequest = {
    id: "a".repeat(64),
    pubkey: "b".repeat(64),
    created_at: 1,
    kind: 9734,
    tags: [],
    content: "",
    sig: "c".repeat(128),
  };
  it("returns invoice with matching amount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ pr: "lnbc10u1abcdef" })));
    const pr = await requestZapInvoice("https://example.com/cb", 1000000n, zapRequest, "lnurl1test");
    expect(pr).toBe("lnbc10u1abcdef");
  });
  it("rejects amount mismatch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ pr: "lnbc10u1abcdef" })));
    await expect(requestZapInvoice("https://example.com/cb", 999n, zapRequest, "lnurl1test")).rejects.toThrow(
      "does not match",
    );
  });
});
