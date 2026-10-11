import { bech32Decode, bech32Encode, convertBits } from "./nip19";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** LUD-06: lnurl bech32 → payRequest URL */
export function decodeLud06(lnurl: string): string | null {
  const decoded = bech32Decode(lnurl.trim());
  if (decoded === null || decoded.prefix !== "lnurl") return null;
  const bytes = convertBits(decoded.words, 5, 8, false);
  if (bytes === null) return null;
  try {
    const url = textDecoder.decode(new Uint8Array(bytes));
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

/** payRequest URL → lnurl bech32 (LUD-16 解決後の lnurl パラメータ用) */
export function encodeLud06(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }
  const words = convertBits([...textEncoder.encode(url)], 8, 5, true);
  if (words === null) return null;
  return bech32Encode("lnurl", words);
}

/** LUD-16: user@domain → https://domain/.well-known/lnurlp/user */
export function lud16ToPayUrl(lud16: string): string | null {
  const trimmed = lud16.trim();
  const parts = trimmed.split("@");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) return null;
  if (parts[0].includes(" ") || parts[1].includes(" ") || parts[1].includes("@")) return null;
  try {
    const url = new URL(`https://${parts[1]}/.well-known/lnurlp/${parts[0]}`);
    return url.toString();
  } catch {
    return null;
  }
}
