import { describe, expect, it } from "vitest";
import { bolt11TagAmountMsats, decodeBolt11AmountMsats } from "./bolt11";

describe("decodeBolt11AmountMsats", () => {
  it("decodes micro-bitcoin", () => {
    // 10u BTC = 1000 sats = 1,000,000 msats
    expect(decodeBolt11AmountMsats("lnbc10u1abcdef")).toBe(1000000n);
  });
  it("decodes milli-bitcoin", () => {
    // 1m BTC = 100,000 sats
    expect(decodeBolt11AmountMsats("lnbc1m1abcdef")).toBe(100000000n);
  });
  it("decodes nano-bitcoin", () => {
    // 500n BTC = 50 sats
    expect(decodeBolt11AmountMsats("lnbc500n1abcdef")).toBe(50000n);
  });
  it("decodes whole bitcoin", () => {
    expect(decodeBolt11AmountMsats("lnbc21pqrs")).toBe(200000000000n);
  });
  it("decodes divisible pico-bitcoin", () => {
    expect(decodeBolt11AmountMsats("lnbc1000000p1abcdef")).toBe(100000n);
  });
  it("accepts testnet and uppercase", () => {
    expect(decodeBolt11AmountMsats("lntb10u1abcdef")).toBe(1000000n);
    expect(decodeBolt11AmountMsats("LNBC10U1ABCDEF")).toBe(1000000n);
  });
  it("rejects amountless, fractional pico, mixed case, garbage", () => {
    expect(decodeBolt11AmountMsats("lnbc1abcdef")).toBeNull();
    expect(decodeBolt11AmountMsats("lnbc1p1abcdef")).toBeNull();
    expect(decodeBolt11AmountMsats("Lnbc10u1abcdef")).toBeNull();
    expect(decodeBolt11AmountMsats("not-an-invoice")).toBeNull();
    expect(decodeBolt11AmountMsats("")).toBeNull();
  });
});

describe("bolt11TagAmountMsats", () => {
  it("reads the bolt11 tag", () => {
    expect(bolt11TagAmountMsats([["bolt11", "lnbc10u1abcdef"]])).toBe(1000000n);
    expect(bolt11TagAmountMsats([["p", "abc"]])).toBeNull();
  });
});
