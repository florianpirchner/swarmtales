/**
 * Standing orders (docs/design/overseer-api.md §4.2) and audiences (§4.1). An instruction of the
 * human to an overseer is kept as a standing order until its lifetime ends; every call to the
 * overseer carries the active ones in `{{standingOrders}}`, which renders to the empty string when
 * none is active, so the prompt and its cache prefix stay unchanged. An instruction to a resident
 * is kept the same way and shown once, in its next turn. An overseer reads the log through its
 * audience: only the events whose audience is absent or names it.
 */
import { Type } from "typebox";
import type { EventEnvelope, EventLogView, PromptLookup, StandingOrder } from "@swarmtales/contracts";
import type { EventBus } from "./log.ts";

/** The prompt `{{standingOrders}}` is rendered with (leading blank line included), and its lines per mode. */
const ORDERS_PROMPT = "core/standing-orders";
const LINE_PROMPTS = { advice: "core/standing-order-advice", order: "core/standing-order-order" } as const;
/** How a resident reads the human's instruction in its next turn. */
const RESIDENT_PROMPT = "core/inputs/human";

/** What an answer gains while an order of mode `order` is active: the overseer's account of each order. */
export const OrdersAnswer = Type.Array(Type.Object({ order: Type.Integer(), followed: Type.Boolean(), reason: Type.String({ maxLength: 500 }) }));

function alive(order: StandingOrder, minute: number): boolean {
	const lifetime = order.lifetime;
	if (lifetime === "untilRevoked") return true;
	if ("untilMinute" in lifetime) return minute <= lifetime.untilMinute;
	return order.used < lifetime.calls;
}

export class OrderBook {
	/** In the order they were issued (ascending id). */
	#orders: StandingOrder[] = [];

	add(order: StandingOrder): void {
		this.#orders.push(order);
	}

	/** Ends an order before its lifetime does; false when no such order is active. */
	revoke(id: number): boolean {
		const before = this.#orders.length;
		this.#orders = this.#orders.filter((order) => order.id !== id);
		return this.#orders.length < before;
	}

	has(id: number, minute: number): boolean {
		return this.#orders.some((order) => order.id === id && alive(order, minute));
	}

	/** Whether `target` has an active order now (a resident with a note waiting has news). */
	pending(target: string, minute: number): boolean {
		return this.#orders.some((order) => order.target === target && alive(order, minute));
	}

	/** The orders a call to `target` carries now; each is counted as used, and one whose calls are spent is dropped. */
	carry(target: string, minute: number): readonly StandingOrder[] {
		this.#orders = this.#orders.filter((order) => alive(order, minute));
		const carried = this.#orders.filter((order) => order.target === target);
		this.#orders = this.#orders.flatMap((order) => {
			if (order.target !== target) return [order];
			const used = { ...order, used: order.used + 1 };
			return alive(used, minute) ? [used] : [];
		});
		return carried;
	}

	/** The orders still active at `minute` (the next minute to play), for the snapshot. */
	save(minute: number): readonly StandingOrder[] {
		return this.#orders.filter((order) => alive(order, minute)).map((order) => ({ ...order }));
	}

	load(orders: readonly StandingOrder[]): void {
		this.#orders = [...orders].sort((a, b) => a.id - b.id);
	}
}

/** `{{standingOrders}}`: the empty string without orders, else the orders prompt with one line per order. */
export function renderOrders(prompts: PromptLookup | undefined, orders: readonly StandingOrder[]): string {
	if (orders.length === 0) return "";
	const lines = orders.map((order) => prompts?.render("core", LINE_PROMPTS[order.mode], { order: order.id, text: order.text }, ["order", "text"]) ?? `- ${order.mode} ${String(order.id)}: ${order.text}`);
	const list = lines.join("\n");
	return prompts?.render("core", ORDERS_PROMPT, { orders: list }, ["orders"]) ?? `\n\nStanding orders:\n${list}`;
}

/** A resident's turn input for the human's instruction. */
export function residentNote(prompts: PromptLookup | undefined, text: string): string {
	return prompts?.render("core", RESIDENT_PROMPT, { text }, ["text"]) ?? text;
}

/** Whether `name` may read the event. */
export function visibleTo(event: EventEnvelope, name: string): boolean {
	return event.audience === undefined || event.audience.includes(name);
}

/** The log as one overseer reads it: only the events for it (§4.1), filtered once per new event. */
export class AudienceLog implements EventLogView {
	readonly #bus: EventBus;
	readonly #name: string;
	#seen = 0;
	readonly #visible: EventEnvelope[] = [];

	constructor(bus: EventBus, name: string) {
		this.#bus = bus;
		this.#name = name;
	}

	get length(): number {
		return this.all().length;
	}

	all(): readonly EventEnvelope[] {
		if (this.#seen < this.#bus.lastSeq) {
			for (const event of this.#bus.since(this.#seen)) if (visibleTo(event, this.#name)) this.#visible.push(event);
			this.#seen = this.#bus.lastSeq;
		}
		return this.#visible;
	}

	since(seq: number): readonly EventEnvelope[] {
		return this.all().filter((event) => event.seq > seq);
	}

	ofType(source: string, type: string): readonly EventEnvelope[] {
		return this.all().filter((event) => event.source === source && event.type === type);
	}
}
