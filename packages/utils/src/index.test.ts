import { describe, expect, it } from "vitest";
import { formatSats, msatsToSatsString, progressPercent, remainingLabel } from "./index";

describe("msatsToSatsString", () => {
  it("formats exact sats", () => {
    expect(msatsToSatsString(1000000n)).toBe("1,000");
  });
  it("formats fractional sats", () => {
    expect(msatsToSatsString(1234567n)).toBe("1,234.567");
  });
  it("trims trailing zeros", () => {
    expect(msatsToSatsString(1500n)).toBe("1.5");
  });
  it("formats zero", () => {
    expect(msatsToSatsString(0n)).toBe("0");
  });
});

describe("formatSats", () => {
  it("appends unit", () => {
    expect(formatSats(21000000n)).toBe("21,000 sats");
  });
});

describe("progressPercent", () => {
  it("returns 0 for non-positive goal", () => {
    expect(progressPercent(100n, 0n)).toBe(0);
  });
  it("computes half", () => {
    expect(progressPercent(500n, 1000n)).toBe(50);
  });
  it("allows over 100", () => {
    expect(progressPercent(3000n, 1000n)).toBe(300);
  });
  it("rounds to one decimal", () => {
    expect(progressPercent(1n, 3n)).toBe(33.3);
  });
});

describe("remainingLabel", () => {
  it("ends at deadline", () => {
    expect(remainingLabel(100, 100)).toBe("終了");
    expect(remainingLabel(101, 100)).toBe("終了");
  });
  it("shows days/hours/minutes", () => {
    expect(remainingLabel(0, 86400 * 3)).toBe("残り3日");
    expect(remainingLabel(0, 7200)).toBe("残り2時間");
    expect(remainingLabel(0, 90)).toBe("残り1分");
  });
});
