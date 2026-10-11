import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import MarkdownIt from "markdown-it";

const parser = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

const SANITIZE_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "hr",
    "strong",
    "em",
    "del",
    "s",
    "blockquote",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title"],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
};

/** DOMPurify の遅延生成 (window がなければ null) */
let cached: { sanitize: (html: string, config: unknown) => string } | null | undefined;

function purifier(): { sanitize: (html: string, config: unknown) => string } | null {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || DOMPurify.isSupported !== true) {
    cached = null;
    return cached;
  }
  cached = { sanitize: (html, config) => String(DOMPurify.sanitize(html, config as DOMPurifyConfig)) };
  return cached;
}

/**
 * markdown (NIP-23 は HTML を含まない) を HTML に変換する。
 * markdown-it (CommonMark) でパースし、DOMPurify で緩衝サニタイズする。
 */
export function renderMarkdown(markdown: string): string {
  if (markdown.trim().length === 0) return "";
  const raw = parser.render(markdown);
  const clean = purifier();
  if (clean === null) return raw;
  return clean.sanitize(raw, SANITIZE_CONFIG);
}

/** markdown の 1 行目 (見出し/本文) を切り出す。長すぎれば省略 */
export function markdownExcerpt(markdown: string, maxLength = 120): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>\-+]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (plain === undefined) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}…`;
}
