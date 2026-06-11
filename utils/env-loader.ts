import * as dotenv from "dotenv";
import * as path from "path";
import { decryptValue, isEncrypted } from "./crypto-helper";

export const loadEnv = (env: string = "example") => {
	const envPath = path.resolve(__dirname, `../environments/${env}.env`);
	dotenv.config({ path: envPath });
	decryptEnvVars();
};

function decryptEnvVars(): void {
	const encryptedEntries = Object.entries(process.env).filter(([, v]) => v && isEncrypted(v));
	if (encryptedEntries.length === 0) return;

	const secretKey = process.env.SECRET_KEY;
	if (!secretKey) {
		const keys = encryptedEntries.map(([k]) => k).join(", ");
		throw new Error(`SECRET_KEY must be set to decrypt encrypted credentials: ${keys}`);
	}

	for (const [key, value] of encryptedEntries) {
		try {
			process.env[key] = decryptValue(value!, secretKey);
		} catch {
			throw new Error(`Failed to decrypt "${key}" — verify SECRET_KEY is correct`);
		}
	}
}

export function validateEnv(required: string[]): void {
	const missing = required.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}
}
