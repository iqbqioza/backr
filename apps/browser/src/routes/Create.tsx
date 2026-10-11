import {
  decodeBare,
  encodeNevent,
  validateGoal9041,
  type UnsignedEvent,
} from "backr-nostr-nips";
import { formatSats, remainingLabel } from "backr-utils";
import { createSignal } from "solid-js";
import { canSign, getSession, signWithSession } from "../lib/auth";
import { OGP_ASPECT_CLASS } from "../components/thumb";
import { CREATE } from "../lib/copy";
import Markdown from "../components/Markdown";
import { DEFAULT_RELAY } from "../lib/const";
import { publishEvent } from "../lib/relay";
import { shortKey } from "../components/people";

export default function Create() {
  const [npub, setNpub] = createSignal("");
  const [summary, setSummary] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [goalSats, setGoalSats] = createSignal("");
  const [closedAt, setClosedAt] = createSignal("");
  const [image, setImage] = createSignal("");
  const [unsigned, setUnsigned] = createSignal<UnsignedEvent | null>(null);
  const [preview, setPreview] = createSignal<string | null>(null);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [publishing, setPublishing] = createSignal(false);
  const [published, setPublished] = createSignal<string | null>(null);

  const authorPubkey = (): string | null => {
    const s = getSession();
    if (s !== null) return s.pubkey;
    const trimmed = npub().trim();
    if (/^[0-9a-f]{64}$/.test(trimmed)) return trimmed;
    return decodeBare(trimmed, "npub");
  };

  const goalMsats = (): bigint | null => {
    const trimmed = goalSats().trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const value = BigInt(trimmed) * 1000n;
    return value > 0n ? value : null;
  };

  const closedAtSec = (): number | null => {
    if (closedAt().trim().length === 0) return null;
    const ms = Date.parse(closedAt().trim());
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  };

  const buildUnsigned = (): UnsignedEvent | null => {
    const pubkey = authorPubkey();
    const amount = goalMsats();
    const problems: string[] = [];
    if (pubkey === null) problems.push(CREATE.errors.creator);
    if (amount === null) problems.push(CREATE.errors.goal);
    if (closedAt().trim().length > 0 && closedAtSec() === null) {
      problems.push(CREATE.errors.deadline);
    }
    if (problems.length > 0) {
      setErrors(problems);
      return null;
    }
    const tags: string[][] = [
      ["relays", DEFAULT_RELAY],
      ["amount", (amount ?? 0n).toString()],
      ["t", "backr"],
    ];
    const closed = closedAtSec();
    if (closed !== null) tags.push(["closed_at", String(closed)]);
    if (summary().trim().length > 0) tags.push(["summary", summary().trim()]);
    if (image().trim().length > 0) tags.push(["image", image().trim()]);
    return {
      pubkey: pubkey ?? "",
      created_at: Math.floor(Date.now() / 1000),
      kind: 9041,
      tags,
      content: description(),
    };
  };

  const onPreview = () => {
    setPublished(null);
    const draft = buildUnsigned();
    if (draft === null) {
      setUnsigned(null);
      setPreview(null);
      return;
    }
    const check = validateGoal9041({ ...draft, id: "0".repeat(64), sig: "0".repeat(128) });
    if (!check.ok) {
      setErrors(check.errors);
      setUnsigned(null);
      setPreview(null);
      return;
    }
    setErrors([]);
    setUnsigned(draft);
    setPreview(JSON.stringify({ ...draft, id: "(signed)", sig: "(signed)" }, null, 2));
  };

  const onPublish = () => {
    const draft = unsigned();
    if (draft === null || publishing()) return;
    setPublishing(true);
    setErrors([]);
    signWithSession(draft)
      .then((signed) => {
        if (signed === null) {
          setErrors([CREATE.errors.noSignature]);
          return;
        }
        return publishEvent(DEFAULT_RELAY, signed).then((result) => {
          if (!result.accepted) {
            setErrors([CREATE.errors.rejected(result.message)]);
            return;
          }
          const nevent = encodeNevent({ id: signed.id, relays: [DEFAULT_RELAY] });
          setPublished(nevent);
        });
      })
      .catch((err: unknown) => {
        setErrors([err instanceof Error ? err.message : "Publishing failed"]);
      })
      .finally(() => {
        setPublishing(false);
      });
  };

  const input = "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2";
  const nowSec = () => Math.floor(Date.now() / 1000);
  const session = () => getSession();

  return (
    <div>
      <h1 class="mb-4 text-2xl font-bold">{CREATE.title}</h1>
      {session() === null && (
        <p class="mb-4 rounded border border-zinc-700 p-3 text-sm text-zinc-300">
          {CREATE.loginNotice}
        </p>
      )}
      <div class="grid gap-6 md:grid-cols-2">
        <div class="grid content-start gap-3">
          {session() === null ? (
            <label class="text-sm">
              Creator (npub / hex)
              <input
                class={input}
                placeholder="npub1…"
                value={npub()}
                onInput={(e) => {
                  setNpub(e.currentTarget.value);
                }}
              />
            </label>
          ) : (
            <p class="rounded border border-zinc-700 p-3 font-mono text-sm text-zinc-300">
              Creator: {shortKey(session()?.pubkey ?? "")}
            </p>
          )}
          <label class="text-sm">
            Short description
            <input
              class={input}
              placeholder={CREATE.summaryPlaceholder}
              value={summary()}
              onInput={(e) => {
                setSummary(e.currentTarget.value);
              }}
            />
          </label>
          <label class="text-sm">
            Details
            <textarea
              class={input}
              rows={6}
              placeholder={CREATE.descriptionPlaceholder}
              value={description()}
              onInput={(e) => {
                setDescription(e.currentTarget.value);
              }}
            />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-sm">
              Goal (sats)
              <input
                class={input}
                inputMode="numeric"
                placeholder="100000"
                value={goalSats()}
                onInput={(e) => {
                  setGoalSats(e.currentTarget.value);
                }}
              />
            </label>
            <label class="text-sm">
              Deadline (optional)
              <input
                class={input}
                type="date"
                value={closedAt()}
                onInput={(e) => {
                  setClosedAt(e.currentTarget.value);
                }}
              />
            </label>
          </div>
          <label class="text-sm">
            Image URL (optional)
            <input
              class={input}
              placeholder="https://…"
              value={image()}
              onInput={(e) => {
                setImage(e.currentTarget.value);
              }}
            />
          </label>
          <button
            type="button"
            onClick={onPreview}
            class="rounded border border-zinc-600 px-4 py-2 font-semibold hover:border-zinc-300"
          >
            Review event
          </button>
          {errors().length > 0 && (
            <ul class="list-disc pl-5 text-sm text-red-400">
              {errors().map((err) => (
                <li>{err}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 class="mb-2 font-semibold">Preview</h2>
          <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {image().trim().length > 0 ? (
              <img src={image().trim()} alt="" class={`mb-3 w-full rounded object-cover ${OGP_ASPECT_CLASS}`} />
            ) : (
              <div
                class={`mb-3 flex w-full items-center justify-center rounded bg-gradient-to-br from-zinc-800 to-zinc-900 text-4xl ${OGP_ASPECT_CLASS}`}
              >
                ⚡
              </div>
            )}
            <p class="text-lg font-semibold">{summary().trim() || "Untitled"}</p>
            {description().trim().length > 0 ? (
              <div class="mt-1 line-clamp-3 text-sm text-zinc-400 [&_a]:text-amber-300 [&_h1]:font-bold [&_h1]:text-base [&_li]:list-disc [&_li]:ml-5 [&_p]:my-1">
                <Markdown source={description()} />
              </div>
            ) : (
              <p class="mt-1 text-sm text-zinc-400">No description</p>
            )}
            <p class="mt-3 text-sm text-zinc-400">
              Goal: {goalMsats() === null ? "—" : formatSats(goalMsats() ?? 0n)}
              {" / "}
              {closedAtSec() === null ? "No deadline" : remainingLabel(nowSec(), closedAtSec() ?? 0)}
            </p>
          </div>
          {preview() !== null && (
            <pre class="mt-3 max-h-64 overflow-auto rounded bg-zinc-900 p-4 text-xs">{preview()}</pre>
          )}
          {unsigned() !== null && canSign() && published() === null && (
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing()}
              class="mt-3 w-full rounded bg-amber-400 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-50"
            >
              {publishing() ? "Publishing…" : `${CREATE.publish(DEFAULT_RELAY)}`}
            </button>
          )}
          {published() !== null && (
            <p class="mt-3 rounded border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
              Published! <a class="underline" href={`/g/${published()}`}>Open project page</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
