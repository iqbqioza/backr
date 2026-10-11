import { createSignal } from "solid-js";
import { formatSats } from "backr-utils";
import { canSign } from "../lib/auth";
import { DEFAULT_RELAY } from "../lib/const";
import type { ProfileView } from "../lib/goals";
import {
  checkAmountRange,
  fetchLnurlPay,
  requestZapInvoice,
  resolvePayTarget,
  resolvePayTargetFromLud06,
  signZapRequest,
} from "../lib/zap";

const PRESETS = [21, 210, 2100, 21000];

type Phase = "idle" | "working" | "invoice";

export default function ZapPanel(props: {
  goalId: string;
  recipientPubkey: string;
  profile: ProfileView | null;
  relays: string[];
  goalMsats: bigint;
  goalTitle: string;
  ended: boolean;
  onPaid: () => void;
}) {
  const [sats, setSats] = createSignal(210);
  const [custom, setCustom] = createSignal("");
  const [comment, setComment] = createSignal("");
  const [phase, setPhase] = createSignal<Phase>("idle");
  const [step, setStep] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [invoice, setInvoice] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);
  const [shared, setShared] = createSignal(false);

  const selected = () => {
    const parsed = Number(custom().trim());
    if (custom().trim().length > 0 && Number.isInteger(parsed) && parsed > 0) return parsed;
    return sats();
  };

  const onProceed = () => {
    if (!canSign()) {
      setError("支援にはログインが必要です (閲覧専用は不可)");
      return;
    }
    const target =
      resolvePayTarget(props.profile) ??
      (props.profile?.lud06 !== undefined
        ? resolvePayTargetFromLud06(props.profile.lud06)
        : null);
    if (target === null) {
      setError("作成者に送金先 (lud16/lud06) がありません");
      return;
    }
    const amountMsats = BigInt(selected()) * 1000n;
    setPhase("working");
    setError(null);
    setStep("送金先を確認しています…");
    fetchLnurlPay(target.payUrl)
      .then((info) => {
        const rangeError = checkAmountRange(amountMsats, info);
        if (rangeError !== null) throw new Error(rangeError);
        setStep("zap request に署名しています…");
        return signZapRequest({
          recipientPubkey: props.recipientPubkey,
          goalId: props.goalId,
          amountMsats,
          relays: props.relays.length > 0 ? props.relays : [DEFAULT_RELAY],
          lnurl: target.lnurl,
          comment: comment(),
        }).then((signed) => {
          setStep("インボイスを取得しています…");
          return requestZapInvoice(info.callback, amountMsats, signed.zapRequest, signed.lnurl);
        });
      })
      .then((pr) => {
        setInvoice(pr);
        setPhase("invoice");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "送金手続きに失敗しました");
        setPhase("idle");
      });
  };

  const onCopy = () => {
    const pr = invoice();
    if (pr === null) return;
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
      setError("コピーできません。インボイスを長押し等でコピーしてください");
      return;
    }
    navigator.clipboard
      .writeText(pr)
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        setError("コピーできませんでした");
      });
  };

  const onConfirmPaid = () => {
    props.onPaid();
    setPhase("idle");
    setInvoice(null);
    setCopied(false);
    setShared(false);
  };

  const onShare = () => {
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
      setError("コピーできませんでした");
      return;
    }
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `『${props.goalTitle}』に${formatSats(BigInt(selected()) * 1000n)}支援しました！ ${url}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setShared(true);
      })
      .catch(() => {
        setError("コピーできませんでした");
      });
  };

  return (
    <section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h2 class="font-semibold">このプロジェクトを支援する</h2>
      {props.ended ? (
        <p class="mt-2 text-sm text-zinc-400">
          募集は終了しました。集計後の支援はメーターに反映されません。
        </p>
      ) : phase() === "invoice" && invoice() !== null ? (
        <div>
          <p class="mt-2 text-sm text-zinc-300">
            {formatSats(BigInt(selected()) * 1000n)} のインボイスを発行しました。
            ウォレットで支払ってください。
          </p>
          <p class="mt-2 break-all rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {invoice()}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              class="rounded border border-zinc-600 px-3 py-1.5 text-sm hover:border-zinc-300"
            >
              {copied() ? "コピーしました" : "インボイスをコピー"}
            </button>
            <button
              type="button"
              onClick={onShare}
              class="rounded border border-zinc-600 px-3 py-1.5 text-sm hover:border-zinc-300"
            >
              {shared() ? "シェア文をコピーしました" : "応援をシェアする"}
            </button>
            <button
              type="button"
              onClick={onConfirmPaid}
              class="rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-zinc-950"
            >
              支払いを確認 (集計を更新)
            </button>
          </div>
          <p class="mt-2 text-xs text-zinc-500">
            支払い後に zap receipt が公開され、メーターに反映されます。
          </p>
        </div>
      ) : (
        <div>
          <div class="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                type="button"
                onClick={() => {
                  setSats(preset);
                  setCustom("");
                }}
                class={`rounded border px-3 py-1 text-sm ${
                  selected() === preset && custom().trim().length === 0
                    ? "border-amber-400 text-amber-300"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {preset.toLocaleString()} sats
              </button>
            ))}
            <input
              class="w-32 rounded border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm"
              inputMode="numeric"
              placeholder="金額入力"
              value={custom()}
              onInput={(e) => {
                setCustom(e.currentTarget.value);
              }}
            />
          </div>
          <input
            class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
            placeholder="応援コメント (任意)"
            value={comment()}
            onInput={(e) => {
              setComment(e.currentTarget.value);
            }}
          />
          <p class="mt-2 text-sm text-zinc-400">
            目標 {formatSats(props.goalMsats)} / 支援額: {formatSats(BigInt(selected()) * 1000n)}
            (Zap 直送・All-in のため返金なし)
          </p>
          <button
            type="button"
            onClick={onProceed}
            disabled={phase() === "working"}
            class="mt-3 w-full rounded bg-amber-400 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-50"
          >
            {phase() === "working" ? step() : "Zapで支援する"}
          </button>
        </div>
      )}
      {error() !== null && <p class="mt-2 text-sm text-red-400">{error()}</p>}
    </section>
  );
}
