import { chacha20 } from "@noble/ciphers/chacha.js";
import { hmac } from "@noble/hashes/hmac.js";
import { expand, extract } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { Point } from "@noble/secp256k1";
import { bytesToHex, hexToBytes } from "./hex";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** secp256k1 体の素数 */
const FIELD_P = 2n ** 256n - 2n ** 32n - 977n;
/** secp256k1 位数 */
const CURVE_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64Encode(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + "=";
  }
  return out;
}

export function base64Decode(input: string): Uint8Array | null {
  if (input.length === 0 || input.length % 4 !== 0) return null;
  const table = new Map<string, number>();
  for (let i = 0; i < 64; i++) table.set(B64[i], i);
  let padding = 0;
  if (input.endsWith("==")) padding = 2;
  else if (input.endsWith("=")) padding = 1;
  const out: number[] = [];
  for (let i = 0; i < input.length; i += 4) {
    const chars = [input[i], input[i + 1], input[i + 2], input[i + 3]];
    const last = i + 4 === input.length ? 4 - padding : 4;
    if (last < 2) return null;
    let n = 0;
    for (let j = 0; j < 4; j++) {
      if (j >= last) {
        if (chars[j] !== "=") return null;
        continue;
      }
      const v = table.get(chars[j]);
      if (v === undefined) return null;
      n = (n << 6) | v;
    }
    if (last === 4) {
      out.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
    } else if (last === 3) {
      out.push((n >> 10) & 255, (n >> 2) & 255);
    } else {
      out.push((n >> 4) & 255);
    }
  }
  return new Uint8Array(out);
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e % 2n === 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e = e / 2n;
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(`0x${bytesToHex(bytes)}`);
}

/**
 * BIP-340 lift_x 相当: x-only 公開鍵を持ち上げる。
 * 曲線外なら null。
 */
function liftX(xBytes: Uint8Array): Point | null {
  const x = bytesToBigInt(xBytes);
  if (x >= FIELD_P) return null;
  const y2 = (x * x * x + 7n) % FIELD_P;
  let y = modPow(y2, (FIELD_P + 1n) / 4n, FIELD_P);
  if ((y * y) % FIELD_P !== y2) return null;
  if (y % 2n === 1n) y = FIELD_P - y;
  const hex = `04${x.toString(16).padStart(64, "0")}${y.toString(16).padStart(64, "0")}`;
  try {
    return Point.fromHex(hex);
  } catch {
    return null;
  }
}

/** ECDH (非ハッシュ x 座標)。NIP-44 用 */
export function ecdhXOnly(secretHex: string, pubkeyHex: string): Uint8Array | null {
  const secret = hexToBytes(secretHex);
  const pub = hexToBytes(pubkeyHex);
  if (secret === null || pub === null || secret.length !== 32 || pub.length !== 32) return null;
  const scalar = bytesToBigInt(secret);
  if (scalar <= 0n || scalar >= CURVE_N) return null;
  const point = liftX(pub);
  if (point === null) return null;
  try {
    return point.multiply(scalar).toBytes(true).slice(1);
  } catch {
    return null;
  }
}

/** NIP-44 会話鍵 (hex)。役割交換で同一 */
export function conversationKey(secretHex: string, pubkeyHex: string): string | null {
  const shared = ecdhXOnly(secretHex, pubkeyHex);
  if (shared === null) return null;
  return bytesToHex(extract(sha256, shared, textEncoder.encode("nip44-v2")));
}

export function calcPaddedLen(unpaddedLen: number): number {
  if (!Number.isInteger(unpaddedLen) || unpaddedLen < 1) return 32;
  const nextPower = 2 ** (Math.floor(Math.log2(unpaddedLen - 1)) + 1);
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  if (unpaddedLen <= 32) return 32;
  return chunk * (Math.floor((unpaddedLen - 1) / chunk) + 1);
}

function padPlaintext(plaintext: string): Uint8Array | null {
  const bytes = textEncoder.encode(plaintext);
  const len = bytes.length;
  if (len < 1 || len > 4294967295) return null;
  let prefix: Uint8Array;
  if (len >= 65536) {
    prefix = new Uint8Array(6);
    new DataView(prefix.buffer).setUint32(2, len);
  } else {
    prefix = new Uint8Array(2);
    new DataView(prefix.buffer).setUint16(0, len);
  }
  const paddedLen = calcPaddedLen(len);
  const out = new Uint8Array(prefix.length + paddedLen);
  out.set(prefix, 0);
  out.set(bytes, prefix.length);
  return out;
}

function unpadPlaintext(padded: Uint8Array): string | null {
  if (padded.length < 2) return null;
  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  const firstTwo = view.getUint16(0);
  let unpaddedLen: number;
  let prefixLen: number;
  if (firstTwo === 0) {
    if (padded.length < 6) return null;
    unpaddedLen = view.getUint32(2);
    if (unpaddedLen < 65536) return null;
    prefixLen = 6;
  } else {
    unpaddedLen = firstTwo;
    prefixLen = 2;
  }
  if (unpaddedLen === 0) return null;
  if (padded.length !== prefixLen + calcPaddedLen(unpaddedLen)) return null;
  try {
    return textDecoder.decode(padded.slice(prefixLen, prefixLen + unpaddedLen));
  } catch {
    return null;
  }
}

function messageKeys(conversationKeyBytes: Uint8Array, nonce: Uint8Array): Uint8Array | null {
  if (conversationKeyBytes.length !== 32 || nonce.length !== 32) return null;
  return expand(sha256, conversationKeyBytes, nonce, 76);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** NIP-44 v2 暗号化。nonce 省略時は CSPRNG */
export function nip44Encrypt(
  plaintext: string,
  conversationKeyHex: string,
  nonceHex?: string,
): string | null {
  const keyBytes = hexToBytes(conversationKeyHex);
  if (keyBytes === null || keyBytes.length !== 32) return null;
  let nonce: Uint8Array;
  if (nonceHex === undefined) {
    nonce = randomBytes(32);
  } else {
    const parsed = hexToBytes(nonceHex);
    if (parsed === null || parsed.length !== 32) return null;
    nonce = parsed;
  }
  const keys = messageKeys(keyBytes, nonce);
  if (keys === null) return null;
  const padded = padPlaintext(plaintext);
  if (padded === null) return null;
  const ciphertext = chacha20(keys.slice(0, 32), keys.slice(32, 44), padded);
  const mac = hmac(sha256, keys.slice(44, 76), concatBytes(nonce, ciphertext));
  return base64Encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac));
}

/** NIP-44 v2 復号。失敗は null */
export function nip44Decrypt(payload: string, conversationKeyHex: string): string | null {
  if (payload.length === 0 || payload[0] === "#" || payload.length < 132) return null;
  const data = base64Decode(payload);
  if (data === null || data.length < 99 || data[0] !== 2) return null;
  const keyBytes = hexToBytes(conversationKeyHex);
  if (keyBytes === null || keyBytes.length !== 32) return null;
  const nonce = data.slice(1, 33);
  const ciphertext = data.slice(33, data.length - 32);
  const mac = data.slice(data.length - 32);
  const keys = messageKeys(keyBytes, nonce);
  if (keys === null) return null;
  const expected = hmac(sha256, keys.slice(44, 76), concatBytes(nonce, ciphertext));
  if (!timingSafeEqual(expected, mac)) return null;
  const padded = chacha20(keys.slice(0, 32), keys.slice(32, 44), ciphertext);
  return unpadPlaintext(padded);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
