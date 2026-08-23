import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';
import { readIgnoreFile } from './ignoreHandler.js';
import { DEFAULT_IGNORES, MAX_FILE_SIZE } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { gatherFiles } from './gatherFiles.js';
import { naturalSort } from './sorter.js';
import { processSingleFile } from './processFile.js';
import { estimateTokenCount } from '../utils/tokenUtils.js';
import { displayIncludedFiles, displayTokenizedFiles } from './display.js';
import { createIgnoreFilter } from '../utils/ignoreUtils.js';
import type { FileObject, FileTokenInfo, ProcessFileResult } from '../types/index.d.ts';

/** Merge input files into a single Markdown file. */
export async function aggregateFiles(
  inputPaths: string[],
  outputFile: string,
  useDefaultIgnores: boolean,
  removeWhitespaceFlag: boolean,
  showOutputFiles: boolean,
  ignoreFilePath: string,
  enableConcurrency: boolean | number,
  dryRun: boolean,
  cliIgnorePatterns: string[] = [],
  showTokens = false,
): Promise<void> {
  let outputHandle: FileHandle | undefined;
  let temporaryOutputPath: string | undefined;

  try {
    const startTime = Date.now();
    logger.debug('Starting file aggregation process');

    const ignoreDir = path.dirname(ignoreFilePath);
    const ignoreName = path.basename(ignoreFilePath);
    const userIgnorePatterns = await readIgnoreFile(ignoreDir, ignoreName);
    const defaultIgnore = useDefaultIgnores ? ignore().add(DEFAULT_IGNORES) : ignore();
    const customIgnore = createIgnoreFilter(userIgnorePatterns, ignoreName);
    const cliIgnore = createIgnoreFilter(cliIgnorePatterns, 'CLI patterns');

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
      removeWhitespaceFlag
        ? '🧹 Whitespace removal enabled (except for whitespace-dependent languages).'
        : '📝 Whitespace removal disabled.',
    );

    const gatherStartTime = Date.now();
    const allFiles = await gatherFiles(inputPaths);
    logger.debug(`File gathering took ${Date.now() - gatherStartTime}ms`);
    logger.info(`🔍 Found ${allFiles.length} file paths across all inputs. Applying filters...`);
    allFiles.sort((a, b) => naturalSort(path.join(a.cwd, a.file), path.join(b.cwd, b.file)));

    const concurrencyLevel = typeof enableConcurrency === 'number'
      ? enableConcurrency
      : enableConcurrency ? 4 : 1;

    if (enableConcurrency) {
      logger.info(`🔄 Using concurrent processing with ${concurrencyLevel} workers`);
      logger.debug(`Concurrency enabled: ${concurrencyLevel} simultaneous file operations`);
    } else {
      logger.info('🔄 Running sequentially (no concurrency)');
      logger.debug('Concurrency disabled: processing files sequentially');
    }

    const processFile = (fileObject: FileObject): Promise<ProcessFileResult> => processSingleFile(
      fileObject.cwd,
      fileObject.file,
      outputFile,
      useDefaultIgnores,
      defaultIgnore,
      customIgnore,
      cliIgnore,
      removeWhitespaceFlag,
    );

    if (!dryRun) {
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      temporaryOutputPath = `${outputFile}.${process.pid}.${Date.now()}.tmp`;
      outputHandle = await fs.open(temporaryOutputPath, 'wx');
    }

    let tokenEstimateChunks: string[] | undefined = [];
    const includedFiles: string[] = [];
    const tokenInfos: FileTokenInfo[] = [];
    let includedCount = 0;
    let defaultIgnoredCount = 0;
    let customIgnoredCount = 0;
    let binaryAndSvgFileCount = 0;
    let totalTokens = 0;
    let fileSizeInBytes = 0;

    const processingStartTime = Date.now();
    for (let offset = 0; offset < allFiles.length; offset += concurrencyLevel) {
      const batch = allFiles.slice(offset, offset + concurrencyLevel);
      const results = await Promise.all(batch.map(processFile));

      for (const result of results) {
        if (result.defaultIgnored) defaultIgnoredCount += 1;
        if (result.customIgnored) customIgnoredCount += 1;
        if (!result.wasIncluded) continue;

        const snippetSize = Buffer.byteLength(result.snippet);
        fileSizeInBytes += snippetSize;
        if (tokenEstimateChunks) {
          if (fileSizeInBytes <= MAX_FILE_SIZE) tokenEstimateChunks.push(result.snippet);
          else tokenEstimateChunks = undefined;
        }
        if (outputHandle) await outputHandle.appendFile(result.snippet);

        includedCount += 1;
        if (result.isBinaryOrSvg) binaryAndSvgFileCount += 1;

        const match = result.snippet.match(/^# (.+)\n/m);
        if (match) {
          const filePath = match[1].trim();
          includedFiles.push(filePath);
          totalTokens += result.tokenCount;
          tokenInfos.push({ path: filePath, tokenCount: result.tokenCount, percentage: 0 });
        }
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

    if (!dryRun) {
      await outputHandle?.sync();
      await outputHandle?.close();
      outputHandle = undefined;
      if (!temporaryOutputPath) throw new Error('Temporary output path was not initialized');
      await fs.rename(temporaryOutputPath, outputFile);
      temporaryOutputPath = undefined;

      const stats = await fs.stat(outputFile);
      if (stats.size !== fileSizeInBytes) throw new Error('❌ File size mismatch after writing');
      logger.info(`✅ Files aggregated successfully into ${outputFile}`);
    } else {
      logger.info(`🔎 Dry run mode: No file will be written to "${outputFile}"`);
      logger.info('✅ Aggregation "would" have been successful, but no file was written.');
    }

    logger.info(`📚 Total files found: ${allFiles.length}`);
    logger.info(`📎 Files included in output: ${includedCount}`);
    logger.info(`🚫 Files ignored by default patterns: ${defaultIgnoredCount}`);
    logger.info(`🚫 Files ignored by custom patterns: ${customIgnoredCount}`);
    logger.info(`📦 Binary and SVG files included: ${binaryAndSvgFileCount}`);

    if (fileSizeInBytes > MAX_FILE_SIZE) {
      logger.warn(`⚠️ Warning: Output file size (${(fileSizeInBytes / 1024 / 1024).toFixed(2)} MB) exceeds 10 MB.`);
      logger.warn('⚠️ Token count estimation skipped due to large file size.');
      logger.warn('💡 Consider adding more files to ignore patterns to reduce the output size.');
    } else {
      const finalOutput = tokenEstimateChunks?.join('') ?? '';
      const totalEstimate = await estimateTokenCount(finalOutput);
      logger.info(`🔢 Estimated token count: ${totalEstimate}`);
      if (showTokens) displayTokenizedFiles(tokenInfos);
    }

    if (showOutputFiles) displayIncludedFiles(includedFiles);

    logger.info(dryRun ? '✅ Done (dry run). No file was created.' : `✅ Done! Wrote code base to ${outputFile}`);
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
