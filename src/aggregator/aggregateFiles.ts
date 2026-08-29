import { once } from 'node:events';
import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';
import { displayIncludedFiles, displayTokenizedFiles } from './display.js';
import { gatherFiles } from './gatherFiles.js';
import { readIgnoreFile } from './ignoreHandler.js';
import { processSingleFile } from './processFile.js';
import { naturalSort } from './sorter.js';
import type { AggregateOptions, FileObject, FileTokenInfo, PathFilter, ProcessFileResult } from '../types/index.js';
import {
  DEFAULT_IGNORES,
  MAX_CONCURRENCY,
  MAX_CONCURRENT_BUFFER_SIZE,
  MAX_FILE_SIZE,
  MAX_SINGLE_FILE_SIZE,
  MAX_TOKEN_LIMIT,
} from '../utils/constants.js';
import { createIgnoreFilter } from '../utils/ignoreUtils.js';
import { logger } from '../utils/logger.js';
import { estimateTokenCount } from '../utils/tokenUtils.js';

interface PendingResult {
  promise: Promise<{ result?: ProcessFileResult; error?: unknown }>;
  estimatedBytes: number;
}

async function estimateBufferedBytes(fileObject: FileObject): Promise<number> {
  const stats = await fs.stat(path.resolve(fileObject.cwd, fileObject.file));
  return Math.max(1, Math.min(stats.size, MAX_SINGLE_FILE_SIZE));
}

async function* processFilesInOrder(
  files: FileObject[],
  concurrency: number,
  processFile: (fileObject: FileObject) => Promise<ProcessFileResult>,
): AsyncGenerator<ProcessFileResult> {
  const pending = new Map<number, PendingResult>();
  let bufferedBytes = 0;
  let nextToSchedule = 0;
  let nextToYield = 0;

  const scheduleAvailable = async (): Promise<void> => {
    while (nextToSchedule < files.length && pending.size < concurrency) {
      const estimatedBytes = await estimateBufferedBytes(files[nextToSchedule]);
      if (pending.size > 0 && bufferedBytes + estimatedBytes > MAX_CONCURRENT_BUFFER_SIZE) break;

      const index = nextToSchedule;
      const promise = processFile(files[index]).then(
        (result) => ({ result }),
        (error: unknown) => ({ error }),
      );
      pending.set(index, { promise, estimatedBytes });
      bufferedBytes += estimatedBytes;
      nextToSchedule += 1;
    }
  };

  await scheduleAvailable();
  while (nextToYield < files.length) {
    const pendingResult = pending.get(nextToYield);
    if (!pendingResult) throw new Error('File-processing queue lost its deterministic ordering');

    const settled = await pendingResult.promise;
    pending.delete(nextToYield);
    bufferedBytes -= pendingResult.estimatedBytes;
    nextToYield += 1;
    await scheduleAvailable();

    if (settled.error !== undefined) throw settled.error;
    if (!settled.result) throw new Error('File-processing worker returned no result');
    yield settled.result;
  }
}

async function writeStdout(content: string): Promise<void> {
  if (!process.stdout.write(content)) await once(process.stdout, 'drain');
}

/** Merge input files into a single Markdown document. */
export async function aggregateFiles(options: AggregateOptions = {}): Promise<void> {
  const inputPaths = options.inputPaths ?? [process.cwd()];
  const outputFile = path.resolve(options.outputFile ?? 'codebase.md');
  const useDefaultIgnores = options.useDefaultIgnores ?? true;
  const removeWhitespace = options.removeWhitespace ?? true;
  const showFiles = options.showFiles ?? false;
  const ignoreFilePath = path.resolve(options.ignoreFilePath ?? '.aidigestignore');
  const concurrency = options.concurrency ?? 1;
  const dryRun = options.dryRun ?? false;
  const cliIgnorePatterns = options.ignorePatterns ?? [];
  const showTokens = options.showTokens ?? false;
  const writeToStandardOutput = options.stdout ?? false;
  const maxTokens = options.maxTokens;

  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new RangeError(`Concurrency must be between 1 and ${MAX_CONCURRENCY}.`);
  }
  if (maxTokens !== undefined && (!Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_TOKEN_LIMIT)) {
    throw new RangeError(`Maximum token count must be between 1 and ${MAX_TOKEN_LIMIT}.`);
  }
  if (writeToStandardOutput && dryRun) {
    throw new Error('Standard output mode cannot be combined with a dry run.');
  }

  let outputHandle: FileHandle | undefined;
  let temporaryOutputPath: string | undefined;

  try {
    const startTime = Date.now();
    logger.debug('Starting file aggregation process');

    const ignoreDir = path.dirname(ignoreFilePath);
    const ignoreName = path.basename(ignoreFilePath);
    const userIgnorePatterns = await readIgnoreFile(ignoreDir, ignoreName);
    const defaultIgnoreInstance = ignore().add(DEFAULT_IGNORES);
    const defaultIgnore: PathFilter = (filePath) => defaultIgnoreInstance.ignores(filePath);
    const customIgnore = createIgnoreFilter(userIgnorePatterns, ignoreName);
    const cliIgnore = createIgnoreFilter(cliIgnorePatterns, 'CLI patterns');
    const traversalIgnorePatterns = [
      ...(useDefaultIgnores ? DEFAULT_IGNORES : []),
      ...userIgnorePatterns,
      ...cliIgnorePatterns,
    ];

    logger.debug(`Default ignore patterns: ${useDefaultIgnores ? DEFAULT_IGNORES.join(', ') : 'disabled'}`);
    logger.info(
      cliIgnorePatterns.length > 0
        ? `📄 CLI ignore patterns: ${cliIgnorePatterns.join(', ')}`
        : '📄 No CLI ignore patterns provided.',
    );
    logger.debug(`Custom ignore patterns from ${ignoreName}: ${userIgnorePatterns.join(', ') || 'none'}`);
    logger.info(useDefaultIgnores ? '📄 Using default ignore patterns.' : '🛠️ Custom ignore patterns enabled.');
    if (!useDefaultIgnores) {
      logger.warn('⚠️ Default secret-file exclusions are disabled. Review included files before sharing the output.');
    }

    if (userIgnorePatterns.length > 0) {
      logger.info(`📄 Ignore patterns from ${ignoreName}:`);
      userIgnorePatterns.forEach((pattern) => logger.info(` - ${pattern}`));
    }

    logger.info(
      removeWhitespace
        ? '🧹 Whitespace removal enabled (except for whitespace-dependent languages).'
        : '📝 Whitespace removal disabled.',
    );

    const gatherStartTime = Date.now();
    const allFiles = await gatherFiles(inputPaths, { traversalIgnorePatterns });
    logger.debug(`File gathering took ${Date.now() - gatherStartTime}ms`);
    logger.info(`🔍 Found ${allFiles.length} unique file paths across all inputs. Applying filters...`);
    allFiles.sort((a, b) => naturalSort(path.join(a.cwd, a.file), path.join(b.cwd, b.file)));

    logger.info(
      concurrency > 1
        ? `🔄 Using concurrent processing with ${concurrency} workers`
        : '🔄 Running sequentially (no concurrency)',
    );
    logger.debug(`Concurrent source-buffer limit: ${MAX_CONCURRENT_BUFFER_SIZE / 1024 / 1024}MB`);

    const processFile = (fileObject: FileObject): Promise<ProcessFileResult> => processSingleFile(
      fileObject.cwd,
      fileObject.file,
      outputFile,
      useDefaultIgnores,
      defaultIgnore,
      customIgnore,
      cliIgnore,
      removeWhitespace,
    );

    if (!dryRun && !writeToStandardOutput) {
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      temporaryOutputPath = `${outputFile}.${process.pid}.${Date.now()}.tmp`;
      outputHandle = await fs.open(temporaryOutputPath, 'wx');
    }

    const needsPerFileTokens = showTokens || maxTokens !== undefined;
    let tokenEstimateChunks: string[] | undefined = needsPerFileTokens ? undefined : [];
    const includedFiles: string[] = [];
    const tokenInfos: FileTokenInfo[] = [];
    let includedCount = 0;
    let defaultIgnoredCount = 0;
    let customIgnoredCount = 0;
    let binaryAndSvgFileCount = 0;
    let maxTokenSkippedCount = 0;
    let totalTokens = 0;
    let fileSizeInBytes = 0;

    const processingStartTime = Date.now();
    for await (const result of processFilesInOrder(allFiles, concurrency, processFile)) {
      if (result.defaultIgnored) defaultIgnoredCount += 1;
      if (result.customIgnored) customIgnoredCount += 1;
      if (!result.wasIncluded) continue;

      const tokenCount = needsPerFileTokens ? estimateTokenCount(result.snippet) : 0;
      if (maxTokens !== undefined && totalTokens + tokenCount > maxTokens) {
        maxTokenSkippedCount += 1;
        logger.debug(`Skipping ${result.displayPath}: estimated token budget would be exceeded`);
        continue;
      }

      const snippetSize = Buffer.byteLength(result.snippet);
      fileSizeInBytes += snippetSize;
      if (tokenEstimateChunks) {
        if (fileSizeInBytes <= MAX_FILE_SIZE) tokenEstimateChunks.push(result.snippet);
        else tokenEstimateChunks = undefined;
      }
      if (outputHandle) await outputHandle.appendFile(result.snippet);
      if (writeToStandardOutput && !dryRun) await writeStdout(result.snippet);

      includedCount += 1;
      if (result.isBinaryOrSvg) binaryAndSvgFileCount += 1;
      includedFiles.push(result.displayPath);
      if (needsPerFileTokens) {
        totalTokens += tokenCount;
        tokenInfos.push({ path: result.displayPath, tokenCount, percentage: 0 });
      }
    }
    logger.debug(`File processing took ${Date.now() - processingStartTime}ms`);

    if (totalTokens > 0) {
      tokenInfos.forEach((info) => {
        info.percentage = (info.tokenCount / totalTokens) * 100;
      });
    }
    tokenInfos.sort((a, b) => b.tokenCount - a.tokenCount);
    logger.debug(`Final output size: ${(fileSizeInBytes / 1024).toFixed(2)}KB`);

    if (!dryRun && !writeToStandardOutput) {
      await outputHandle?.sync();
      await outputHandle?.close();
      outputHandle = undefined;
      if (!temporaryOutputPath) throw new Error('Temporary output path was not initialized');
      await fs.rename(temporaryOutputPath, outputFile);
      temporaryOutputPath = undefined;

      const stats = await fs.stat(outputFile);
      if (stats.size !== fileSizeInBytes) throw new Error('❌ File size mismatch after writing');
      logger.info(`✅ Files aggregated successfully into ${outputFile}`);
    } else if (writeToStandardOutput && !dryRun) {
      logger.info('✅ Files aggregated successfully to standard output');
    } else {
      logger.info(`🔎 Dry run mode: No file will be written to "${outputFile}"`);
      logger.info('✅ Aggregation "would" have been successful, but no file was written.');
    }

    logger.info(`📚 Total unique files found: ${allFiles.length}`);
    logger.info(`📎 Files included in output: ${includedCount}`);
    logger.info(`🚫 Files ignored by default patterns: ${defaultIgnoredCount}`);
    logger.info(`🚫 Files ignored by custom patterns: ${customIgnoredCount}`);
    logger.info(`📦 Binary and SVG files included: ${binaryAndSvgFileCount}`);
    if (maxTokens !== undefined) {
      logger.info(`🎯 Token budget: ${totalTokens}/${maxTokens} estimated tokens`);
      logger.info(`⏭️ Files skipped by token budget: ${maxTokenSkippedCount}`);
    }

    if (fileSizeInBytes > MAX_FILE_SIZE && !needsPerFileTokens) {
      logger.warn(`⚠️ Warning: Output file size (${(fileSizeInBytes / 1024 / 1024).toFixed(2)} MB) exceeds 10 MB.`);
      logger.warn('⚠️ Token count estimation skipped due to large file size.');
      logger.warn('💡 Consider adding more files to ignore patterns to reduce the output size.');
    } else {
      const totalEstimate = needsPerFileTokens
        ? totalTokens
        : estimateTokenCount(tokenEstimateChunks?.join('') ?? '');
      logger.info(`🔢 Estimated token count: ${totalEstimate}`);
      if (showTokens) displayTokenizedFiles(tokenInfos);
    }

    if (showFiles) displayIncludedFiles(includedFiles);
    logger.info(dryRun ? '✅ Done (dry run). No file was created.' : '✅ Done!');
    logger.info(`⏱️  Aggregation took ${Date.now() - startTime} ms`);
  } catch (error) {
    await outputHandle?.close().catch(() => undefined);
    if (temporaryOutputPath) await fs.rm(temporaryOutputPath, { force: true }).catch(() => undefined);
    const typedError = error as Error;
    logger.error(`❌ Error aggregating files: ${typedError.message}`);
    logger.debug(`Error stack trace: ${typedError.stack}`);
    throw error;
  }
}
