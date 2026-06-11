import axios from "axios";

export const JAPANESE_REGEX = /[぀-ヿ一-鿿豈-﫿]/;

export function containsJapanese(text: string): boolean {
	return JAPANESE_REGEX.test(text);
}

export function splitIntoChunks(text: string, maxLen = 4500): string[] {
	const paragraphs = text.split(/\n{2,}/);
	const chunks: string[] = [];
	let current = "";

	for (const para of paragraphs) {
		const joined = current ? `${current}\n\n${para}` : para;
		if (joined.length > maxLen && current) {
			chunks.push(current);
			current = para;
		} else {
			current = joined;
		}
	}
	if (current) chunks.push(current);
	return chunks;
}

export async function translateChunk(text: string): Promise<string> {
	try {
		const response = await axios.get<[[string, string][]]>("https://translate.googleapis.com/translate_a/single", {
			params: { client: "gtx", sl: "auto", tl: "en", dt: "t", q: text },
		});
		return response.data[0].map((item) => item[0]).join("");
	} catch (err) {
		console.warn(`Translation failed, keeping original text. Reason: ${(err as Error).message}`);
		return text;
	}
}

export async function translateToEnglish(text: string): Promise<string> {
	const chunks = splitIntoChunks(text);
	const results: string[] = [];

	for (const chunk of chunks) {
		results.push(containsJapanese(chunk) ? await translateChunk(chunk) : chunk);
	}

	return results.join("\n\n");
}
