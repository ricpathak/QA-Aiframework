import fs from "fs";
import path from "path";
import { LogLevel } from "shared/types";

const SENSITIVE_KEY_PATTERNS = ["PASSWORD", "TOKEN", "SECRET", "USERNAME", "CREDENTIAL"];

function redact(message: string): string {
	let result = String(message);
	for (const [key, value] of Object.entries(process.env)) {
		if (!value || value.length < 4) continue;
		if (SENSITIVE_KEY_PATTERNS.some((p) => key.toUpperCase().includes(p))) {
			result = result.replaceAll(value, "***");
		}
	}
	return result;
}

export class Logger {
	private static logFilePath = path.join(__dirname, "logs", "automation.log");

	private static log(level: LogLevel, message: string) {
		const timestamp = new Date().toLocaleString();
		const safe = redact(message);
		const logMessage = `${timestamp} ${level}: ${safe}`;
		console.log(logMessage);
		fs.mkdirSync(path.dirname(Logger.logFilePath), { recursive: true });
		fs.appendFileSync(Logger.logFilePath, logMessage + "\n");
	}

	public static info(message: any) {
		Logger.log("INFO", message);
	}

	public static warn(message: any) {
		Logger.log("WARN", message);
	}

	public static error(message: any) {
		Logger.log("ERROR", message);
	}

	public static debug(message: any) {
		Logger.log("DEBUG", message);
	}
}
