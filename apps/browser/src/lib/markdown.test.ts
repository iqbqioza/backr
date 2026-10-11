/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { markdownExcerpt, renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings, emphasis, lists and code", () => {
    const html = renderMarkdown("# 見出し\n\n**太字** と *斜体*\n\n- a\n- b\n\n`code`");
    expect(html).toContain("<h1>見出し</h1>");
    expect(html).toContain("<strong>太字</strong>");
    expect(html).toContain("<em>斜体</em>");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<code>code</code>");
  });
  it("renders links and images with allowed schemes", () => {
    expect(renderMarkdown("[x](https://example.com)")).toContain('href="https://example.com"');
    expect(renderMarkdown("![alt](https://example.com/a.png)")).toContain(
      'src="https://example.com/a.png"',
    );
  });
  it("drops raw html and dangerous schemes", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
    expect(renderMarkdown("<b>bold</b>")).not.toContain("<b>");
    // markdown-it は危険スキームをリンク化せずエスケープする
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("<a ");
    expect(renderMarkdown("![x](https://example.com/a.png)")).not.toContain("onerror");
  });
  it("handles empty input", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("   \n  ")).toBe("");
  });
});

describe("renderMarkdown (jsdom sanitizer)", () => {
  it("does not execute raw html injected into markdown", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">\n\n<script>alert(2)</script>');
    // markdown-it (html:false) は生 HTML をエスケープし、タグは生成しない
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>");
  });
  it("sanitizes the escaped output through DOMPurify", async () => {
    const DOMPurify = (await import("dompurify")).default;
    const clean = DOMPurify.sanitize('<img src=x onerror="alert(1)">', {
      ALLOWED_TAGS: ["img"],
      ALLOWED_ATTR: ["src", "alt"],
    });
    expect(String(clean)).not.toContain("onerror");
    expect(String(DOMPurify.sanitize('<a href="javascript:alert(1)">x</a>', { ALLOWED_ATTR: ["href"] }))).not.toContain("javascript:");
  });
});

describe("markdownExcerpt", () => {
  it("strips markdown syntax", () => {
    expect(markdownExcerpt("# タイトル\n本文")).toBe("タイトル");
    expect(markdownExcerpt("[リンク](https://example.com) と **強調**")).toBe("リンク と 強調");
    expect(markdownExcerpt("\n\n改行のみの後")).toBe("改行のみの後");
  });
  it("truncates long lines", () => {
    expect(markdownExcerpt("あ".repeat(50), 10)).toBe(`${"あ".repeat(10)}…`);
    expect(markdownExcerpt("")).toBe("");
  });
});
