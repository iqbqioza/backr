import { describe, expect, it } from "vitest";
import { invoiceToQrSvg } from "./index";

const SAMPLE = `lnbc210n1p${"a".repeat(200)}`;

describe("invoiceToQrSvg", () => {
  it("returns svg markup", () => {
    const svg = invoiceToQrSvg(SAMPLE);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
  it("normalizes case for denser encoding", () => {
    expect(invoiceToQrSvg(SAMPLE)).toBe(invoiceToQrSvg(SAMPLE.toUpperCase()));
  });
  it("rejects empty or whitespace-containing input", () => {
    expect(() => invoiceToQrSvg("")).toThrow("empty invoice");
    expect(() => invoiceToQrSvg("   ")).toThrow("empty invoice");
    expect(() => invoiceToQrSvg("lnbc1 abc")).toThrow("invalid invoice");
  });
});
