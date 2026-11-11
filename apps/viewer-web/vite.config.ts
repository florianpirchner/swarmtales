import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * The built page's Content Security Policy: scripts, styles, workers and data from the page's own origin;
 * images also as data and blob URLs (never from a remote host, so a report cannot ping a tracker); fetches
 * only to the GitHub API and raw files. Inline style attributes stay allowed for React Flow's positions.
 * Only in the build: the dev server injects an inline script for hot reload.
 */
const CSP = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self'",
	"connect-src 'self' https://api.github.com https://raw.githubusercontent.com",
	"worker-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'none'",
].join("; ");

const csp: Plugin = {
	name: "swarmtales-csp",
	apply: "build",
	transformIndexHtml: (html) => html.replace("<head>", `<head>\n\t\t<meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
};

// A static app: `dist/` can be served from any path (relative base). The workspace packages are bundled from source.
export default defineConfig({
	base: "./",
	plugins: [react(), csp],
	resolve: { conditions: ["development"] },
	build: { target: "es2022", chunkSizeWarningLimit: 2500 },
});
