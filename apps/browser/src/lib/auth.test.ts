import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canSign,
  getSession,
  loginNsec,
  loginReadonly,
  logout,
  resolvePubkeyInput,
  resolveSecret,
  restoreSession,
  signWithSession,
  type Session,
} from "./auth";

const NSEC = "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5";
const SECRET_HEX = "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa";
const NPUB = "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg";
const PUBKEY_HEX = "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e";

afterEach(() => {
  vi.unstubAllGlobals();
  logout();
});

describe("resolveSecret", () => {
  it("decodes nsec vector", () => {
    expect(resolveSecret(NSEC)?.secretHex).toBe(SECRET_HEX);
    expect(resolveSecret(NSEC)?.pubkey).toMatch(/^[0-9a-f]{64}$/);
  });
  it("accepts raw hex secret", () => {
    expect(resolveSecret(SECRET_HEX)?.secretHex).toBe(SECRET_HEX);
  });
  it("rejects garbage", () => {
    expect(resolveSecret("hello")).toBeNull();
    expect(resolveSecret(NPUB)).toBeNull();
  });
});

describe("resolvePubkeyInput", () => {
  it("decodes npub vector", () => {
    expect(resolvePubkeyInput(NPUB)).toBe(PUBKEY_HEX);
  });
  it("accepts raw hex pubkey and rejects garbage", () => {
    expect(resolvePubkeyInput(PUBKEY_HEX)).toBe(PUBKEY_HEX);
    expect(resolvePubkeyInput("hello")).toBeNull();
    expect(resolvePubkeyInput(NSEC)).toBeNull();
  });
});

describe("session", () => {
  it("readonly cannot sign, logout clears", async () => {
    loginReadonly(PUBKEY_HEX);
    const s: Session | null = getSession();
    expect(s?.method).toBe("readonly");
    expect(canSign()).toBe(false);
    expect(
      await signWithSession({
        pubkey: PUBKEY_HEX,
        created_at: 1,
        kind: 1,
        tags: [],
        content: "x",
      }),
    ).toBeNull();
    logout();
    expect(getSession()).toBeNull();
  });
  it("nsec login signs", async () => {
    const info = resolveSecret(NSEC);
    expect(info).not.toBeNull();
    if (info === null) return;
    loginNsec(info.secretHex, info.pubkey);
    expect(canSign()).toBe(true);
    const signed = await signWithSession({
      pubkey: info.pubkey,
      created_at: 1700000000,
      kind: 1,
      tags: [],
      content: "hello",
    });
    expect(signed?.pubkey).toBe(info.pubkey);
    logout();
  });
});

describe("session persistence", () => {
  function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear: () => {
        data.clear();
      },
      getItem: (key: string) => data.get(key) ?? null,
      key: (index: number) => [...data.keys()][index] ?? null,
      removeItem: (key: string) => {
        data.delete(key);
      },
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
  }

  it("persists readonly login and restores it", () => {
    const store = memoryStorage();
    vi.stubGlobal("window", { localStorage: store });
    loginReadonly(PUBKEY_HEX);
    expect(store.getItem("backr:session")).toContain(PUBKEY_HEX);
    logout();
    expect(getSession()).toBeNull();
    store.setItem("backr:session", JSON.stringify({ method: "readonly", pubkey: PUBKEY_HEX }));
    restoreSession();
    expect(getSession()?.method).toBe("readonly");
    expect(getSession()?.pubkey).toBe(PUBKEY_HEX);
    expect(canSign()).toBe(false);
  });

  it("never restores nsec or bunker sessions", () => {
    const store = memoryStorage();
    vi.stubGlobal("window", { localStorage: store });
    store.setItem("backr:session", JSON.stringify({ method: "nsec", pubkey: PUBKEY_HEX }));
    restoreSession();
    expect(getSession()).toBeNull();
    store.setItem("backr:session", JSON.stringify({ method: "bunker", pubkey: PUBKEY_HEX }));
    restoreSession();
    expect(getSession()).toBeNull();
  });

  it("ignores corrupted entries and clears storage on logout", () => {
    const store = memoryStorage();
    vi.stubGlobal("window", { localStorage: store });
    store.setItem("backr:session", "not-json");
    restoreSession();
    expect(getSession()).toBeNull();
    loginReadonly(PUBKEY_HEX);
    logout();
    expect(store.getItem("backr:session")).toBeNull();
  });
});
