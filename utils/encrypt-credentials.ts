import * as fs from "fs";
import * as readline from "readline";
import { decryptValue, encryptValue, isEncrypted } from "./crypto-helper";

const CREDENTIAL_KEY_PATTERNS = ["PASSWORD", "TOKEN", "SECRET", "USERNAME", "USER", "CREDENTIAL"];

function isCredentialKey(key: string): boolean {
	const upper = key.toUpperCase();
	return CREDENTIAL_KEY_PATTERNS.some((pattern) => upper.includes(pattern));
}

function parseEnvLine(line: string): { key: string; value: string; rest: string } | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) return null;

	const eqIdx = trimmed.indexOf("=");
	if (eqIdx === -1) return null;

	const key = trimmed.slice(0, eqIdx).trim();
	const rest = trimmed.slice(eqIdx + 1);
	const valueMatch = rest.match(/^([^#\s]*)(.*)?$/);
	const value = valueMatch?.[1] ?? "";
	const tail = valueMatch?.[2] ?? "";

	return { key, value, rest: tail };
}

async function askSecretKey(): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question("Enter SECRET_KEY: ", (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function processEnvFile(filePath: string, secretKey: string, verify: boolean): Promise<void> {
	const lines = fs.readFileSync(filePath, "utf-8").split("\n");
	const output: string[] = [];
	let changed = 0;
	let skipped = 0;

	for (const line of lines) {
		const parsed = parseEnvLine(line);

		if (!parsed || !isCredentialKey(parsed.key) || !parsed.value) {
			output.push(line);
			continue;
		}

		if (isEncrypted(parsed.value)) {
			if (verify) {
				try {
					decryptValue(parsed.value, secretKey);
					console.log(`✓  ${parsed.key} — decrypts OK`);
				} catch {
					console.error(`✗  ${parsed.key} — decryption FAILED (wrong SECRET_KEY?)`);
					process.exit(1);
				}
			} else {
				skipped++;
			}
			output.push(line);
			continue;
		}

		if (verify) {
			console.log(`⚠  ${parsed.key} — not yet encrypted`);
			output.push(line);
		} else {
			const encrypted = encryptValue(parsed.value, secretKey);
			output.push(`${parsed.key}=${encrypted}${parsed.rest}`);
			changed++;
		}
	}

	if (!verify) {
		fs.writeFileSync(filePath, output.join("\n"), "utf-8");
		console.log(`\nDone: ${changed} encrypted, ${skipped} already encrypted — ${filePath}`);
	}
}

(async () => {
	const filePath = process.argv[2];
	const verify = process.argv.includes("--verify");

	if (!filePath) {
		console.error("Usage: ts-node utils/encrypt-credentials.ts <env-file> [--verify]");
		process.exit(1);
	}
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		process.exit(1);
	}

	const secretKey = process.env.SECRET_KEY || (await askSecretKey());
	if (!secretKey) {
		console.error("SECRET_KEY is required");
		process.exit(1);
	}

	await processEnvFile(filePath, secretKey, verify);
})();
