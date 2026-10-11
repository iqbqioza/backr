import { randomBytes } from "@noble/hashes/utils.js";

export function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: ArrayLike<number>): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

/** CSPRNG のランダム hex (d タグ等の識別子用) */
export function randomHex(byteLength: number): string {
  if (!Number.isInteger(byteLength) || byteLength <= 0 || byteLength > 64) {
    throw new Error("invalid length");
  }
  return bytesToHex(randomBytes(byteLength));
}
