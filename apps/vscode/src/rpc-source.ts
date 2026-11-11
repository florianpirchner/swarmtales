/**
 * A `RunSource` whose files live in the extension host: every call becomes a request over a message
 * channel (the webview's `postMessage`) and waits for the reply with the same id. The channel is a plain
 * interface so tests run it against a fake.
 */
import type { RunSource, RunSourceEntry } from "@swarmtales/viewer-core";
import type { RpcReply, RpcRequest } from "./protocol.ts";

export interface RequestChannel {
	post(request: RpcRequest): void;
}

export interface RpcSource {
	readonly source: RunSource;
	/** Feed every reply the host sends back; replies nobody waits for are ignored. */
	accept(reply: RpcReply): void;
}

interface Pending {
	readonly resolve: (reply: RpcReply) => void;
}

function entriesOf(reply: RpcReply): readonly RunSourceEntry[] {
	if (!reply.ok) throw new Error(reply.error);
	return "entries" in reply ? reply.entries : [];
}

export function rpcSource(channel: RequestChannel): RpcSource {
	let next = 0;
	const waiting = new Map<number, Pending>();
	const ask = (build: (id: number) => RpcRequest): Promise<RpcReply> => {
		const id = next;
		next += 1;
		return new Promise((resolve) => {
			waiting.set(id, { resolve });
			channel.post(build(id));
		});
	};
	return {
		accept(reply) {
			const pending = waiting.get(reply.id);
			if (pending === undefined) return;
			waiting.delete(reply.id);
			pending.resolve(reply);
		},
		source: {
			async list(dir) {
				return entriesOf(await ask((id) => ({ type: "rpc", id, method: "list", dir })));
			},
			async readText(path) {
				const reply = await ask((id) => ({ type: "rpc", id, method: "readText", path }));
				if (!reply.ok) throw new Error(reply.error);
				return "text" in reply ? reply.text : undefined;
			},
		},
	};
}
