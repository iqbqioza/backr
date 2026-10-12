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
import { AUTH, NAV } from "../lib/copy";
import { shortKey } from "./people";

const METHOD_LABEL: Record<AuthMethod, string> = {
  nip07: "Extension",
  nsec: "nsec",
  bunker: "Bunker",
  readonly: "Read-only",
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
      setNotice(AUTH.errors.noExtension);
      return;
    }
    window.nostr
      .getPublicKey()
      .then((pubkey) => {
        if (!/^[0-9a-f]{64}$/.test(pubkey)) {
          setNotice(AUTH.errors.badExtensionKey);
          return;
        }
        loginNip07(pubkey);
        setNotice(null);
        setOpen(false);
      })
      .catch(() => {
        setNotice(AUTH.errors.extensionDenied);
      });
  };

  const connectNsec = () => {
    const info = resolveSecret(nsecInput());
    if (info === null) {
      setNotice(AUTH.errors.badNsec);
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
      setNotice(AUTH.errors.badNpub);
      return;
    }
    loginReadonly(pubkey);
    setNpubInput("");
    setNotice(null);
    setOpen(false);
  };

  const connectBunker = () => {
    if (bunkerInput().trim().length === 0) {
      setNotice(AUTH.errors.bunkerEmpty);
      return;
    }
    setWorking(true);
    setNotice(AUTH.waiting);
    loginBunker(bunkerInput().trim())
      .then(() => {
        setBunkerInput("");
        setNotice(null);
        setOpen(false);
      })
      .catch((err: unknown) => {
        setNotice(err instanceof Error ? err.message : "Bunker connection failed");
      })
      .finally(() => {
        setWorking(false);
      });
  };

  const session = () => getSession();
  const input =
    "w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none";

  return (
    <header class="border-b border-zinc-800">
      <nav class="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:gap-x-6">
        <a href="/" class="text-lg font-bold tracking-tight">
          {NAV.brand}
        </a>
        <a href="/" class="text-sm text-zinc-400 hover:text-zinc-100">
          {NAV.discover}
        </a>
        <a href="/create" class="text-sm text-zinc-400 hover:text-zinc-100">
          {NAV.create}
        </a>
        <a href="/about" class="text-sm text-zinc-400 hover:text-zinc-100">
          {NAV.about}
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
            {NAV.login}
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
              {NAV.logout}
            </button>
          </span>
        )}
      </nav>
      {open() && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-5">
            <div class="mb-4 flex items-center">
              <h2 class="text-lg font-semibold">{AUTH.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                class="ml-auto text-sm text-zinc-400 hover:text-zinc-100"
              >
                {AUTH.close}
              </button>
            </div>
            <div class="grid gap-3">
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">{AUTH.extension}</p>
                <p class="mt-1 text-sm text-zinc-400">{AUTH.extensionDesc}</p>
                <button
                  type="button"
                  onClick={connectNip07}
                  class="mt-2 rounded bg-amber-400 px-3 py-1 text-sm font-semibold text-zinc-950"
                >
                  {AUTH.extensionConnect}
                </button>
              </div>
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">{AUTH.nsec}</p>
                <p class="mt-1 text-sm text-zinc-400">{AUTH.nsecDesc}</p>
                <input
                  class={input}
                  type="password"
                  placeholder={AUTH.nsecPlaceholder}
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
                  {AUTH.nsecLogin}
                </button>
              </div>
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">{AUTH.bunker}</p>
                <p class="mt-1 text-sm text-zinc-400">{AUTH.bunkerDesc}</p>
                <input
                  class={input}
                  placeholder={AUTH.bunkerPlaceholder}
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
                  {working() ? AUTH.bunkerConnecting : AUTH.bunkerConnect}
                </button>
              </div>
              <div class="rounded border border-zinc-700 p-3">
                <p class="font-medium">{AUTH.readonly}</p>
                <p class="mt-1 text-sm text-zinc-400">{AUTH.readonlyDesc}</p>
                <input
                  class={input}
                  placeholder={AUTH.readonlyPlaceholder}
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
                  {AUTH.readonlyEnter}
                </button>
              </div>
            </div>
            {notice() !== null && <p class="mt-3 text-sm text-red-400">{notice()}</p>}
            <p class="mt-3 text-xs text-zinc-500">{AUTH.memoryOnly}</p>
          </div>
        </div>
      )}
    </header>
  );
}
