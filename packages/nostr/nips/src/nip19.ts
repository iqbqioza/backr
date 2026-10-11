import { bytesToHex, hexToBytes } from "./hex";

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if (((b >> i) & 1) === 1) chk ^= GENERATOR[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

function verifyChecksum(prefix: string, data: number[]): boolean {
  return polymod([...hrpExpand(prefix), ...data]) === 1;
}

function createChecksum(prefix: string, data: number[]): number[] {
  const pm = polymod([...hrpExpand(prefix), ...data, 0, 0, 0, 0, 0, 0]) ^ 1;
  const out: number[] = [];
  for (let i = 0; i < 6; i++) out.push((pm >> (5 * (5 - i))) & 31);
  return out;
}

export interface Bech32Decoded {
  prefix: string;
  words: number[];
}

/** bech32 (非 bech32m) デコード。NIP-19 は 5000 文字上限 */
export function bech32Decode(input: string): Bech32Decoded | null {
  if (input.length < 8 || input.length > 5000) return null;
  const lower = input.toLowerCase();
  const upper = input.toUpperCase();
  if (input !== lower && input !== upper) return null;
  const s = lower;
  const pos = s.lastIndexOf("1");
  if (pos < 1 || pos > 83) return null;
  const dataPart = s.slice(pos + 1);
  if (dataPart.length < 6) return null;
  const data: number[] = [];
  for (const c of dataPart) {
    const d = CHARSET.indexOf(c);
    if (d < 0) return null;
    data.push(d);
  }
  const prefix = s.slice(0, pos);
  if (!verifyChecksum(prefix, data)) return null;
  return { prefix, words: data.slice(0, -6) };
}

export function bech32Encode(prefix: string, words: number[]): string {
  const checksum = createChecksum(prefix, words);
  return `${prefix}1${[...words, ...checksum].map((w) => CHARSET[w]).join("")}`;
}

export function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] | null {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const maxValue = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) return null;
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      out.push((acc >> bits) & maxValue);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (toBits - bits)) & maxValue);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxValue) !== 0) {
    return null;
  }
  return out;
}

function bytesToWords(bytes: Uint8Array): number[] | null {
  return convertBits([...bytes], 8, 5, true);
}

function wordsToBytes(words: number[]): Uint8Array | null {
  const out = convertBits(words, 5, 8, false);
  return out === null ? null : new Uint8Array(out);
}

/** npub / nsec / note のデコード (32 バイト hex 返却) */
export function decodeBare(bech: string, prefix: "npub" | "nsec" | "note"): string | null {
  const dec = bech32Decode(bech);
  if (dec === null || dec.prefix !== prefix) return null;
  const bytes = wordsToBytes(dec.words);
  if (bytes === null || bytes.length !== 32) return null;
  return bytesToHex(bytes);
}

/** npub / nsec / note のエンコード */
export function encodeBare(prefix: "npub" | "nsec" | "note", hex: string): string | null {
  const bytes = hexToBytes(hex);
  if (bytes === null || bytes.length !== 32) return null;
  const words = bytesToWords(bytes);
  if (words === null) return null;
  return bech32Encode(prefix, words);
}

interface Tlv {
  id?: Uint8Array;
  relays: string[];
  author?: Uint8Array;
  kindBytes?: Uint8Array;
}

function parseTlv(data: Uint8Array): Tlv | null {
  const tlv: Tlv = { relays: [] };
  let i = 0;
  const decoder = new TextDecoder();
  while (i + 2 <= data.length) {
    const t = data[i];
    const len = data[i + 1];
    if (i + 2 + len > data.length) return null;
    const value = data.slice(i + 2, i + 2 + len);
    // NIP-19: 未知の TLV は無視する
    if (t === 0 && tlv.id === undefined) tlv.id = value;
    else if (t === 1) {
      const relay = decoder.decode(value);
      if (relay.length > 0) tlv.relays.push(relay);
    } else if (t === 2 && tlv.author === undefined) tlv.author = value;
    else if (t === 3 && tlv.kindBytes === undefined) tlv.kindBytes = value;
    i += 2 + len;
  }
  return tlv;
}

export interface NeventData {
  id: string;
  relays: string[];
  author?: string;
  kind?: number;
}

export function decodeNevent(bech: string): NeventData | null {
  const dec = bech32Decode(bech);
  if (dec === null || dec.prefix !== "nevent") return null;
  const bytes = wordsToBytes(dec.words);
  if (bytes === null) return null;
  const tlv = parseTlv(bytes);
  if (tlv === null || tlv.id === undefined || tlv.id.length !== 32) return null;
  const out: NeventData = { id: bytesToHex(tlv.id), relays: tlv.relays };
  if (tlv.author !== undefined && tlv.author.length === 32) {
    out.author = bytesToHex(tlv.author);
  }
  if (tlv.kindBytes !== undefined && tlv.kindBytes.length === 4) {
    out.kind =
      tlv.kindBytes[0] * 16777216 +
      tlv.kindBytes[1] * 65536 +
      tlv.kindBytes[2] * 256 +
      tlv.kindBytes[3];
  }
  return out;
}

export function encodeNevent(data: {
  id: string;
  relays?: string[];
  author?: string;
  kind?: number;
}): string | null {
  const idBytes = hexToBytes(data.id);
  if (idBytes === null || idBytes.length !== 32) return null;
  const parts: number[] = [0, 32, ...idBytes];
  const encoder = new TextEncoder();
  for (const relay of data.relays ?? []) {
    const bytes = encoder.encode(relay);
    if (bytes.length === 0 || bytes.length > 255) return null;
    parts.push(1, bytes.length, ...bytes);
  }
  if (data.author !== undefined) {
    const authorBytes = hexToBytes(data.author);
    if (authorBytes === null || authorBytes.length !== 32) return null;
    parts.push(2, 32, ...authorBytes);
  }
  if (data.kind !== undefined) {
    if (!Number.isInteger(data.kind) || data.kind < 0 || data.kind > 4294967295) return null;
    parts.push(
      3,
      4,
      Math.floor(data.kind / 16777216) % 256,
      Math.floor(data.kind / 65536) % 256,
      Math.floor(data.kind / 256) % 256,
      data.kind % 256,
    );
  }
  const words = convertBits(parts, 8, 5, true);
  if (words === null) return null;
  return bech32Encode("nevent", words);
}

export interface NprofileData {
  pubkey: string;
  relays: string[];
}

export function decodeNprofile(bech: string): NprofileData | null {
  const dec = bech32Decode(bech);
  if (dec === null || dec.prefix !== "nprofile") return null;
  const bytes = wordsToBytes(dec.words);
  if (bytes === null) return null;
  const tlv = parseTlv(bytes);
  if (tlv === null || tlv.id === undefined || tlv.id.length !== 32) return null;
  return { pubkey: bytesToHex(tlv.id), relays: tlv.relays };
}
