import * as ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";
import { containsJapanese, translateToEnglish } from "./translate";
import { loadEnv } from "./env-loader";

loadEnv(process.env.NODE_ENV ?? "example");

function cellToString(cell: ExcelJS.Cell): string {
	if (cell.value === null || cell.value === undefined) return "";
	const v = cell.value;
	if (typeof v === "object" && "richText" in v) {
		return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
	}
	if (typeof v === "object" && "result" in v) {
		return String((v as ExcelJS.CellFormulaValue).result ?? "");
	}
	if (v instanceof Date) {
		return v.toISOString().split("T")[0];
	}
	return String(v);
}

function rowsToMarkdownTable(rows: string[][]): string {
	if (rows.length === 0) return "";

	const [header, ...body] = rows;
	const colCount = Math.max(header.length, ...body.map((r) => r.length));
	const padded = {
		header: Array.from({ length: colCount }, (_, i) => header[i] ?? ""),
		body: body.map((r) => Array.from({ length: colCount }, (_, i) => r[i] ?? "")),
	};

	const colWidths = Array.from({ length: colCount }, (_, i) =>
		Math.max(padded.header[i].length, ...padded.body.map((r) => r[i].length), 3),
	);

	const pad = (s: string, len: number) => s.padEnd(len);
	const divider = colWidths.map((w) => "-".repeat(w));

	return [
		`| ${padded.header.map((h, i) => pad(h, colWidths[i])).join(" | ")} |`,
		`| ${divider.join(" | ")} |`,
		...padded.body.map((row) => `| ${row.map((c, i) => pad(c, colWidths[i])).join(" | ")} |`),
	].join("\n");
}

function extractRows(worksheet: ExcelJS.Worksheet): string[][] {
	const rows: string[][] = [];

	worksheet.eachRow({ includeEmpty: false }, (row) => {
		const cells: string[] = [];
		row.eachCell({ includeEmpty: true }, (cell) => {
			cells.push(cellToString(cell));
		});
		while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
		if (cells.length > 0) rows.push(cells);
	});

	return rows;
}

async function sheetToMarkdown(worksheet: ExcelJS.Worksheet): Promise<string> {
	const rows = extractRows(worksheet);
	if (rows.length === 0) return "";

	const firstRowLooksLikeHeader =
		rows.length > 1 && rows[0].every((cell) => cell.trim() !== "") && rows[0].some((c) => isNaN(Number(c)));

	let content = firstRowLooksLikeHeader ? rowsToMarkdownTable(rows) : rows.map((r) => `- ${r.join(" | ")}`).join("\n");

	if (containsJapanese(content)) {
		console.log(`  Translating sheet "${worksheet.name}"…`);
		content = await translateToEnglish(content);
	}

	return content;
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+|-+$/g, "");
}

export async function excelToMarkdown(filePath: string, outputDir = "requirements"): Promise<string> {
	const workbook = new ExcelJS.Workbook();
	const ext = path.extname(filePath).toLowerCase();

	console.log(`Reading ${path.basename(filePath)}…`);

	if (ext === ".csv") {
		await workbook.csv.readFile(filePath);
	} else {
		await workbook.xlsx.readFile(filePath);
	}

	const fileName = path.basename(filePath, ext);
	const date = new Date().toISOString().split("T")[0];
	const sections: string[] = [];

	for (const sheet of workbook.worksheets) {
		if (sheet.rowCount === 0) continue;
		console.log(`Processing sheet: "${sheet.name}"`);
		const content = await sheetToMarkdown(sheet);
		if (content) sections.push(`## ${sheet.name}\n\n${content}`);
	}

	if (sections.length === 0) throw new Error(`No content found in ${filePath}`);

	const title = fileName.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

	const output = [
		`---`,
		`title: "${title}"`,
		`source: ${path.resolve(filePath)}`,
		`sheets: ${workbook.worksheets.length}`,
		`converted: ${date}`,
		`---`,
		``,
		`# ${title}`,
		``,
		sections.join("\n\n"),
		``,
	].join("\n");

	fs.mkdirSync(outputDir, { recursive: true });
	const outPath = path.join(outputDir, `${slugify(fileName)}.md`);
	fs.writeFileSync(outPath, output, "utf-8");

	console.log(`Saved → ${outPath}`);
	return outPath;
}

// CLI: ts-node utils/excel-to-md.ts <file-or-directory> [output-dir]
if (require.main === module) {
	const input = process.argv[2];
	const outputDir = process.argv[3] ?? "requirements";

	if (!input) {
		console.error("Usage: ts-node utils/excel-to-md.ts <excel-file-or-directory> [output-dir]");
		process.exit(1);
	}

	const run = async () => {
		const stat = fs.statSync(input);
		if (stat.isDirectory()) {
			const files = fs.readdirSync(input).filter((f) => /\.(xlsx?|csv)$/i.test(f));
			if (files.length === 0) throw new Error(`No Excel/CSV files found in ${input}`);
			for (const file of files) await excelToMarkdown(path.join(input, file), outputDir);
		} else {
			await excelToMarkdown(input, outputDir);
		}
	};

	run().catch((err: Error) => {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	});
}
