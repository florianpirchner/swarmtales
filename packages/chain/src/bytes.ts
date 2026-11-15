// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Byte helpers without `Buffer` (the package runs in a browser): UTF-8, hex and standard base64
 * (RFC 4648 §4, with padding), the forms `node:crypto` writes a key and a signature in.
 */
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export { bytesToHex, utf8ToBytes };

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const VALUES: ReadonlyMap<string, number> = new Map(Array.from({ length: ALPHABET.length }, (_, index) => [ALPHABET.charAt(index), index]));

/**
 * Standard base64 with `=` padding.
 *
 * @param bytes - The bytes to encode.
 * @returns The base64 text.
 */
export function toBase64(bytes: Uint8Array): string {
	let out = "";
	for (let index = 0; index < bytes.length; index += 3) {
		const a = bytes[index] ?? 0;
		const b = bytes[index + 1];
		const c = bytes[index + 2];
		const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
		out += ALPHABET.charAt((triple >> 18) & 63) + ALPHABET.charAt((triple >> 12) & 63);
		out += b === undefined ? "=" : ALPHABET.charAt((triple >> 6) & 63);
		out += c === undefined ? "=" : ALPHABET.charAt(triple & 63);
	}
	return out;
}

/**
 * Decodes standard base64 (padding optional, whitespace ignored).
 *
 * @param text - The base64 text.
 * @returns The bytes; `undefined` for any other character, a length no base64 text has, padding that does not
 * fill the last quantum, or unused bits that are not zero (so one byte string has one text, apart from the
 * optional padding).
 */
export function fromBase64(text: string): Uint8Array | undefined {
	const compact = text.replace(/\s+/g, "");
	const clean = compact.replace(/={1,2}$/, "");
	if (clean.length % 4 === 1) return undefined;
	if (clean.length !== compact.length && compact.length % 4 !== 0) return undefined;
	const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
	let bits = 0;
	let buffer = 0;
	let written = 0;
	for (const char of clean) {
		const value = VALUES.get(char);
		if (value === undefined) return undefined;
		// At most 13 bits are pending, so 14 keep the value small.
		buffer = ((buffer << 6) | value) & 0x3fff;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out[written] = (buffer >> bits) & 255;
			written += 1;
		}
	}
	if ((buffer & ((1 << bits) - 1)) !== 0) return undefined;
	return out;
}

/**
 * Compares two byte strings.
 *
 * @param left - One byte string.
 * @param right - The other.
 * @returns True when both hold the same bytes.
 */
export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
	return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
