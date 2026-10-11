import { createSignal } from "solid-js";

const METHODS = [
  { id: "nip07", name: "ブラウザ拡張", desc: "NIP-07 対応拡張で署名 (推奨)" },
  { id: "nsec", name: "nsec", desc: "秘密鍵を入力して署名 (メモリ保持のみ)" },
  { id: "readonly", name: "読み取り専用", desc: "npub で閲覧のみ" },
];

/** ログイン UI (見た目のみ。接続処理は次のステップ) */
export default function Header() {
  const [open, setOpen] = createSignal(false);

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
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          class="ml-auto rounded border border-zinc-600 px-3 py-1 text-sm hover:border-zinc-300"
        >
          ログイン
        </button>
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
              {METHODS.map((method) => (
                <div class="rounded border border-zinc-700 p-3">
                  <div class="flex items-center gap-2">
                    <p class="font-medium">{method.name}</p>
                    <span class="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                      近日対応
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-zinc-400">{method.desc}</p>
                  <button
                    type="button"
                    disabled
                    class="mt-2 rounded bg-zinc-700 px-3 py-1 text-sm opacity-50"
                  >
                    接続する
                  </button>
                </div>
              ))}
            </div>
            <p class="mt-3 text-xs text-zinc-500">
              秘密鍵はブラウザのメモリ保持のみ。保存しません。
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
