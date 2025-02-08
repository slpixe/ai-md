import path from "path";
import {readIgnoreFile} from "./ignoreHandler.js";
import ignore from "ignore";
import {DEFAULT_IGNORES, MAX_FILE_SIZE} from "../utils/constants.js";
import {logger} from "../utils/logger.js";
import {gatherFiles} from "./gatherFiles.js";
import {naturalSort} from "./sorter.js";
import pLimit from "p-limit";
import {processSingleFile} from "./processFile.js";
import fs from "fs/promises";
import {estimateTokenCount} from "../utils/tokenUtils.js";
import {displayIncludedFiles} from "./display.js";
import {createIgnoreFilter} from "../utils/ignoreUtils.js";

/**
 * The main aggregator that merges all files into a single Markdown file.
 */
export async function aggregateFiles(
	inputPaths: string[],
	outputFile: string,
	useDefaultIgnores: boolean,
	removeWhitespaceFlag: boolean,
	showOutputFiles: boolean,
	ignoreFilePath: string,
	enableConcurrency: boolean | number,
dryRun: boolean
): Promise<void> {
try {
const startTime = Date.now();
logger.debug('Starting file aggregation process');

		// 1) Load custom ignore patterns
		const ignoreDir = path.dirname(ignoreFilePath);
		const ignoreName = path.basename(ignoreFilePath);
		const userIgnorePatterns = await readIgnoreFile(ignoreDir, ignoreName);

// 2) Setup default vs custom ignore
const defaultIgnore = useDefaultIgnores ? ignore().add(DEFAULT_IGNORES) : ignore();
const customIgnore = createIgnoreFilter(userIgnorePatterns, ignoreName);

logger.debug(`Default ignore patterns: ${useDefaultIgnores ? DEFAULT_IGNORES.join(', ') : 'disabled'}`);
logger.debug(`Custom ignore patterns from ${ignoreName}: ${userIgnorePatterns.join(', ') || 'none'}`);

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
		const gatherStartTime = Date.now();
const allFiles = await gatherFiles(inputPaths);
const gatherEndTime = Date.now();
logger.debug(`File gathering took ${gatherEndTime - gatherStartTime}ms`);
		logger.info(`🔍 Found ${allFiles.length} file paths across all inputs. Applying filters...`);

// 4) Sort them in natural order
logger.debug('Sorting files in natural order');
allFiles.sort((a, b) => {
			const fullA = path.join(a.cwd, a.file);
			const fullB = path.join(b.cwd, b.file);
			return naturalSort(fullA, fullB);
		});

// 5) Concurrency setup
		let concurrencyLevel = 0;
		if (enableConcurrency && typeof enableConcurrency === 'number') {
			concurrencyLevel = enableConcurrency;
		} else if (enableConcurrency) {
			concurrencyLevel = 4;
		}

if (concurrencyLevel > 0) {
logger.info(`🔄 Using concurrent processing with ${concurrencyLevel} workers`);
logger.debug(`Concurrency enabled: ${concurrencyLevel} simultaneous file operations`);
} else {
logger.info('🔄 Running sequentially (no concurrency)');
logger.debug('Concurrency disabled: processing files sequentially');
}

		const limit = concurrencyLevel > 0 ? pLimit(concurrencyLevel) : null;

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
const processingStartTime = Date.now();
logger.debug('Starting file processing');
const results = await Promise.all(allFiles.map(processFile));
const processingEndTime = Date.now();
logger.debug(`File processing took ${processingEndTime - processingStartTime}ms`);

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
logger.debug('Building final output text');
const finalOutput = outputChunks.join('');
logger.debug(`Final output size: ${(Buffer.byteLength(finalOutput) / 1024).toFixed(2)}KB`);

		// 9) Write the file unless it's a dry run
		let fileSizeInBytes = Buffer.byteLength(finalOutput);
if (!dryRun) {
// Actually write the file
logger.debug(`Creating output directory: ${path.dirname(outputFile)}`);
await fs.mkdir(path.dirname(outputFile), {recursive: true});

logger.debug('Writing output file');
const writeStartTime = Date.now();
await fs.writeFile(outputFile, finalOutput, {flag: 'w'});
const writeEndTime = Date.now();
logger.debug(`File writing took ${writeEndTime - writeStartTime}ms`);

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
const errorMessage = (error as Error).message;
const errorStack = (error as Error).stack;
logger.error(`❌ Error aggregating files: ${errorMessage}`);
logger.debug(`Error stack trace: ${errorStack}`);
		process.exit(1);
	}
}
