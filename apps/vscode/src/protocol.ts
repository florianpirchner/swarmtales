/**
 * The messages between the webview and the extension host. Everything that comes out of a webview is
 * untrusted input (the page runs a bundle that renders run files and reports): it is parsed with Typebox
 * before the host acts on it, and so is everything the webview receives.
 */
import { ViewDescriptorSchema, type ViewDescriptor } from "@swarmtales/viewer-ui/views";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

/** A request of the webview; `id` pairs it with its reply. Paths are relative to the opened folder. */
/** Every message is a closed object: a stray field makes it invalid. */
const closed = { additionalProperties: false } as const;

const RpcRequest = Type.Union([
	Type.Object({ type: Type.Literal("rpc"), id: Type.Integer({ minimum: 0 }), method: Type.Literal("list"), dir: Type.String() }, closed),
	Type.Object({ type: Type.Literal("rpc"), id: Type.Integer({ minimum: 0 }), method: Type.Literal("readText"), path: Type.String() }, closed),
]);
export type RpcRequest = Static<typeof RpcRequest>;

const Entry = Type.Object({ name: Type.String(), kind: Type.Union([Type.Literal("file"), Type.Literal("dir")]) }, closed);

/** What the webview may ask of the host. */
const ToHost = Type.Union([
	Type.Object({ type: Type.Literal("ready") }, closed),
	RpcRequest,
	Type.Object({ type: Type.Literal("openFile"), path: Type.String() }, closed),
]);
export type ToHostMessage = Static<typeof ToHost>;

/** The reply to a request: the entries of a directory, the text of a file (or none), or an error. */
const RpcReply = Type.Union([
	Type.Object({ type: Type.Literal("rpc-result"), id: Type.Integer({ minimum: 0 }), ok: Type.Literal(true), entries: Type.Array(Entry) }, closed),
	Type.Object({ type: Type.Literal("rpc-result"), id: Type.Integer({ minimum: 0 }), ok: Type.Literal(true), text: Type.Optional(Type.String()) }, closed),
	Type.Object({ type: Type.Literal("rpc-result"), id: Type.Integer({ minimum: 0 }), ok: Type.Literal(false), error: Type.String() }, closed),
]);
export type RpcReply = Static<typeof RpcReply>;

/** The first message to the webview: what the viewer needs besides files. */
const Init = Type.Object({
	type: Type.Literal("init"),
	title: Type.String(),
	stories: Type.Record(Type.String(), Type.Unknown()),
	views: Type.Array(ViewDescriptorSchema),
	/** A location hash to start at (`#run=...&view=replay`), or none. */
	hash: Type.Optional(Type.String()),
	/** The story the Story tab shows first. */
	initialStory: Type.Optional(Type.Object({ name: Type.String(), story: Type.Unknown() }, closed)),
}, closed);
export interface InitMessage {
	readonly type: "init";
	readonly title: string;
	readonly stories: Readonly<Record<string, unknown>>;
	readonly views: readonly ViewDescriptor[];
	readonly hash?: string;
	readonly initialStory?: { readonly name: string; readonly story: unknown };
}

const ToWebview = Type.Union([Init, RpcReply]);
export type ToWebviewMessage = InitMessage | RpcReply;

export function parseToHost(value: unknown): ToHostMessage | undefined {
	return Check(ToHost, value) ? value : undefined;
}

export function parseToWebview(value: unknown): ToWebviewMessage | undefined {
	return Check(ToWebview, value) ? value : undefined;
}

export function isInit(message: ToWebviewMessage): message is InitMessage {
	return message.type === "init";
}
