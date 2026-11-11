/**
 * The page a webview shows. The content security policy allows exactly one script (the viewer bundle,
 * by nonce), a worker only from a blob URL (the bundle builds the chain-check worker from its own
 * code) and nothing from the network: no remote script, no frame, no connection. Styles may be
 * inline because React and React Flow position elements with `style` attributes.
 */

export interface HtmlOptions {
	/** A fresh random value per page load. */
	readonly nonce: string;
	/** `webview.cspSource`: the origin the extension's own files are served from. */
	readonly cspSource: string;
	readonly scriptUri: string;
	readonly styleUri: string;
	readonly title: string;
}

/** A random nonce of `length` characters from the alphabet below, drawn from the given random source. */
export function makeNonce(random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes), length = 32): string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	return Array.from(random(new Uint8Array(length)), (byte) => alphabet.charAt(byte % alphabet.length)).join("");
}

export function contentSecurityPolicy(nonce: string, cspSource: string): string {
	return [
		"default-src 'none'",
		`script-src 'nonce-${nonce}'`,
		`style-src ${cspSource} 'unsafe-inline'`,
		`img-src ${cspSource} data: blob:`,
		`font-src ${cspSource} data:`,
		// The chain-check worker comes from a blob URL of the bundle's own code (see apps/vscode/README.md).
		"worker-src blob:",
	].join("; ");
}

function escapeHtml(text: string): string {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function buildHtml(options: HtmlOptions): string {
	const { nonce, cspSource, scriptUri, styleUri, title } = options;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(nonce, cspSource)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${escapeHtml(styleUri)}">
<style>html, body, #root { height: 100%; margin: 0; padding: 0; } body { padding: 0; }</style>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${escapeHtml(scriptUri)}"></script>
</body>
</html>
`;
}
