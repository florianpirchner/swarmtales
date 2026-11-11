/**
 * Ed25519 public keys as a run writes them (PEM `run.pub`, base64 SPKI DER in the genesis) and
 * signature checks, in pure JavaScript (`@noble/curves`). An Ed25519 SPKI DER is a fixed 12-byte
 * prefix (RFC 8410: SEQUENCE, AlgorithmIdentifier 1.3.101.112, BIT STRING) and the 32 key bytes.
 */
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, equalBytes, fromBase64, toBase64 } from "./bytes.ts";

const SPKI_PREFIX = Uint8Array.of(0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00);
const KEY_BYTES = 32;
const PEM = /-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/;

/** An Ed25519 public key: its raw 32 bytes and its SPKI DER in base64 (the genesis form). */
export interface PublicKey {
	readonly raw: Uint8Array;
	readonly der: string;
}

/** The key of an SPKI DER, or `undefined` when it is not an Ed25519 public key. */
function keyOfDer(der: Uint8Array): PublicKey | undefined {
	if (der.length !== SPKI_PREFIX.length + KEY_BYTES || !equalBytes(der.subarray(0, SPKI_PREFIX.length), SPKI_PREFIX)) return undefined;
	return { raw: der.slice(SPKI_PREFIX.length), der: toBase64(der) };
}

/** A key from base64 SPKI DER (the genesis and a checkpoint name it so). */
export function publicKeyFromDer(base64: string): PublicKey | undefined {
	const der = fromBase64(base64);
	return der === undefined ? undefined : keyOfDer(der);
}

/** A key from a PEM text (`run.pub`, a published copy). */
export function publicKeyFromPem(text: string): PublicKey | undefined {
	const body = PEM.exec(text)?.[1];
	return body === undefined ? undefined : publicKeyFromDer(body);
}

/**
 * A short name of a public key: the first 16 hex digits of the sha256 of its DER bytes. A text that
 * is no base64 gets no fingerprint (two junk keys must not share one): it is named as it was given.
 */
export function keyFingerprint(publicKey: string): string {
	const der = fromBase64(publicKey);
	return der === undefined ? `(not base64: ${JSON.stringify(publicKey.slice(0, 16))})` : bytesToHex(sha256(der)).slice(0, 16);
}

/**
 * Whether a base64 Ed25519 signature over `message` holds: RFC 8032 strict (`zip215: false`), at least
 * as strict as OpenSSL behind `node:crypto`, and stricter for small-order keys (OpenSSL accepts
 * R = identity, S = 0 under the identity key; this check does not).
 */
export function signatureVerifies(key: PublicKey, message: Uint8Array, signature: string): boolean {
	const bytes = fromBase64(signature);
	if (bytes?.length !== 64) return false;
	try {
		return ed25519.verify(bytes, message, key.raw, { zip215: false });
	} catch {
		return false;
	}
}
