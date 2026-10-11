import { describe, expect, it } from "vitest";
import { formatSats, msatsToSatsString, progressPercent, remainingLabel, timeAgo } from "./index";

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
    expect(remainingLabel(100, 100)).toBe("Closed");
    expect(remainingLabel(101, 100)).toBe("Closed");
  });
  it("shows days/hours/minutes", () => {
    expect(remainingLabel(0, 86400 * 3)).toBe("3d left");
    expect(remainingLabel(0, 7200)).toBe("2h left");
    expect(remainingLabel(0, 90)).toBe("1m left");
  });
});

describe("timeAgo", () => {
  it("formats relative time", () => {
    expect(timeAgo(100, 100)).toBe("just now");
    expect(timeAgo(100, 90)).toBe("just now");
    expect(timeAgo(200, 100)).toBe("1m ago");
    expect(timeAgo(3700, 100)).toBe("1h ago");
    expect(timeAgo(7300, 100)).toBe("2h ago");
    expect(timeAgo(86400 * 5, 0)).toBe("5d ago");
  });
});
