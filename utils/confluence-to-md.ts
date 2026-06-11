import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import TurndownService from "turndown";
import { containsJapanese, translateToEnglish } from "./translate";
import { loadEnv } from "./env-loader";

loadEnv(process.env.NODE_ENV ?? "example");

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const CONFLUENCE_USERNAME = process.env.CONFLUENCE_USERNAME;
const CONFLUENCE_PASSWORD = process.env.CONFLUENCE_PASSWORD;

async function fetchConfluencePage(pageId: string): Promise<{ title: string; html: string }> {
	if (!CONFLUENCE_BASE_URL || !CONFLUENCE_USERNAME || !CONFLUENCE_PASSWORD) {
		throw new Error("Missing required env vars: CONFLUENCE_BASE_URL, CONFLUENCE_USERNAME, CONFLUENCE_PASSWORD");
	}

	const auth = Buffer.from(`${CONFLUENCE_USERNAME}:${CONFLUENCE_PASSWORD}`).toString("base64");
	const url = `${CONFLUENCE_BASE_URL.replace(/\/$/, "")}/rest/api/content/${pageId}?expand=body.export_view,title`;

	const response = await axios.get<{
		title: string;
		body: { export_view: { value: string } };
	}>(url, {
		headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
	});

	return {
		title: response.data.title,
		html: response.data.body.export_view.value,
	};
}

function buildMarkdown(html: string): string {
	const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", hr: "---" });

	td.addRule("confluenceCode", {
		filter: "pre",
		replacement(_content, node) {
			const code = (node as Element).querySelector("code");
			const lang = code?.getAttribute("class")?.replace(/^language-/, "") ?? "";
			return `\n\`\`\`${lang}\n${(code?.textContent ?? _content).trim()}\n\`\`\`\n`;
		},
	});

	td.addRule("stripMacros", {
		filter: ["ac:structured-macro", "ac:parameter"],
		replacement: (content) => content,
	});

	return td.turndown(html);
}

function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+|-+$/g, "");
}

export async function confluenceToMarkdown(pageId: string, outputDir = "requirements"): Promise<string> {
	console.log(`Fetching Confluence page ${pageId}…`);
	const { title, html } = await fetchConfluencePage(pageId);

	console.log(`Converting HTML → Markdown…`);
	let markdown = buildMarkdown(html);

	if (containsJapanese(markdown)) {
		console.log(`Japanese content detected — translating to English…`);
		markdown = await translateToEnglish(markdown);
	}

	const date = new Date().toISOString().split("T")[0];
	const source = `${CONFLUENCE_BASE_URL}/pages/${pageId}`;

	const output = [
		`---`,
		`title: "${title}"`,
		`source: ${source}`,
		`fetched: ${date}`,
		`---`,
		``,
		`# ${title}`,
		``,
		markdown.trim(),
		``,
	].join("\n");

	fs.mkdirSync(outputDir, { recursive: true });
	const filePath = path.join(outputDir, `${slugify(title)}.md`);
	fs.writeFileSync(filePath, output, "utf-8");

	console.log(`Saved → ${filePath}`);
	return filePath;
}

// CLI: ts-node utils/confluence-to-md.ts <pageId> [outputDir]
if (require.main === module) {
	const pageId = process.argv[2];
	const outputDir = process.argv[3] ?? "requirements";

	if (!pageId) {
		console.error("Usage: ts-node utils/confluence-to-md.ts <confluence-page-id> [output-dir]");
		process.exit(1);
	}

	confluenceToMarkdown(pageId, outputDir).catch((err: Error) => {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	});
}
