import type { JSX } from "solid-js";
import { renderMarkdown } from "../lib/markdown";

/** markdown を安全にレンダリングする (HTML は事前サニタイズ済み) */
export default function Markdown(props: { source: string; class?: string }): JSX.Element {
  const html = () => renderMarkdown(props.source);
  return <div class={props.class ?? ""} innerHTML={html()} />;
}
