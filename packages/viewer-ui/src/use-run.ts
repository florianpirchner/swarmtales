import { indexRun, loadRun, type RunIndex, type RunModel, type RunSource, type RunVerification, type Vocabulary } from "@swarmtales/viewer-core";
import { useEffect, useState } from "react";
import { verifyTexts, type VerifyReply, type VerifyRequest } from "./verify-worker.ts";

export interface LoadedRun {
	readonly model: RunModel;
	readonly index: RunIndex;
}

export type RunState =
	| { readonly status: "idle" }
	| { readonly status: "loading"; readonly dir: string }
	| { readonly status: "error"; readonly dir: string; readonly message: string }
	| { readonly status: "ready"; readonly dir: string; readonly run: LoadedRun };

/** Lets the browser paint before heavy synchronous work (parsing an 8 MB log, checking its chain). */
export function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 20);
	});
}

/** No words of the host's own: viewer-core's defaults. */
export const NO_VOCABULARY: Vocabulary = {};

/** Loads and indexes a run folder; the work starts after a paint, so the page shows "loading" first. */
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

/** Checks the chain in a Web Worker; where no worker can start (a host that does not bundle workers) it runs here after a paint. */
function verifyOffThread(request: VerifyRequest, stop: { current: boolean }): Promise<RunVerification> {
	const here = async () => {
		await nextFrame();
		return verifyTexts(request);
	};
	if (typeof Worker === "undefined") return here();
	return new Promise((resolve) => {
		let worker: Worker;
		try {
			worker = new Worker(new URL("./verify-worker.ts", import.meta.url), { type: "module" });
		} catch {
			resolve(here());
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
			resolve(next);
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

/** The chain verdict of a loaded run, computed after the run is on screen (`undefined` while it is being checked). */
export function useVerification(model: RunModel | undefined): RunVerification | undefined {
	const [verdict, setVerdict] = useState<{ readonly model: RunModel; readonly result: RunVerification } | undefined>(undefined);
	useEffect(() => {
		if (model === undefined) return undefined;
		const alive = { current: true };
		void (async () => {
			const { chain, publicKey } = model.texts;
			const result = await verifyOffThread({ events: model.texts.events, ...(chain === undefined ? {} : { chain }), ...(publicKey === undefined ? {} : { publicKey }) }, alive);
			if (alive.current) setVerdict({ model, result });
		})();
		return () => {
			alive.current = false;
		};
	}, [model]);
	return verdict !== undefined && verdict.model === model ? verdict.result : undefined;
}
