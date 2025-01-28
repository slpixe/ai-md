#!/usr/bin/env node

import { program } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

async function readIgnoreFile(inputDir: string, filename: string): Promise<string[]> {
  try {
    const filePath = path.join(inputDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(formatLog(`Found ${filename} file in ${inputDir}.`, '📄'));
    return content.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(formatLog(`No ${filename} file found in ${inputDir}.`, '❓'));
      return [];
    }
    throw error;
  }
}

function displayIncludedFiles(includedFiles: string[]): void {
  console.log(formatLog('Files included in the output:', '📋'));
  includedFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function aggregateFiles(
    inputPaths: string[],
    outputFile: string,
    useDefaultIgnores: boolean,
    removeWhitespaceFlag: boolean,
    showOutputFiles: boolean,
    ignoreFile: string
): Promise<void> {
  try {
    // For now, read ignore file from process.cwd() (or you might pick the first directory in inputPaths, etc.)
    const userIgnorePatterns = await readIgnoreFile(process.cwd(), ignoreFile);

    const defaultIgnore = useDefaultIgnores ? ignore().add(DEFAULT_IGNORES) : ignore();
    const customIgnore = createIgnoreFilter(userIgnorePatterns, ignoreFile);

    if (useDefaultIgnores) {
      console.log(formatLog('Using default ignore patterns.', '🚫'));
    } else {
      console.log(formatLog('Default ignore patterns disabled.', '✅'));
    }

    if (removeWhitespaceFlag) {
      console.log(
          formatLog('Whitespace removal enabled (except for whitespace-dependent languages).', '🧹')
      );
    } else {
      console.log(formatLog('Whitespace removal disabled.', '📝'));
    }

    // Gather all files from all input paths
    let allFiles: { cwd: string; file: string }[] = [];

    for (const inputPath of inputPaths) {
      const resolved = path.resolve(inputPath);
      const stat = await fs.stat(resolved);

      if (stat.isDirectory()) {
        // Glob everything inside this directory
        const filesInDir = await glob('**/*', {
          nodir: true,
          dot: true,
          cwd: resolved,
        });
        for (const f of filesInDir) {
          allFiles.push({ cwd: resolved, file: f });
        }
      } else {
        // It's a file, so just add it directly (with its own "cwd" = parent folder)
        const parent = path.dirname(resolved);
        const justFile = path.basename(resolved);
        allFiles.push({ cwd: parent, file: justFile });
      }
    }

    console.log(formatLog(`Found ${allFiles.length} file paths across all inputs. Applying filters...`, '🔍'));

    // Next, sort them in a natural path order.
    // We'll create a "combined path" for sorting, but keep the {cwd,file} structure for reading.
    allFiles.sort((a, b) => {
      const fullA = path.join(a.cwd, a.file);
      const fullB = path.join(b.cwd, b.file);
      return naturalSort(fullA, fullB);
    });

    let output = '';
    let includedCount = 0;
    let defaultIgnoredCount = 0;
    let customIgnoredCount = 0;
    let binaryAndSvgFileCount = 0;
    let includedFiles: string[] = [];

    for (const { cwd, file } of allFiles) {
      const absolutePath = path.join(cwd, file);
      // "relativePath" is how it appears in the final Markdown:
      // Could be just `file` if you want, or `path.relative(process.cwd(), absolutePath)`.
      // Choose whichever is more intuitive for your aggregator output.
      const relativePath = path.relative(process.cwd(), absolutePath);

      // If it's the output file, skip
      if (
          path.relative(process.cwd(), outputFile) === relativePath ||
          (useDefaultIgnores && defaultIgnore.ignores(relativePath))
      ) {
        defaultIgnoredCount++;
        continue;
      }

      if (customIgnore.ignores(relativePath)) {
        customIgnoredCount++;
        continue;
      }

      // If not ignored, read or mark as binary
      if (await isTextFile(absolutePath) && !shouldTreatAsBinary(absolutePath)) {
        let content = await fs.readFile(absolutePath, 'utf-8');
        const extension = path.extname(file);

        content = escapeTripleBackticks(content);
        if (removeWhitespaceFlag && !WHITESPACE_DEPENDENT_EXTENSIONS.includes(extension)) {
          content = removeWhitespace(content);
        }

        output += `# ${relativePath}\n\n`;
        output += `\`\`\`${extension.slice(1)}\n`;
        output += content;
        output += '\n\`\`\`\n\n';
        includedCount++;
        includedFiles.push(relativePath);
      } else {
        const fileType = getFileType(absolutePath);
        output += `# ${relativePath}\n\n`;
        if (fileType === 'SVG Image') {
          output += `This is a file of the type: ${fileType}\n\n`;
        } else {
          output += `This is a binary file of the type: ${fileType}\n\n`;
        }
        binaryAndSvgFileCount++;
        includedCount++;
        includedFiles.push(relativePath);
      }
    }

    // Write out the final markdown
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, output, { flag: 'w' });

    const stats = await fs.stat(outputFile);
    const fileSizeInBytes = stats.size;
    if (stats.size !== Buffer.byteLength(output)) {
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
              `Warning: Output file size (${(fileSizeInBytes / 1024 / 1024).toFixed(2)} MB) exceeds 10 MB.`,
              '⚠️'
          )
      );
      console.log(formatLog('Token count estimation skipped due to large file size.', '⚠️'));
      console.log(
          formatLog('Consider adding more files to .aidigestignore to reduce the output size.', '💡')
      );
    } else {
      const tokenCount = estimateTokenCount(output);
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
    console.error(formatLog('Error aggregating files:', '❌'), error);
    process.exit(1);
  }
}

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
    let inputPaths: string[] = options.input;

    // If user didn't provide any --input flags, default to current working directory
    if (!inputPaths || inputPaths.length === 0) {
      inputPaths = [process.cwd()];
    }

    const outputFile = path.isAbsolute(options.output)
        ? options.output
        : path.join(process.cwd(), options.output);

    await aggregateFiles(
        inputPaths,
        outputFile,
        options.defaultIgnores,
        options.whitespaceRemoval,
        options.showOutputFiles,
        options.ignoreFile
    );
  });

program.parse(process.argv);