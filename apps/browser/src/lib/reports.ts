import { buildReport, randomHex } from "backr-nostr-nips";
import { getSession, signWithSession } from "./auth";
import type { ReportData } from "./goals";
import { publishEvent } from "./relay";

/** 活動報告 (kind:30023 + goal) を署名・公開する。署名ログイン必須 */
export async function postReport(args: {
  relayUrl: string;
  goalId: string;
  title: string;
  summary?: string;
  content: string;
}): Promise<ReportData> {
  const session = getSession();
  if (session === null || session.method === "readonly") {
    throw new Error("報告には署名ログインが必要です");
  }
  const draft = buildReport({
    authorPubkey: session.pubkey,
    goalId: args.goalId,
    relayHint: args.relayUrl,
    identifier: `backr-${randomHex(8)}`,
    title: args.title,
    summary: args.summary,
    content: args.content,
  });
  if (draft === null) throw new Error("報告を組み立てられません");
  const signed = await signWithSession(draft);
  if (signed === null) throw new Error("署名に失敗しました");
  const result = await publishEvent(args.relayUrl, signed);
  if (!result.accepted) throw new Error(`リレーに拒否されました: ${result.message}`);
  return { id: signed.id, title: args.title, createdAt: signed.created_at };
}
