const MSATS_PER_BTC = 100000000000n;
const MSATS_PER_MBTC = 100000000n;
const MSATS_PER_UBTC = 100000n;
const MSATS_PER_NBTC = 100n;

/**
 * bolt11 インボイスの HRP 金額部から millisats を求める。
 * 署名検証はしない (集計用)。金額なし・端数 (pico で割り切れない) は null。
 */
export function decodeBolt11AmountMsats(invoice: string): bigint | null {
  if (invoice.length === 0 || invoice.length > 10000) return null;
  const lower = invoice.toLowerCase();
  const upper = invoice.toUpperCase();
  if (invoice !== lower && invoice !== upper) return null;
  const s = lower;
  if (!s.startsWith("ln")) return null;
  const sep = s.lastIndexOf("1");
  if (sep < 4 || sep === s.length - 1) return null;
  const hrp = s.slice(2, sep);
  const match = /^(bc|tb|bcrt|sb)(\d+)([munp])?$/.exec(hrp);
  if (match === null) return null;
  const digits = match[2];
  const suffix = match[3] ?? "";
  let value: bigint;
  try {
    value = BigInt(digits);
  } catch {
    return null;
  }
  if (suffix === "p") {
    // 1 pico-BTC = 0.1 msats。割り切れない額は msats で表せない
    if (value % 10n !== 0n) return null;
    return value / 10n;
  }
  const per =
    suffix === "m"
      ? MSATS_PER_MBTC
      : suffix === "u"
        ? MSATS_PER_UBTC
        : suffix === "n"
          ? MSATS_PER_NBTC
          : MSATS_PER_BTC;
  return value * per;
}

/** zap receipt の bolt11 タグ金額。なければ null */
export function bolt11TagAmountMsats(tags: string[][]): bigint | null {
  const tag = tags.find((t) => t[0] === "bolt11");
  if (tag === undefined) return null;
  return decodeBolt11AmountMsats(tag[1] ?? "");
}
