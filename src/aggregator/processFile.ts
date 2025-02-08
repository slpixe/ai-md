import path from 'path';
import { promises as fs } from 'fs';
import { isTextFile, shouldTreatAsBinary, getFileType } from '../utils/fileUtils.js';
import { DEFAULT_IGNORES } from '../utils/constants.js';
import ignore from 'ignore';
import {logger} from "../utils/logger.js";
import {escapeTripleBackticks, removeWhitespace} from "../utils/textUtils.js";

const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function processSingleFile(
	cwd: string,
	file: string,
	outputFile: string,
	useDefaultIgnores: boolean,
	defaultIgnore: ignore.Ignore,
	customIgnore: ignore.Ignore,
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
		if (absolutePath === outputFile) {
			return { snippet: '', wasIncluded: false, defaultIgnored: true, customIgnored: false, isBinaryOrSvg: false };
		}

		const relativePath = file;

		if (useDefaultIgnores && defaultIgnore.ignores(relativePath)) {
			return { snippet: '', wasIncluded: false, defaultIgnored: true, customIgnored: false, isBinaryOrSvg: false };
		}

		if (customIgnore.ignores(relativePath)) {
			return { snippet: '', wasIncluded: false, defaultIgnored: false, customIgnored: true, isBinaryOrSvg: false };
		}

		const isText = await isTextFile(absolutePath);
		const treatAsBinaryFile = shouldTreatAsBinary(absolutePath);
		const fileStat = await fs.stat(absolutePath);

		if (fileStat.size > MAX_SINGLE_FILE_SIZE && isText && !treatAsBinaryFile) {
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
			let content = await fs.readFile(absolutePath, 'utf-8');
			const extension = path.extname(file);
			content = escapeTripleBackticks(content);

			if (removeWhitespaceFlag && !['.py', '.yaml', /* other extensions */].includes(extension)) {
				content = removeWhitespace(content);
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
		logger.error(`❌ Error processing file ${file} in directory ${cwd}: ${(error as Error).message}`);
		return { snippet: '', wasIncluded: false, defaultIgnored: false, customIgnored: false, isBinaryOrSvg: false };
	}
}
