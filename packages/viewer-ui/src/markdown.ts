// SPDX-License-Identifier: Apache-2.0
/**
 * Markdown to safe HTML for the report view. A report is a file in a repository, but its text can come
 * from a model or from a stranger's pull request, so the HTML is always sanitised before it is shown:
 * no scripts, no event handlers, no embeds, and no `style`, `class` or `id` (a report must not reuse the
 * viewer's own classes or move outside its box). `#seq` references become links afterwards, on the
 * text nodes of the sanitised DOM, built as elements (never as HTML text).
 */
import { reportLinks } from "@swarmtales/viewer-core";
import DOMPurify from "dompurify";
import { marked } from "marked";

/** A piece of a text node: plain text, or a `#seq` reference to link. */
export type SeqPart = string | { readonly seq: number; readonly text: string };

/**
 * A text split into plain text and the `#seq` references `exists` accepts (viewer-core's `reportLinks` finds them).
 *
 * @param text - The text.
 * @param exists - Says whether the run has an event with a seq.
 * @returns The text in parts: plain text, and one part per reference the run has.
 */
export function seqParts(text: string, exists: (seq: number) => boolean = () => true): readonly SeqPart[] {
	const parts: SeqPart[] = [];
	let from = 0;
	for (const link of reportLinks(text)) {
		if (!exists(link.seq)) continue;
		if (link.start > from) parts.push(text.slice(from, link.start));
		parts.push({ seq: link.seq, text: text.slice(link.start, link.end) });
		from = link.end;
	}
	if (from < text.length) parts.push(text.slice(from));
	return parts;
}

/** The sanitiser's settings; exported so a test can pin them. */
export const SANITIZE = {
	FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed", "link", "meta", "base"],
	FORBID_ATTR: ["style", "class", "id", "target"],
} as const;

// Turns the `#seq` references in the text nodes of `root` (outside links) into `<a href="#seq=…" data-seq="…">` elements.
function linkTextNodes(root: Node, exists: (seq: number) => boolean): void {
	const owner = root.ownerDocument ?? document;
	const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const texts: Text[] = [];
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		if (node instanceof Text && node.parentElement?.closest("a") === null) texts.push(node);
	}
	for (const node of texts) {
		const parts = seqParts(node.data, exists);
		if (!parts.some((part) => typeof part !== "string")) continue;
		node.replaceWith(
			...parts.map((part) => {
				if (typeof part === "string") return part;
				const link = owner.createElement("a");
				link.href = `#seq=${String(part.seq)}`;
				link.dataset.seq = String(part.seq);
				link.textContent = part.text;
				return link;
			}),
		);
	}
}

function escaped(text: string): string {
	return text.replace(/[&<>]/g, (char) => (char === "&" ? "&amp;" : char === "<" ? "&lt;" : "&gt;"));
}

/**
 * Sanitised HTML with `#seq` links; the plain text escaped when no DOM is there to sanitise with.
 *
 * @param markdown - The Markdown text.
 * @param exists - Says whether the run has an event with a seq.
 * @returns The sanitised HTML.
 */
export function safeHtml(markdown: string, exists: (seq: number) => boolean = () => true): string {
	if (!DOMPurify.isSupported) return `<pre>${escaped(markdown)}</pre>`;
	const html = marked.parse(markdown, { async: false, gfm: true });
	const fragment = DOMPurify.sanitize(html, { ...SANITIZE, FORBID_TAGS: [...SANITIZE.FORBID_TAGS], FORBID_ATTR: [...SANITIZE.FORBID_ATTR], RETURN_DOM_FRAGMENT: true });
	linkTextNodes(fragment, exists);
	const box = document.createElement("div");
	box.append(fragment);
	return box.innerHTML;
}
