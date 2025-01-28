#!/usr/bin/env node

import { program } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import ignore, { type Ignore } from 'ignore';
import {
  WHITESPACE_DEPENDENT_EXTENSIONS,
  DEFAULT_IGNORES,
  removeWhitespace,
  escapeTripleBackticks,
  createIgnoreFilter,
  estimateTokenCount,
  formatLog,
  isTextFile,
  getFileType,
  shouldTreatAsBinary
} from './utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for the final aggregated output
const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024; // Skip text files bigger than 5MB

/**
 * Reads lines from an ignore file in `fileDir/fileName`. If it doesn't exist, return an empty array.
 */
async function readIgnoreFile(fileDir: string, fileName: string): Promise<string[]> {
  try {
    const filePath = path.join(fileDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(formatLog(`Found ${fileName} file in ${fileDir}.`, '📄'));
    return content
        .split('\n')
        .filter((line) => line.trim() !== '' && !line.startsWith('#'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(formatLog(`No ${fileName} file found in ${fileDir}.`, '❓'));
      return [];
    }
    console.error(
        formatLog(`Error reading ignore file ${fileName} in ${fileDir}: ${(error as Error).message}`, '❌')
    );
    throw error;
  }
}

/**
 * Collect all file paths (relative) + their `cwd` from the given input paths.
 */
async function gatherFiles(inputPaths: string[]): Promise<{ cwd: string; file: string }[]> {
  let allFiles: { cwd: string; file: string }[] = [];

  for (const inputPath of inputPaths) {
    try {
      const resolved = path.resolve(inputPath);
      const stat = await fs.stat(resolved);

      if (stat.isDirectory()) {
        const filesInDir = await glob('**/*', {
          nodir: true,
          dot: true,
          cwd: resolved
        });
        for (const f of filesInDir) {
          allFiles.push({ cwd: resolved, file: f });
        }
      } else {
        const parent = path.dirname(resolved);
        const justFile = path.basename(resolved);
        allFiles.push({ cwd: parent, file: justFile });
      }
    } catch (error) {
      console.error(
          formatLog(
              `Error gathering files for path ${inputPath}: ${(error as Error).message}`,
              '❌'
          )
      );
      throw error;
    }
  }

  return allFiles;
}

/**
 * Creates a single file snippet if included, or returns null if ignored.
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

    if (useDefaultIgnores && defaultIgnore.ignores(relativePath)) {
      return {
        snippet: '',
        wasIncluded: false,
        defaultIgnored: true,
        customIgnored: false,
        isBinaryOrSvg: false
      };
    }

    if (customIgnore.ignores(relativePath)) {
      return {
        snippet: '',
        wasIncluded: false,
        defaultIgnored: false,
        customIgnored: true,
        isBinaryOrSvg: false
      };
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
      const fileType = getFileType(absolutePath);
      snippet += `# ${displayPath}\n\n`;
      snippet += fileType === 'SVG Image' ? `This is a file of the type: ${fileType}\n\n` : `This is a binary file of the type: ${fileType}\n\n`;

      return {
        snippet,
        wasIncluded: true,
        defaultIgnored: false,
        customIgnored: false,
        isBinaryOrSvg: true
      };
    }
  } catch (error) {
    console.error(
        formatLog(
            `Error processing file ${file} in directory ${cwd}: ${(error as Error).message}`,
            '❌'
        )
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
  console.log(formatLog('Files included in the output:', '📋'));
  includedFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
}

/**
 * Sort function that does "natural sorting" on file paths.
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Core aggregator that merges all files from `inputPaths` into one markdown file.
 */
async function aggregateFiles(
    inputPaths: string[],
    outputFile: string,
    useDefaultIgnores: boolean,
    removeWhitespaceFlag: boolean,
    showOutputFiles: boolean,
    ignoreFilePath: string
): Promise<void> {
  try {
    const ignoreDir = path.dirname(ignoreFilePath);
    const ignoreName = path.basename(ignoreFilePath);
    const userIgnorePatterns = await readIgnoreFile(ignoreDir, ignoreName);

    const defaultIgnore = useDefaultIgnores ? ignore().add(DEFAULT_IGNORES) : ignore();
    const customIgnore = createIgnoreFilter(userIgnorePatterns, ignoreName);

    console.log(
        formatLog(
            useDefaultIgnores ? 'Using default ignore patterns.' : 'Default ignore patterns disabled.',
            useDefaultIgnores ? '🚫' : '✅'
        )
    );
    if (userIgnorePatterns.length > 0) {
      console.log(formatLog(`Ignore patterns from ${ignoreName}:`, '📄'));
      userIgnorePatterns.forEach((pattern) => console.log(`  - ${pattern}`));
    }

    if (removeWhitespaceFlag) {
      console.log(
          formatLog(
              'Whitespace removal enabled (except for whitespace-dependent languages).',
              '🧹'
          )
      );
    } else {
      console.log(formatLog('Whitespace removal disabled.', '📝'));
    }

    const allFiles = await gatherFiles(inputPaths);
    console.log(
        formatLog(`Found ${allFiles.length} file paths across all inputs. Applying filters...`, '🔍')
    );

    allFiles.sort((a, b) => {
      const fullA = path.join(a.cwd, a.file);
      const fullB = path.join(b.cwd, b.file);
      return naturalSort(fullA, fullB);
    });

    let includedCount = 0;
    let defaultIgnoredCount = 0;
    let customIgnoredCount = 0;
    let binaryAndSvgFileCount = 0;

    const includedFiles: string[] = [];
    const outputChunks: string[] = [];

    // For concurrency, do:
    // const results = await Promise.all(
    //   allFiles.map(({ cwd, file }) =>
    //     limit(() =>
    //       processSingleFile(
    //         cwd,
    //         file,
    //         outputFile,
    //         useDefaultIgnores,
    //         defaultIgnore,
    //         customIgnore,
    //         removeWhitespaceFlag
    //       )
    //     )
    //   )
    // );

    // Without concurrency:
    const results = [];
    for (const { cwd, file } of allFiles) {
      const result = await processSingleFile(
          cwd,
          file,
          outputFile,
          useDefaultIgnores,
          defaultIgnore,
          customIgnore,
          removeWhitespaceFlag
      );

      if (result.defaultIgnored) defaultIgnoredCount++;
      if (result.customIgnored) customIgnoredCount++;
      if (result.wasIncluded) {
        outputChunks.push(result.snippet);
        const match = result.snippet.match(/^# (.+)\n/m);
        if (match) {
          includedFiles.push(match[1].trim());
        }
        includedCount++;
        if (result.isBinaryOrSvg) binaryAndSvgFileCount++;
      }
    }

    const finalOutput = outputChunks.join('');
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, finalOutput, { flag: 'w' });

    const stats = await fs.stat(outputFile);
    const fileSizeInBytes = stats.size;
    if (fileSizeInBytes !== Buffer.byteLength(finalOutput)) {
      throw new Error('File size mismatch after writing');
    }

    console.log(formatLog(`Files aggregated successfully into ${outputFile}`, '✅'));
    console.log(formatLog(`Total files found: ${allFiles.length}`, '📚'));
    console.log(formatLog(`Files included in output: ${includedCount}`, '📎'));
    if (useDefaultIgnores) {
      console.log(formatLog(`Files ignored by default patterns: ${defaultIgnoredCount}`, '🚫'));
    }
    if (customIgnoredCount > 0) {
      console.log(formatLog(`Files ignored by .aidigestignore: ${customIgnoredCount}`, '🚫'));
    }
    console.log(formatLog(`Binary and SVG files included: ${binaryAndSvgFileCount}`, '📦'));

    if (fileSizeInBytes > MAX_FILE_SIZE) {
      console.log(
          formatLog(
              `Warning: Output file size (${(fileSizeInBytes / 1024 / 1024).toFixed(
                  2
              )} MB) exceeds 10 MB.`,
              '⚠️'
          )
      );
      console.log(formatLog('Token count estimation skipped due to large file size.', '⚠️'));
      console.log(
          formatLog('Consider adding more files to .aidigestignore to reduce the output size.', '💡')
      );
    } else {
      const tokenCount = estimateTokenCount(finalOutput);
      console.log(formatLog(`Estimated token count: ${tokenCount}`, '🔢'));
      console.log(
          formatLog(
              'Note: Token count is an approximation using GPT-4 tokenizer. For ChatGPT, it should be accurate. For Claude, it may be ±20% approximately.',
              '⚠️'
          )
      );
    }

    if (showOutputFiles) {
      displayIncludedFiles(includedFiles);
    }

    console.log(formatLog(`Done! Wrote code base to ${outputFile}`, '✅'));
  } catch (error) {
    console.error(
        formatLog(`Error aggregating files: ${(error as Error).message}`, '❌')
    );
    process.exit(1);
  }
}

// --------------------- CLI Definition with Commander --------------------- //
program
    .version('1.0.0')
    .description('Aggregate files into a single Markdown file')
    .option('-i, --input <paths...>', 'Input file(s) or folder(s)')
    .option('-o, --output <file>', 'Output file name', 'codebase.md')
    .option('--no-default-ignores', 'Disable default ignore patterns')
    .option('--whitespace-removal', 'Enable whitespace removal')
    .option('--show-output-files', 'Display a list of files included in the output')
    .option('--ignore-file <file>', 'Custom ignore file name', '.aidigestignore')
    .action(async (options) => {
      let inputPaths: string[] = options.input || [process.cwd()];
      const outputFile = path.isAbsolute(options.output) ? options.output : path.join(process.cwd(), options.output);
      const ignoreFileAbsolute = path.isAbsolute(options.ignoreFile) ? options.ignoreFile : path.join(process.cwd(), options.ignoreFile);

      await aggregateFiles(
          inputPaths,
          outputFile,
          options.defaultIgnores,
          options.whitespaceRemoval,
          options.showOutputFiles,
          ignoreFileAbsolute
      );
    });

program.parse(process.argv);
