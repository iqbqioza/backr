import { describe, expect, it } from "vitest";
import { derivePublicKey } from "./crypto";
import { conversationKey, nip44Decrypt, nip44Encrypt } from "./nip44";
import {
  buildConnectParams,
  buildRpcRequest,
  decryptRpcResponse,
  parseBunkerUrl,
} from "./nip46";

const REMOTE_SECRET = "11".repeat(32);
const CLIENT_SECRET = "22".repeat(32);

describe("parseBunkerUrl", () => {
  const pub = "a".repeat(64);
  it("parses relays and secret", () => {
    expect(parseBunkerUrl(`bunker://${pub}?relay=wss%3A%2F%2Fr.example&relay=wss%3A%2F%2Fs.example&secret=abc`)).toEqual({
      remotePubkey: pub,
      relays: ["wss://r.example", "wss://s.example"],
      secret: "abc",
    });
  });
  it("rejects bad urls", () => {
    expect(parseBunkerUrl(`nostrconnect://${pub}?relay=wss://r.example`)).toBeNull();
    expect(parseBunkerUrl(`bunker://zz?relay=wss://r.example`)).toBeNull();
    expect(parseBunkerUrl(`bunker://${pub}`)).toBeNull();
    expect(parseBunkerUrl(`bunker://${pub}?relay=https://r.example`)).toBeNull();
  });
});

describe("buildConnectParams", () => {
  it("omits trailing empties, keeps perms slot for metadata", () => {
    expect(buildConnectParams({ remotePubkey: "r" })).toEqual(["r"]);
    expect(buildConnectParams({ remotePubkey: "r", secret: "s" })).toEqual(["r", "s"]);
    expect(buildConnectParams({ remotePubkey: "r", metadata: "{}" })).toEqual(["r", "", "", "{}"]);
  });
});

describe("request/response envelope", () => {
  it("roundtrips between client and simulated remote", () => {
    const remotePub = derivePublicKey(REMOTE_SECRET) ?? "";
    const clientPub = derivePublicKey(CLIENT_SECRET) ?? "";
    const built = buildRpcRequest({
      clientSecretHex: CLIENT_SECRET,
      clientPubkeyHex: clientPub,
      remotePubkeyHex: remotePub,
      method: "connect",
      params: buildConnectParams({ remotePubkey: remotePub }),
      createdAt: 1700000000,
    });
    expect(built).not.toBeNull();
    if (built === null) return;
    expect(built.event.kind).toBe(24133);
    expect(built.event.tags).toEqual([["p", remotePub]]);
    // remote 側の復号
    const remoteConv = conversationKey(REMOTE_SECRET, clientPub) ?? "";
    const requestText = nip44Decrypt(built.event.content, remoteConv);
    expect(JSON.parse(requestText ?? "").method).toBe("connect");
    // remote 側の応答を client が復号
    const responsePayload = nip44Encrypt(
      JSON.stringify({ id: built.id, result: "ack" }),
      remoteConv,
    );
    expect(responsePayload).not.toBeNull();
    const response = decryptRpcResponse(responsePayload ?? "", CLIENT_SECRET, remotePub);
    expect(response).toEqual({ id: built.id, result: "ack" });
  });
});
