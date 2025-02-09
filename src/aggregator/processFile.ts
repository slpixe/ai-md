import path from 'path';
import { promises as fs } from 'fs';
import { isTextFile, shouldTreatAsBinary, getFileType } from '../utils/fileUtils.js';
import { DEFAULT_IGNORES } from '../utils/constants.js';
import ignore from 'ignore';
import { logger } from "../utils/logger.js";
import { escapeTripleBackticks, removeWhitespace } from "../utils/textUtils.js";

const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function processSingleFile(
	cwd: string,
	file: string,
	outputFile: string,
	useDefaultIgnores: boolean,
	defaultIgnore: ignore.Ignore,
customIgnore: ignore.Ignore,
cliIgnore: ignore.Ignore,
removeWhitespaceFlag: boolean
): Promise<{
	snippet: string;
	wasIncluded: boolean;
	defaultIgnored: boolean;
	customIgnored: boolean;
	isBinaryOrSvg: boolean;
}> {
try {
const absolutePath = path.join(cwd, file);
logger.debug(`Processing file: ${absolutePath}`);

if (absolutePath === outputFile) {
logger.debug(`Skipping output file: ${outputFile}`);
			return { snippet: '', wasIncluded: false, defaultIgnored: true, customIgnored: false, isBinaryOrSvg: false };
		}

		const relativePath = file;

if (useDefaultIgnores && defaultIgnore.ignores(relativePath)) {
logger.debug(`File ignored by default patterns: ${relativePath}`);
return { snippet: '', wasIncluded: false, defaultIgnored: true, customIgnored: false, isBinaryOrSvg: false };
}

if (customIgnore.ignores(relativePath)) {
logger.debug(`File ignored by custom patterns: ${relativePath}`);
return { snippet: '', wasIncluded: false, defaultIgnored: false, customIgnored: true, isBinaryOrSvg: false };
}

if (cliIgnore.ignores(relativePath)) {
logger.debug(`File ignored by CLI patterns: ${relativePath}`);
return { snippet: '', wasIncluded: false, defaultIgnored: false, customIgnored: true, isBinaryOrSvg: false };
}

const isText = await isTextFile(absolutePath);
const treatAsBinaryFile = shouldTreatAsBinary(absolutePath);
const fileStat = await fs.stat(absolutePath);

logger.debug(`File stats for ${relativePath}:
  - Size: ${(fileStat.size / 1024).toFixed(2)}KB
  - Is text file: ${isText}
  - Treat as binary: ${treatAsBinaryFile}`);

		if (fileStat.size > MAX_SINGLE_FILE_SIZE && isText && !treatAsBinaryFile) {
logger.debug(`File exceeds size limit (${(MAX_SINGLE_FILE_SIZE / 1024 / 1024).toFixed(1)}MB): ${relativePath}`);
			return {
				snippet: `# ${relativePath}\n\n(This text file is > ${(MAX_SINGLE_FILE_SIZE / 1024 / 1024).toFixed(1)} MB, skipping content.)\n\n`,
				wasIncluded: true,
				defaultIgnored: false,
				customIgnored: false,
				isBinaryOrSvg: false
			};
		}

		let snippet = '';
		const displayPath = path.relative(process.cwd(), absolutePath);

		if (isText && !treatAsBinaryFile) {
logger.debug(`Processing text file: ${relativePath}`);
			let content = await fs.readFile(absolutePath, 'utf-8');
			const extension = path.extname(file);
			content = escapeTripleBackticks(content);

if (removeWhitespaceFlag && !['.py', '.yaml', /* other extensions */].includes(extension)) {
const originalLength = content.length;
content = removeWhitespace(content);
logger.debug(`Whitespace removal for ${relativePath}:
  - Original length: ${originalLength}
  - New length: ${content.length}
  - Chars removed: ${originalLength - content.length}`);
}

			snippet += `# ${displayPath}\n\n\`\`\`${extension.slice(1)}\n${content}\n\`\`\`\n\n`;
			return { snippet, wasIncluded: true, defaultIgnored: false, customIgnored: false, isBinaryOrSvg: false };
		} else {
			const fileType = getFileType(absolutePath);
			snippet += `# ${displayPath}\n\n`;
			snippet += fileType === 'SVG Image'
				? `This is a file of the type: ${fileType}\n\n`
				: `This is a binary file of the type: ${fileType}\n\n`;
			return { snippet, wasIncluded: true, defaultIgnored: false, customIgnored: false, isBinaryOrSvg: true };
		}
} catch (error) {
const errorMessage = (error as Error).message;
const errorStack = (error as Error).stack;
logger.error(`❌ Error processing file ${file} in directory ${cwd}: ${errorMessage}`);
logger.debug(`Error stack trace: ${errorStack}`);
		return { snippet: '', wasIncluded: false, defaultIgnored: false, customIgnored: false, isBinaryOrSvg: false };
	}
}
