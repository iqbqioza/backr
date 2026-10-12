import { invoiceToQrSvg } from "backr-qr";
import { onCleanup, onMount, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

/** Payment invoice QR modal. QR payload is generated locally; nothing leaves the browser. */
export default function InvoiceQrModal(props: {
  invoice: string;
  heading: string;
  scanNote: string;
  closeLabel: string;
  onClose: () => void;
  children: JSX.Element;
}): JSX.Element {
  const svg = () => {
    try {
      return invoiceToQrSvg(props.invoice);
    } catch {
      return "";
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") props.onClose();
  };
  onMount(() => {
    window.addEventListener("keydown", onKey);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKey);
  });

  // Portal to document.body: avoids ancestor stacking contexts
  // (e.g. the sticky tab bar / aside in GoalDetail) painting above the modal.
  // The backdrop is deliberately NOT clickable: closing is only via
  // the Close button or Escape, so a mis-tap never loses the invoice.
  return (
    <Portal>
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
        <div class="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-5">
          <div class="mb-3 flex items-center">
            <h2 class="text-lg font-semibold text-zinc-100">{props.heading}</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="ml-auto text-sm text-zinc-400 hover:text-zinc-100"
            >
              {props.closeLabel}
            </button>
          </div>
          <div class="overflow-hidden rounded-lg bg-white p-3">
            {svg().length > 0 ? (
              <div class="[&_svg]:h-auto [&_svg]:w-full" innerHTML={svg()} />
            ) : (
              <p class="break-all font-mono text-xs text-zinc-950">{props.invoice}</p>
            )}
          </div>
          <p class="mt-2 text-center text-sm text-zinc-400">{props.scanNote}</p>
          <p class="mt-2 break-all rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {props.invoice}
          </p>
          <div class="mt-3 grid gap-2">{props.children}</div>
        </div>
      </div>
    </Portal>
  );
}
