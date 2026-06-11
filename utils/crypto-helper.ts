import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const ENC_PREFIX = "enc:";

function deriveKey(secret: string): Buffer {
	return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptValue(plain: string, secret: string): string {
	const key = deriveKey(secret);
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();

	return `${ENC_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptValue(encoded: string, secret: string): string {
	if (!isEncrypted(encoded)) {
		throw new Error(`Value does not have the "${ENC_PREFIX}" prefix`);
	}

	const parts = encoded.slice(ENC_PREFIX.length).split(":");
	if (parts.length !== 3) {
		throw new Error("Malformed encrypted value — expected enc:<iv>:<tag>:<ciphertext>");
	}

	const [ivHex, tagHex, ciphertextHex] = parts;
	const key = deriveKey(secret);
	const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
	decipher.setAuthTag(Buffer.from(tagHex, "hex"));

	return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
}

export function isEncrypted(value: string): boolean {
	return value.startsWith(ENC_PREFIX);
}
