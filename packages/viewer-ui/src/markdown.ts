/**
 * Markdown to safe HTML for the report view. A report is a file in a repository, but its text can come
 * from a model or from a stranger's pull request, so the HTML is always sanitised before it is shown.
 */
import DOMPurify from "dompurify";
import { marked } from "marked";

const REFERENCE = /(?<![\w&#])#(\d{1,9})(?!\w)/g;

/** Turns every `#123` in the text nodes of an HTML string into a link `#seq=123` (not inside a link), for the seqs `exists` accepts. */
export function linkSeqs(html: string, exists: (seq: number) => boolean = () => true): string {
	let inLink = 0;
	return html
		.split(/(<[^>]*>)/)
		.map((part) => {
			if (part.startsWith("<")) {
				if (/^<a[\s>]/i.test(part)) inLink += 1;
				else if (/^<\/a\s*>/i.test(part)) inLink = Math.max(0, inLink - 1);
				return part;
			}
			return inLink > 0 ? part : part.replace(REFERENCE, (match, seq: string) => (exists(Number(seq)) ? `<a href="#seq=${seq}" data-seq="${seq}">#${seq}</a>` : match));
		})
		.join("");
}

/** Markdown rendered to HTML with `#seq` links; not yet safe. */
export function markdownToHtml(markdown: string, exists?: (seq: number) => boolean): string {
	return linkSeqs(marked.parse(markdown, { async: false, gfm: true }), exists);
}

/** Sanitised HTML (no scripts, no event handlers, no remote embeds); the plain text escaped when no DOM is there to sanitise with. */
export function safeHtml(markdown: string, exists?: (seq: number) => boolean): string {
	const html = markdownToHtml(markdown, exists);
	if (!DOMPurify.isSupported) return `<pre>${markdown.replace(/[&<>]/g, (char) => (char === "&" ? "&amp;" : char === "<" ? "&lt;" : "&gt;"))}</pre>`;
	return DOMPurify.sanitize(html, { ADD_ATTR: ["data-seq"], FORBID_TAGS: ["style", "form", "input", "iframe", "object", "embed"] });
}
