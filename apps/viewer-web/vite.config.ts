import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// A static app: `dist/` can be served from any path (relative base). The workspace packages are bundled from source.
export default defineConfig({
	base: "./",
	plugins: [react()],
	resolve: { conditions: ["development"] },
	build: { target: "es2022", chunkSizeWarningLimit: 2500 },
});
