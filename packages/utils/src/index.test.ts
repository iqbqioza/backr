import { describe, expect, it } from "vitest";
import { countdownLabel, formatSats, formatSatsBtc, meterWidthPercent, msatsToSatsString, progressPercent, remainingLabel, timeAgo } from "./index";

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

describe("formatSatsBtc", () => {
  it("formats whole and fractional BTC", () => {
    expect(formatSatsBtc(100000000000n)).toBe("1 BTC");
    expect(formatSatsBtc(21000000n)).toBe("0.00021 BTC");
    expect(formatSatsBtc(1500n)).toBe("0.00000001 BTC");
    expect(formatSatsBtc(0n)).toBe("0 BTC");
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

describe("countdownLabel", () => {
  it("ends at deadline", () => {
    expect(countdownLabel(100, 100)).toBe("Closed");
    expect(countdownLabel(101, 100)).toBe("Closed");
  });
  it("counts down to seconds", () => {
    expect(countdownLabel(0, 5)).toBe("5s left");
    expect(countdownLabel(0, 90)).toBe("1m 30s left");
    expect(countdownLabel(0, 3661)).toBe("1h 1m 1s left");
    expect(countdownLabel(0, 90061)).toBe("1d 1h 1m 1s left");
    expect(countdownLabel(0, 86400)).toBe("1d 0h 0m 0s left");
  });
});

describe("meterWidthPercent", () => {
  it("is zero without progress", () => {
    expect(meterWidthPercent(0n, 1000n)).toBe(0);
    expect(meterWidthPercent(100n, 0n)).toBe(0);
  });
  it("guarantees minimum visibility", () => {
    expect(meterWidthPercent(21000n, 10000000n)).toBe(2);
    expect(meterWidthPercent(500n, 1000n)).toBe(50);
  });
  it("caps at 100", () => {
    expect(meterWidthPercent(3000n, 1000n)).toBe(100);
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
