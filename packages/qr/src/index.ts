import encodeQR from "qr";

/**
 * BOLT11 invoice -> QR SVG markup string.
 *
 * The invoice is upper-cased before encoding: BOLT11 is bech32
 * (case-insensitive, wallets accept upper-case) and upper-case text
 * encodes in alphanumeric mode, producing a smaller, easier-to-scan code.
 * The original invoice string (for copy/paste) is left untouched;
 * only the QR payload is normalized.
 */
export function invoiceToQrSvg(invoice: string): string {
  const normalized = invoice.trim();
  if (normalized.length === 0) throw new Error("empty invoice");
  if (/\s/.test(normalized)) throw new Error("invalid invoice");
  return encodeQR(normalized.toUpperCase(), "svg", { ecc: "medium" });
}
