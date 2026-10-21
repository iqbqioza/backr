import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canSign,
  getSession,
  getUserRelays,
  loginNip07,
  logout,
  restoreSession,
  signWithSession,
} from "./auth";
import { derivePublicKey, signEvent } from "backr-nostr-nips";

const SECRET_HEX = "0".repeat(63) + "1";
const PUBKEY_HEX = derivePublicKey(SECRET_HEX) as string;

afterEach(() => {
  vi.unstubAllGlobals();
  logout();
});

describe("session", () => {
  it("nip07 login signs and logout clears", async () => {
    loginNip07(PUBKEY_HEX);
    expect(getSession()?.method).toBe("nip07");
    expect(canSign()).toBe(true);
    logout();
    expect(getSession()).toBeNull();
    expect(canSign()).toBe(false);
  });

  it("returns null without a signer", async () => {
    expect(
      await signWithSession({
        pubkey: PUBKEY_HEX,
        created_at: 1,
        kind: 1,
        tags: [],
        content: "x",
      }),
    ).toBeNull();
  });

  it("signs through the extension", async () => {
    // The extension's output is signature-verified before publishing, so the
    // fixture must be a genuinely signed event, not a fabricated one.
    const signed = signEvent(
      { pubkey: PUBKEY_HEX, created_at: 1, kind: 1, tags: [], content: "hello" },
      SECRET_HEX,
    );
    expect(signed).not.toBeNull();
    vi.stubGlobal("window", {
      nostr: {
        getPublicKey: async () => PUBKEY_HEX,
        signEvent: async () => signed,
      },
    });
    loginNip07(PUBKEY_HEX);
    const result = await signWithSession({
      pubkey: PUBKEY_HEX,
      created_at: 1,
      kind: 1,
      tags: [],
      content: "hello",
    });
    expect(result?.pubkey).toBe(PUBKEY_HEX);
  });

  it("rejects extension output whose signature does not verify", async () => {
    const signed = signEvent(
      { pubkey: PUBKEY_HEX, created_at: 1, kind: 1, tags: [], content: "hello" },
      SECRET_HEX,
    );
    vi.stubGlobal("window", {
      nostr: {
        getPublicKey: async () => PUBKEY_HEX,
        // Tampered content: signature no longer matches.
        signEvent: async () => ({ ...signed, content: "tampered" }),
      },
    });
    loginNip07(PUBKEY_HEX);
    const result = await signWithSession({
      pubkey: PUBKEY_HEX,
      created_at: 1,
      kind: 1,
      tags: [],
      content: "hello",
    });
    expect(result).toBeNull();
  });
});

describe("user relays", () => {
  it("defaults to empty and clears on logout", () => {
    expect(getUserRelays()).toEqual({ read: [], write: [] });
    loginNip07(PUBKEY_HEX);
    logout();
    expect(getUserRelays()).toEqual({ read: [], write: [] });
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

  it("persists nip07 login and restores it", () => {
    const store = memoryStorage();
    vi.stubGlobal("window", { localStorage: store });
    loginNip07(PUBKEY_HEX);
    expect(store.getItem("backr:session")).toContain(PUBKEY_HEX);
    logout();
    expect(getSession()).toBeNull();
    store.setItem("backr:session", JSON.stringify({ method: "nip07", pubkey: PUBKEY_HEX }));
    restoreSession();
    expect(getSession()?.method).toBe("nip07");
    expect(getSession()?.pubkey).toBe(PUBKEY_HEX);
  });

  it("never restores bunker sessions", () => {
    const store = memoryStorage();
    vi.stubGlobal("window", { localStorage: store });
    store.setItem("backr:session", JSON.stringify({ method: "bunker", pubkey: PUBKEY_HEX }));
    restoreSession();
    expect(getSession()).toBeNull();
    store.setItem("backr:session", JSON.stringify({ method: "readonly", pubkey: PUBKEY_HEX }));
    restoreSession();
    expect(getSession()).toBeNull();
  });

  it("ignores corrupted entries and clears storage on logout", () => {
    const store = memoryStorage();
    vi.stubGlobal("window", { localStorage: store });
    store.setItem("backr:session", "not-json");
    restoreSession();
    expect(getSession()).toBeNull();
    loginNip07(PUBKEY_HEX);
    logout();
    expect(store.getItem("backr:session")).toBeNull();
  });
});
