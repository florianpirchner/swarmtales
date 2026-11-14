// SPDX-License-Identifier: Apache-2.0
import { indexRun, loadRun, verifyRun, type RunIndex, type RunModel, type RunSource, type RunVerification, type Vocabulary } from "@swarmtales/viewer-core";
import { useEffect, useState } from "react";
import { verifyTexts, type VerifyReply, type VerifyRequest } from "./verify-worker.ts";

/** A loaded run and its index. */
export interface LoadedRun {
	readonly model: RunModel;
	readonly index: RunIndex;
}

/** Where the loading of a run stands. */
export type RunState =
	| { readonly status: "idle" }
	| { readonly status: "loading"; readonly dir: string }
	| { readonly status: "error"; readonly dir: string; readonly message: string }
	| { readonly status: "ready"; readonly dir: string; readonly run: LoadedRun };

/**
 * Lets the browser paint before heavy synchronous work (parsing an 8 MB log, checking its chain).
 *
 * @returns A promise that resolves after the next paint.
 */
export function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 20);
	});
}

/** No words of the host's own: viewer-core's defaults. */
export const NO_VOCABULARY: Vocabulary = {};

/**
 * Loads and indexes a run folder; the work starts after a paint, so the page shows "loading" first.
 *
 * @param source - Where the files are read from.
 * @param dir - The run folder; `undefined` for no run.
 * @param vocabulary - The caller's words for reading the log.
 * @returns Where the loading stands, and the run once it is loaded.
 */
export function useRun(source: RunSource, dir: string | undefined, vocabulary: Vocabulary = NO_VOCABULARY): RunState {
	const [state, setState] = useState<RunState>({ status: "idle" });
	useEffect(() => {
		if (dir === undefined) {
			setState({ status: "idle" });
			return undefined;
		}
		const alive = { current: true };
		setState({ status: "loading", dir });
		void (async () => {
			try {
				await nextFrame();
				const model = await loadRun(source, dir, vocabulary.actors === undefined ? {} : { actors: vocabulary.actors });
				await nextFrame();
				const index = indexRun(model.events);
				if (alive.current) setState({ status: "ready", dir, run: { model, index } });
			} catch (error) {
				if (alive.current) setState({ status: "error", dir, message: error instanceof Error ? error.message : String(error) });
			}
		})();
		return () => {
			alive.current = false;
		};
	}, [source, dir, vocabulary]);
	return state;
}

function isReply(value: unknown): value is VerifyReply {
	return typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean";
}

// Starts the viewer's own module worker (bundlers that handle `new URL(…, import.meta.url)`, such as Vite).
function moduleWorker(): Worker {
	return new Worker(new URL("./verify-worker.ts", import.meta.url), { type: "module" });
}

// Checks the chain in a Web Worker (the host's, or the viewer's own module worker); where no worker
// can start it runs here after a paint. A worker that fails falls back to the same check here.
function verifyOffThread(request: VerifyRequest, stop: { current: boolean }, startWorker: () => Worker): Promise<RunVerification> {
	const here = async () => {
		await nextFrame();
		return verifyTexts(request);
	};
	if (typeof Worker === "undefined") return here();
	return new Promise((resolve, reject) => {
		let worker: Worker;
		try {
			worker = startWorker();
		} catch {
			here().then(resolve, reject);
			return;
		}
		const poll = setInterval(() => {
			if (!stop.current) {
				clearInterval(poll);
				worker.terminate();
			}
		}, 500);
		const done = (next: Promise<RunVerification>) => {
			clearInterval(poll);
			worker.terminate();
			next.then(resolve, reject);
		};
		worker.addEventListener("message", (event: MessageEvent<unknown>) => {
			const reply = event.data;
			if (isReply(reply) && reply.ok) done(Promise.resolve(reply.verification));
			else done(here());
		});
		worker.addEventListener("error", () => { done(here()); });
		worker.postMessage(request);
	});
}

/** The chain check as the badge shows it: being checked, a verdict, or a check that could not run at all. */
export type VerificationState =
	| { readonly status: "checking" }
	| { readonly status: "done"; readonly verification: RunVerification }
	| { readonly status: "failed"; readonly message: string };

const CHECKING: VerificationState = { status: "checking" };

/**
 * The chain verdict of a loaded run, computed after the run is on screen. A run without a chain file
 * is answered here at once (there is nothing to check, and only the model knows whether the file could
 * not be read); a check that throws ends as `failed`, never as "checking" forever.
 *
 * @param model - The loaded run; `undefined` for none.
 * @param startWorker - Starts the worker that checks the chain.
 * @returns The state of the check.
 */
export function useVerification(model: RunModel | undefined, startWorker: () => Worker = moduleWorker): VerificationState {
	const [verdict, setVerdict] = useState<{ readonly model: RunModel; readonly state: VerificationState } | undefined>(undefined);
	useEffect(() => {
		if (model === undefined) return undefined;
		const alive = { current: true };
		const { events, chain, publicKey, manifest } = model.texts;
		const check = chain === undefined ? Promise.resolve(verifyRun(model)) : verifyOffThread({ events, chain, ...(publicKey === undefined ? {} : { publicKey }), ...(manifest === undefined ? {} : { manifest }) }, alive, startWorker);
		check.then(
			(verification) => { if (alive.current) setVerdict({ model, state: { status: "done", verification } }); },
			(reason: unknown) => { if (alive.current) setVerdict({ model, state: { status: "failed", message: reason instanceof Error ? reason.message : String(reason) } }); },
		);
		return () => {
			alive.current = false;
		};
	}, [model, startWorker]);
	return verdict !== undefined && verdict.model === model ? verdict.state : CHECKING;
}
