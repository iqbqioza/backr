import { buildDeletionEvent } from "backr-nostr-nips";
import { getSession, getUserRelays, signWithSession } from "./auth";
import { DEFAULT_RELAY } from "./const";
import { publishEventMulti } from "./relay";

/** 自分のイベントの削除要求 (NIP-09 kind:5) を署名・公開する */
export async function requestDeletion(
  relayUrl: string,
  eventIds: string[],
  reason = "",
): Promise<void> {
  const session = getSession();
  if (session === null) {
    throw new Error("Signing required to delete");
  }
  const draft = buildDeletionEvent({
    pubkey: session.pubkey,
    eventIds,
    relayHint: relayUrl,
    reason,
  });
  if (draft === null) throw new Error("Could not build deletion event");
  const signed = await signWithSession(draft);
  if (signed === null) throw new Error("Signing failed");
  const result = await publishEventMulti(
    [...new Set([relayUrl, DEFAULT_RELAY, ...getUserRelays().write.slice(0, 3)])],
    signed,
  );
  if (!result.accepted) throw new Error(`Relay rejected: ${result.message}`);
}
