import { createSignal } from "solid-js";
import {
  getSession,
  hasNip07,
  loginBunker,
  loginNip07,
  loginNsec,
  loginReadonly,
  logout,
  resolvePubkeyInput,
  resolveSecret,
  type AuthMethod,
} from "../lib/auth";
import { shortKey } from "./SupporterList";

const METHOD_LABEL: Record<AuthMethod, string> = {
  nip07: "拡張",
  nsec: "nsec",
  bunker: "Bunker",
  readonly: "閲覧専用",
};

export default function Header() {
  const [open, setOpen] = createSignal(false);
  const [nsecInput, setNsecInput] = createSignal("");
  const [npubInput, setNpubInput] = createSignal("");
  const [bunkerInput, setBunkerInput] = createSignal("");
  const [working, setWorking] = createSignal(false);
  const [notice, setNotice] = createSignal<string | null>(null);

  const connectNip07 = () => {
    if (!hasNip07() || window.nostr === undefined) {
      setNotice("NIP-07 対応のブラウザ拡張が見つかりません");
      return;
    }
    window.nostr
      .getPublicKey()
      .then((pubkey) => {
        if (!/^[0-9a-f]{64}$/.test(pubkey)) {
          setNotice("拡張から不正な公開鍵が返されました");
          return;
        }
        loginNip07(pubkey);
        setNotice(null);
        setOpen(false);
      })
      .catch(() => {
        setNotice("拡張への接続が拒否されました");
      });
  };

  const connectNsec = () => {
    const info = resolveSecret(nsecInput());
    if (info === null) {
      setNotice("nsec の形式が不正です");
      return;
    }
    loginNsec(info.secretHex, info.pubkey);
    setNsecInput("");
    setNotice(null);
    setOpen(false);
  };

  const connectReadonly = () => {
    const pubkey = resolvePubkeyInput(npubInput());
    if (pubkey === null) {
      setNotice("npub の形式が不正です");
      return;
    }
    loginReadonly(pubkey);
    setNpubInput("");
    setNotice(null);
    setOpen(false);
  };

  const connectBunker = () => {
    if (bunkerInput().trim().length === 0) {
      setNotice("bunker:// URL を入力してください");
      return;
    }
    setWorking(true);
    setNotice("署名器の承認を待っています…");
    loginBunker(bunkerInput().trim())
      .then(() => {
        setBunkerInput("");
        setNotice(null);
        setOpen(false);
      })
      .catch((err: unknown) => {
        setNotice(err instanceof Error ? err.message : "Bunker 接続に失敗しました");
      })
      .finally(() => {
        setWorking(false);
      });
  };

  const session = () => getSession();
  const input = "w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm";

  return (
    <header class="border-b border-zinc-800">
      <nav class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
        <a href="/" class="text-lg font-bold tracking-tight">
          Backr
        </a>
        <a href="/" class="text-sm text-zinc-400 hover:text-zinc-100">
          探す
        </a>
        <a href="/create" class="text-sm text-zinc-400 hover:text-zinc-100">
          作る
        </a>
        <a href="/about" class="text-sm text-zinc-400 hover:text-zinc-100">
          Backrとは
        </a>
        {session() === null ? (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setOpen(true);
            }}
            class="ml-auto rounded border border-zinc-600 px-3 py-1 text-sm hover:border-zinc-300"
          >
            ログイン
          </button>
        ) : (
          <span class="ml-auto flex items-center gap-2 text-sm">
            <span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {METHOD_LABEL[session()?.method ?? "readonly"]}
            </span>
            <span class="font-mono text-zinc-300">{shortKey(session()?.pubkey ?? "")}</span>
            <button
              type="button"
              onClick={logout}
              class="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-100"
            >
              ログアウト
            </button>
          </span>
        )}
      </nav>
      {open() && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div class="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-5">
            <div class="mb-4 flex items-center">
              <h2 class="text-lg font-semibold">ログイン</h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                class="ml-auto text-sm text-zinc-400 hover:text-zinc-100"
              >
                閉じる
              </button>
            </div>
            <div class="grid gap-3">
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">ブラウザ拡張</p>
                <p class="mt-1 text-sm text-zinc-400">NIP-07 対応拡張で署名 (推奨)</p>
                <button
                  type="button"
                  onClick={connectNip07}
                  class="mt-2 rounded bg-amber-400 px-3 py-1 text-sm font-semibold text-zinc-950"
                >
                  拡張に接続
                </button>
              </div>
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">nsec</p>
                <p class="mt-1 text-sm text-zinc-400">秘密鍵はメモリ保持のみ。保存しません</p>
                <input
                  class={input}
                  type="password"
                  placeholder="nsec1…"
                  value={nsecInput()}
                  onInput={(e) => {
                    setNsecInput(e.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  onClick={connectNsec}
                  class="mt-2 rounded border border-zinc-600 px-3 py-1 text-sm hover:border-zinc-300"
                >
                  nsecでログイン
                </button>
              </div>
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">リモート署名器 (NIP-46)</p>
                <p class="mt-1 text-sm text-zinc-400">bunker:// URL で接続。秘密鍵は渡りません</p>
                <input
                  class={input}
                  placeholder="bunker://…"
                  value={bunkerInput()}
                  onInput={(e) => {
                    setBunkerInput(e.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  onClick={connectBunker}
                  disabled={working()}
                  class="mt-2 rounded border border-zinc-600 px-3 py-1 text-sm hover:border-zinc-300 disabled:opacity-50"
                >
                  {working() ? "接続中…" : "Bunkerに接続"}
                </button>
              </div>
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">読み取り専用</p>
                <p class="mt-1 text-sm text-zinc-400">npub で閲覧のみ (署名・公開不可)</p>
                <input
                  class={input}
                  placeholder="npub1…"
                  value={npubInput()}
                  onInput={(e) => {
                    setNpubInput(e.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  onClick={connectReadonly}
                  class="mt-2 rounded border border-zinc-600 px-3 py-1 text-sm hover:border-zinc-300"
                >
                  閲覧する
                </button>
              </div>
            </div>
            {notice() !== null && <p class="mt-3 text-sm text-red-400">{notice()}</p>}
          </div>
        </div>
      )}
    </header>
  );
}
