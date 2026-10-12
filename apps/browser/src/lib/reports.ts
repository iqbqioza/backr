import { buildReport, randomHex } from "backr-nostr-nips";
import { getSession, signWithSession } from "./auth";
import { dedupeReports, type ReportData } from "./goals";
import { publishEvent } from "./relay";

async function publishReport(args: {
  relayUrl: string;
  goalId: string;
  identifier: string;
  title: string;
  summary?: string;
  content: string;
}): Promise<ReportData> {
  const session = getSession();
  if (session === null || session.method === "readonly") {
    throw new Error("Signing required to post an update");
  }
  const draft = buildReport({
    authorPubkey: session.pubkey,
    goalId: args.goalId,
    relayHint: args.relayUrl,
    identifier: args.identifier,
    title: args.title,
    summary: args.summary,
    content: args.content,
  });
  if (draft === null) throw new Error("Could not build update");
  const signed = await signWithSession(draft);
  if (signed === null) throw new Error("Signing failed");
  const result = await publishEvent(args.relayUrl, signed);
  if (!result.accepted) throw new Error(`Relay rejected: ${result.message}`);
  return {
    id: signed.id,
    author: session.pubkey,
    identifier: args.identifier,
    title: args.title,
    createdAt: signed.created_at,
    content: args.content,
  };
}

/** 新規報告を署名・公開する */
export function postReport(args: {
  relayUrl: string;
  goalId: string;
  title: string;
  summary?: string;
  content: string;
}): Promise<ReportData> {
  return publishReport({
    relayUrl: args.relayUrl,
    goalId: args.goalId,
    identifier: `backr-${randomHex(8)}`,
    title: args.title,
    summary: args.summary,
    content: args.content,
  });
}

/** 同一 identifier で上書き公開する (NIP-23 編集) */
export function updateReport(args: {
  relayUrl: string;
  goalId: string;
  identifier: string;
  title: string;
  content: string;
}): Promise<ReportData> {
  return publishReport(args);
}

export function mergeReports(current: ReportData[], incoming: ReportData[]): ReportData[] {
  return dedupeReports([...incoming, ...current]);
}
