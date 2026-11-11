/**
 * Web Worker: checks a run's chain off the main thread (an 8 MB log takes seconds). It receives the
 * texts of the run's files and answers with the same verdict `verifyRun` gives. Only viewer-core is used.
 */
import { loadRun, memorySource, verifyRun, type RunVerification } from "@swarmtales/viewer-core";

export interface VerifyRequest {
	readonly events: string;
	readonly chain?: string;
	readonly publicKey?: string;
}

export type VerifyReply = { readonly ok: true; readonly verification: RunVerification } | { readonly ok: false; readonly message: string };

/** The check itself, also used on the main thread when no worker can start. */
export async function verifyTexts(request: VerifyRequest): Promise<RunVerification> {
	const files: Record<string, string> = { "run/events.jsonl": request.events };
	if (request.chain !== undefined) files["run/events.chain.jsonl"] = request.chain;
	if (request.publicKey !== undefined) files["run/run.pub"] = request.publicKey;
	return verifyRun(await loadRun(memorySource(files), "run"));
}

function isRequest(value: unknown): value is VerifyRequest {
	return typeof value === "object" && value !== null && "events" in value && typeof value.events === "string";
}

// In a worker there is no `window`; on the main thread this module is only imported for `verifyTexts`.
if (typeof window === "undefined") {
	self.addEventListener("message", (event: MessageEvent<unknown>) => {
		const request = event.data;
		if (!isRequest(request)) return;
		verifyTexts(request).then(
			(verification) => { self.postMessage({ ok: true, verification } satisfies VerifyReply); },
			(reason: unknown) => { self.postMessage({ ok: false, message: reason instanceof Error ? reason.message : String(reason) } satisfies VerifyReply); },
		);
	});
}
