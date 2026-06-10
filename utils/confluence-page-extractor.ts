import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { loadEnv } from "./env-loader";

export interface ConfluenceExportOptions {
	pageId?: string;
	baseUrl?: string;
	username?: string;
	apiToken?: string;
	outputDir?: string;
	fileName?: string;
}

const ensureValue = (value: string | undefined, name: string): string => {
	if (!value || value.trim() === "") {
		throw new Error(`Missing environment value or option: ${name}`);
	}

	return value;
};

const sanitizeFileName = (name: string): string => {
	return name
		.trim()
		.replace(/[/\\?%*:|"<>]/g, "-")
		.replace(/\s+/g, " ")
		.replace(/\.+$/, "");
};

const stripTags = (value: string): string => {
	return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
};

const htmlToMarkdown = (html: string): string => {
	let markdown = html;

	markdown = markdown.replace(/<br\s*\/?>/gi, "\n");
	markdown = markdown.replace(/<ac:structured-macro[^>]*ac:name="code"[^>]*>[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/gi, "```\n$1\n```");
	markdown = markdown.replace(/<ac:structured-macro[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi, "");

	markdown = markdown.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
		const prefix = "#".repeat(Number(level));
		return `${prefix} ${stripTags(content)}\n\n`;
	});

	markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => `${stripTags(content)}\n\n`);
	markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
	markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
	markdown = markdown.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
	markdown = markdown.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
	markdown = markdown.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

	markdown = markdown.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => `- ${stripTags(content)}\n`);
	markdown = markdown.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, "");

	markdown = markdown.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, (_, content) => `| ${stripTags(content)} `);
	markdown = markdown.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (_, content) => `| ${stripTags(content)} `);
	markdown = markdown.replace(/<tr[^>]*>/gi, "\n");
	markdown = markdown.replace(/<\/tr>/gi, " |\n");
	markdown = markdown.replace(/<table[^>]*>|<\/table>/gi, "\n");

	markdown = markdown.replace(/<[^>]+>/g, "");
	markdown = markdown.replace(/\n{3,}/g, "\n\n");
	markdown = markdown.replace(/^[ \t]+|[ \t]+$/gm, "");

	return markdown.trim() + "\n";
};

export const exportConfluencePageToMarkdown = async (
	options: ConfluenceExportOptions = {},
): Promise<string> => {
	if (!process.env.CONFLUENCE_BASE_URL && !options.baseUrl) {
		loadEnv(process.env.NODE_ENV || "example");
	}

	const baseUrl = ensureValue(options.baseUrl ?? process.env.CONFLUENCE_BASE_URL, "CONFLUENCE_BASE_URL");
	const pageId = ensureValue(options.pageId ?? process.env.CONFLUENCE_PAGE_ID, "CONFLUENCE_PAGE_ID");
	const username = ensureValue(options.username ?? process.env.CONFLUENCE_USERNAME, "CONFLUENCE_USERNAME");
	const apiToken = ensureValue(options.apiToken ?? process.env.CONFLUENCE_API_TOKEN, "CONFLUENCE_API_TOKEN");

	const normalizedBaseUrl = baseUrl.replace(/\/+$/g, "");
	const url = `${normalizedBaseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage,version,space,title`;

	const auth = Buffer.from(`${username}:${apiToken}`).toString("base64");

	const response = await axios.get(url, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: "application/json",
		},
	});

	const page = response.data;
	const storageValue = page?.body?.storage?.value;
	const pageTitle = page?.title || pageId;

	if (!storageValue) {
		throw new Error("Unable to read Confluence page storage content.");
	}

	const markdown = htmlToMarkdown(storageValue);
	const outputDir = options.outputDir ? path.resolve(options.outputDir) : path.resolve(process.cwd(), "confluence-export");
	const outputFileName = sanitizeFileName(options.fileName ?? `${pageTitle}.md`);
	const outputPath = path.join(outputDir, outputFileName);

	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(outputPath, markdown, "utf8");

	return outputPath;
};

export default exportConfluencePageToMarkdown;
