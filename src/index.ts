#!/usr/bin/env node

import {program} from 'commander';
import {promises as fs} from 'fs';
import path from 'path';
import {glob} from 'glob';
import ignore, {type Ignore} from 'ignore';
import winston from 'winston';
import pLimit from 'p-limit';
import {
	createIgnoreFilter,
	DEFAULT_IGNORES,
	escapeTripleBackticks,
	estimateTokenCount,
	getFileType,
	isTextFile,
	removeWhitespace,
	shouldTreatAsBinary,
	WHITESPACE_DEPENDENT_EXTENSIONS
} from './utils.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Setup Winston logger
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
		winston.format.printf(({timestamp, level, message}) => `${timestamp} [${level}]: ${message}`)
	),
	transports: [new winston.transports.Console()]
});

/**
 * Reads lines from an ignore file in `fileDir/fileName`. If it doesn't exist, returns an empty array.
 */
async function readIgnoreFile(fileDir: string, fileName: string): Promise<string[]> {
	try {
		const filePath = path.join(fileDir, fileName);
		const content = await fs.readFile(filePath, 'utf-8');
		logger.info(`📄 Found ${fileName} file in ${fileDir}.`);
		return content
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '' && !line.startsWith('#'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			logger.warn(`❓ No ${fileName} file found in ${fileDir}.`);
			return [];
		}
		logger.error(
			`❌ Error reading ignore file ${fileName} in ${fileDir}: ${(error as Error).message}`
		);
		throw error;
	}
}

/**
 * Collect all file paths (relative) + their `cwd` from the given input paths.
 */
async function gatherFiles(inputPaths: string[]): Promise<{ cwd: string; file: string }[]> {
	const allFiles: { cwd: string; file: string }[] = [];

	for (const inputPath of inputPaths) {
		try {
			const resolved = path.resolve(inputPath);
			const stat = await fs.stat(resolved);

			if (stat.isDirectory()) {
				// Gather all files within the directory
				const filesInDir = await glob('**/*', {
					nodir: true,
					dot: true,
					cwd: resolved
				});
				for (const f of filesInDir) {
					allFiles.push({cwd: resolved, file: f});
				}
			} else {
				// It's a single file
				const parent = path.dirname(resolved);
				const justFile = path.basename(resolved);
				allFiles.push({cwd: parent, file: justFile});
			}
		} catch (error) {
			logger.error(`❌ Error gathering files for path ${inputPath}: ${(error as Error).message}`);
			throw error;
		}
	}

	return allFiles;
}

/**
 * Creates a single file snippet if included, or returns empty snippet if ignored.
 * Also returns info about whether it's binary or SVG for counting.
 */
async function processSingleFile(
	cwd: string,
	file: string,
	outputFile: string,
	useDefaultIgnores: boolean,
	defaultIgnore: Ignore,
	customIgnore: Ignore,
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

		// Skip if it's exactly the same as the final output file
		if (absolutePath === outputFile) {
			return {
				snippet: '',
				wasIncluded: false,
				defaultIgnored: true,
				customIgnored: false,
				isBinaryOrSvg: false
			};
		}

		const relativePath = file;

		// Check default ignores
		if (useDefaultIgnores && defaultIgnore.ignores(relativePath)) {
			return {
				snippet: '',
				wasIncluded: false,
				defaultIgnored: true,
				customIgnored: false,
				isBinaryOrSvg: false
			};
		}

		// Check custom ignores
		if (customIgnore.ignores(relativePath)) {
			return {
				snippet: '',
				wasIncluded: false,
				defaultIgnored: false,
				customIgnored: true,
				isBinaryOrSvg: false
			};
		}

		// Check if it is text or binary
		const isText = await isTextFile(absolutePath);
		const treatAsBinaryFile = shouldTreatAsBinary(absolutePath);

		// Skip large text files
		const fileStat = await fs.stat(absolutePath);
		if (fileStat.size > MAX_SINGLE_FILE_SIZE && isText && !treatAsBinaryFile) {
			return {
				snippet: `# ${relativePath}\n\n(This text file is > ${
					(MAX_SINGLE_FILE_SIZE / 1024 / 1024).toFixed(1)
				} MB, skipping content.)\n\n`,
				wasIncluded: true,
				defaultIgnored: false,
				customIgnored: false,
				isBinaryOrSvg: false
			};
		}

		let snippet = '';
		// Display path to file as relative to the user's current working directory
		const displayPath = path.relative(process.cwd(), absolutePath);

		if (isText && !treatAsBinaryFile) {
			// It's text; read the contents
			let content = await fs.readFile(absolutePath, 'utf-8');
			const extension = path.extname(file);

			// Escape backticks to avoid messing up code blocks
			content = escapeTripleBackticks(content);

			// Optionally remove whitespace
			if (removeWhitespaceFlag && !WHITESPACE_DEPENDENT_EXTENSIONS.includes(extension)) {
				content = removeWhitespace(content);
			}

			snippet += `# ${displayPath}\n\n`;
			snippet += `\`\`\`${extension.slice(1)}\n`;
			snippet += content;
			snippet += `\n\`\`\`\n\n`;

			return {
				snippet,
				wasIncluded: true,
				defaultIgnored: false,
				customIgnored: false,
				isBinaryOrSvg: false
			};
		} else {
			// It's binary or SVG
			const fileType = getFileType(absolutePath);
			snippet += `# ${displayPath}\n\n`;
			if (fileType === 'SVG Image') {
				snippet += `This is a file of the type: ${fileType}\n\n`;
			} else {
				snippet += `This is a binary file of the type: ${fileType}\n\n`;
			}

			return {
				snippet,
				wasIncluded: true,
				defaultIgnored: false,
				customIgnored: false,
				isBinaryOrSvg: true
			};
		}
	} catch (error) {
		logger.error(
			`❌ Error processing file ${file} in directory ${cwd}: ${(error as Error).message}`
		);
		return {
			snippet: '',
			wasIncluded: false,
			defaultIgnored: false,
			customIgnored: false,
			isBinaryOrSvg: false
		};
	}
}

/**
 * Display an ordered list of included files in the console.
 */
function displayIncludedFiles(includedFiles: string[]): void {
	logger.info('📋 Files included in the output:');
	includedFiles.forEach((file, index) => {
		logger.info(`  ${index + 1}. ${file}`);
	});
}

/**
 * Sort function that does "natural sorting" on file paths.
 */
function naturalSort(a: string, b: string): number {
	return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
}

/**
 * The main aggregator that merges all files into a single Markdown file.
 */
async function aggregateFiles(
	inputPaths: string[],
	outputFile: string,
	useDefaultIgnores: boolean,
	removeWhitespaceFlag: boolean,
	showOutputFiles: boolean,
	ignoreFilePath: string,
	enableConcurrency: boolean,
	dryRun: boolean
): Promise<void> {
	try {
		const startTime = Date.now();

		// 1) Load custom ignore patterns
		const ignoreDir = path.dirname(ignoreFilePath);
		const ignoreName = path.basename(ignoreFilePath);
		const userIgnorePatterns = await readIgnoreFile(ignoreDir, ignoreName);

		// 2) Setup default vs custom ignore
		const defaultIgnore = useDefaultIgnores ? ignore().add(DEFAULT_IGNORES) : ignore();
		const customIgnore = createIgnoreFilter(userIgnorePatterns, ignoreName);

		logger.info(
			useDefaultIgnores
				? '📄 Using default ignore patterns.'
				: '🛠️ Custom ignore patterns enabled.'
		);
		if (userIgnorePatterns.length > 0) {
			logger.info(`📄 Ignore patterns from ${ignoreName}:`);
			userIgnorePatterns.forEach((pattern) => logger.info(` - ${pattern}`));
		}

		if (removeWhitespaceFlag) {
			logger.info('🧹 Whitespace removal enabled (except for whitespace-dependent languages).');
		} else {
			logger.info('📝 Whitespace removal disabled.');
		}

		// 3) Gather all files
		const allFiles = await gatherFiles(inputPaths);
		logger.info(`🔍 Found ${allFiles.length} file paths across all inputs. Applying filters...`);

		// 4) Sort them in natural order
		allFiles.sort((a, b) => {
			const fullA = path.join(a.cwd, a.file);
			const fullB = path.join(b.cwd, b.file);
			return naturalSort(fullA, fullB);
		});

		// 5) Concurrency setup
		const limit = enableConcurrency ? pLimit(5) : null;

		// Wrap file-processing in concurrency logic if set
		const processFile = async (fileObj: { cwd: string; file: string }) => {
			if (limit) {
				return limit(() =>
					processSingleFile(
						fileObj.cwd,
						fileObj.file,
						outputFile,
						useDefaultIgnores,
						defaultIgnore,
						customIgnore,
						removeWhitespaceFlag
					)
				);
			} else {
				return processSingleFile(
					fileObj.cwd,
					fileObj.file,
					outputFile,
					useDefaultIgnores,
					defaultIgnore,
					customIgnore,
					removeWhitespaceFlag
				);
			}
		};

		// 6) Process all files
		const results = await Promise.all(allFiles.map(processFile));

		// 7) Aggregate results
		const outputChunks: string[] = [];
		let includedCount = 0;
		let defaultIgnoredCount = 0;
		let customIgnoredCount = 0;
		let binaryAndSvgFileCount = 0;
		const includedFiles: string[] = [];

		for (const result of results) {
			if (result.defaultIgnored) defaultIgnoredCount++;
			if (result.customIgnored) customIgnoredCount++;

			if (result.wasIncluded) {
				outputChunks.push(result.snippet);

				// Grab the first heading line (# path) to store in includedFiles
				const match = result.snippet.match(/^# (.+)\n/m);
				if (match) {
					includedFiles.push(match[1].trim());
				}

				includedCount++;
				if (result.isBinaryOrSvg) binaryAndSvgFileCount++;
			}
		}

		// 8) Build final output text
		const finalOutput = outputChunks.join('');

		// 9) Write the file unless it's a dry run
		let fileSizeInBytes = Buffer.byteLength(finalOutput);
		if (!dryRun) {
			// Actually write the file
			await fs.mkdir(path.dirname(outputFile), {recursive: true});
			await fs.writeFile(outputFile, finalOutput, {flag: 'w'});

			// Verify correct file size on disk
			const stats = await fs.stat(outputFile);
			if (stats.size !== fileSizeInBytes) {
				throw new Error('❌ File size mismatch after writing');
			}

			logger.info(`✅ Files aggregated successfully into ${outputFile}`);
		} else {
			logger.info(`🔎 Dry run mode: No file will be written to "${outputFile}"`);
			logger.info('✅ Aggregation "would" have been successful, but no file was written.');
		}

		// 10) Show summary logs
		logger.info(`📚 Total files found: ${allFiles.length}`);
		logger.info(`📎 Files included in output: ${includedCount}`);
		logger.info(`🚫 Files ignored by default patterns: ${defaultIgnoredCount}`);
		logger.info(`🚫 Files ignored by custom patterns: ${customIgnoredCount}`);
		logger.info(`📦 Binary and SVG files included: ${binaryAndSvgFileCount}`);

		// 11) Check size or estimate tokens (we can still do this in dry-run mode too)
		if (fileSizeInBytes > MAX_FILE_SIZE) {
			logger.warn(
				`⚠️ Warning: Output file size (${(fileSizeInBytes / 1024 / 1024).toFixed(
					2
				)} MB) exceeds 10 MB.`
			);
			logger.warn('⚠️ Token count estimation skipped due to large file size.');
			logger.warn('💡 Consider adding more files to ignore patterns to reduce the output size.');
		} else {
			// We can still estimate tokens from finalOutput in memory
			const tokenCount = await estimateTokenCount(finalOutput);
			logger.info(`🔢 Estimated token count: ${tokenCount}`);
			logger.info(
				'⚠️ Note: Token count is an approximation using GPT-4 tokenizer. For ChatGPT, it should be accurate. For Claude, ±20%.'
			);
		}

		// 12) Optionally show the included files
		if (showOutputFiles) {
			displayIncludedFiles(includedFiles);
		}

		// Final log messages
		const endTime = Date.now();
		const elapsed = endTime - startTime;
		if (!dryRun) {
			logger.info(`✅ Done! Wrote code base to ${outputFile}`);
		} else {
			logger.info('✅ Done (dry run). No file was created.');
		}
		logger.info(`⏱️  Aggregation took ${elapsed} ms`);
	} catch (error) {
		logger.error(`❌ Error aggregating files: ${(error as Error).message}`);
		process.exit(1);
	}
}

/**
 * Attach CLI logic to Commander
 */
program
	.version('1.0.0')
	.description('Aggregate files into a single Markdown file')
	.option('-i, --input <paths...>', 'Input file(s) or folder(s)')
	.option('-o, --output <file>', 'Output file name', 'codebase.md')
	.option('--no-default-ignores', 'Disable default ignore patterns')
	.option('--whitespace-removal', 'Enable whitespace removal')
	.option('--show-output-files', 'Display a list of files included in the output')
	.option('--ignore-file <file>', 'Custom ignore file name', '.aidigestignore')
	.option('--concurrent', 'Enable concurrency for processing files')
	.option('--dry-run', 'Show which files would be included but do not write the file')
	.action(async (options) => {
		const inputPaths = options.input || [process.cwd()];
		const outputFile = path.isAbsolute(options.output)
			? options.output
			: path.join(process.cwd(), options.output);

		const ignoreFileAbsolute = path.isAbsolute(options.ignoreFile)
			? options.ignoreFile
			: path.join(process.cwd(), options.ignoreFile);

		await aggregateFiles(
			inputPaths,
			outputFile,
			options.defaultIgnores,
			options.whitespaceRemoval,
			options.showOutputFiles,
			ignoreFileAbsolute,
			options.concurrent,
			options.dryRun
		);
	});

program.parse(process.argv);
