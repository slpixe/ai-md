import path from 'path';
import { promises as fs } from 'fs';
import { isTextFile, shouldTreatAsBinary, getFileType } from '../utils/fileUtils.js';
import { DEFAULT_IGNORES } from '../utils/constants.js';
import ignore from 'ignore';
import { logger } from "../utils/logger.js";
import { escapeTripleBackticks, removeWhitespace } from "../utils/textUtils.js";
import { estimateTokenCount } from "../utils/tokenUtils.js";
import { normalizePath } from "../utils/ignoreUtils.js";

const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function generatePathVariants(filePath: string): string[] {
  const normalizedPath = normalizePath(filePath);
  const parts = normalizedPath.split('/');
  const variants: string[] = [];

  // Add the full path
  variants.push(normalizedPath);

  // Add variants with and without leading folder parts
  for (let i = 0; i < parts.length; i++) {
    variants.push(parts.slice(i).join('/'));
  }

  // Add path variants with '**/' prefix for deep matching
  variants.push(`**/${normalizedPath}`);
  for (let i = 0; i < parts.length; i++) {
    variants.push(`**/${parts.slice(i).join('/')}`);
  }

  return [...new Set(variants)]; // Remove duplicates
}

function isFileIgnored(
  filePath: string,
  ignoreFilter: ignore.Ignore
): boolean {
  const variants = generatePathVariants(filePath);
  return variants.some(variant => {
    const isIgnored = ignoreFilter.ignores(variant);
    if (isIgnored) {
      logger.debug(`File ${filePath} ignored by pattern matching: ${variant}`);
    }
    return isIgnored;
  });
}

function shouldIgnoreFile(
  relativePath: string,
  defaultIgnore: ignore.Ignore,
  customIgnore: ignore.Ignore,
  cliIgnore: ignore.Ignore,
  useDefaultIgnores: boolean
): { ignored: boolean; isDefaultIgnore: boolean } {
  // Check CLI ignores first (highest precedence)
  if (isFileIgnored(relativePath, cliIgnore)) {
    logger.debug(`File ignored by CLI patterns: ${relativePath}`);
    return { ignored: true, isDefaultIgnore: false };
  }

  // Then check custom ignores
  if (isFileIgnored(relativePath, customIgnore)) {
    logger.debug(`File ignored by custom patterns: ${relativePath}`);
    return { ignored: true, isDefaultIgnore: false };
  }

  // Finally check default ignores if enabled
  if (useDefaultIgnores && isFileIgnored(relativePath, defaultIgnore)) {
    logger.debug(`File ignored by default patterns: ${relativePath}`);
    return { ignored: true, isDefaultIgnore: true };
  }

  return { ignored: false, isDefaultIgnore: false };
}

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
  tokenCount: number;
}> {
  try {
    const absolutePath = path.join(cwd, file);
    logger.debug(`Processing file: ${absolutePath}`);

    // Normalize the display path to maintain the input path structure
    const displayPath = file; // Use the file path as provided by gatherFiles

    if (absolutePath === outputFile) {
      logger.debug(`Skipping output file: ${outputFile}`);
      return { snippet: '', wasIncluded: false, defaultIgnored: true, customIgnored: false, isBinaryOrSvg: false, tokenCount: 0 };
    }

    // Check if file should be ignored using the full relative path
    const ignoreResult = shouldIgnoreFile(file, defaultIgnore, customIgnore, cliIgnore, useDefaultIgnores);
    if (ignoreResult.ignored) {
      return {
        snippet: '',
        wasIncluded: false,
        defaultIgnored: ignoreResult.isDefaultIgnore,
        customIgnored: !ignoreResult.isDefaultIgnore,
        isBinaryOrSvg: false,
        tokenCount: 0
      };
    }

    const isText = await isTextFile(absolutePath);
    const treatAsBinaryFile = shouldTreatAsBinary(absolutePath);
    const fileStat = await fs.stat(absolutePath);

    logger.debug(`File stats for ${displayPath}:
      - Size: ${(fileStat.size / 1024).toFixed(2)}KB
      - Is text file: ${isText}
      - Treat as binary: ${treatAsBinaryFile}`);

    if (fileStat.size > MAX_SINGLE_FILE_SIZE && isText && !treatAsBinaryFile) {
      logger.debug(`File exceeds size limit (${(MAX_SINGLE_FILE_SIZE / 1024 / 1024).toFixed(1)}MB): ${displayPath}`);
      const snippet = `# ${displayPath}\n\n(This text file is > ${(MAX_SINGLE_FILE_SIZE / 1024 / 1024).toFixed(1)} MB, skipping content.)\n\n`;
      return {
        snippet,
        wasIncluded: true,
        defaultIgnored: false,
        customIgnored: false,
        isBinaryOrSvg: false,
        tokenCount: estimateTokenCount(snippet)
      };
    }

    if (isText && !treatAsBinaryFile) {
      logger.debug(`Processing text file: ${displayPath}`);
      let content = await fs.readFile(absolutePath, 'utf-8');
      const extension = path.extname(file);
      content = escapeTripleBackticks(content);

      if (removeWhitespaceFlag && !['.py', '.yaml', /* other extensions */].includes(extension)) {
        const originalLength = content.length;
        content = removeWhitespace(content);
        logger.debug(`Whitespace removal for ${displayPath}:
          - Original length: ${originalLength}
          - New length: ${content.length}
          - Chars removed: ${originalLength - content.length}`);
      }

      const snippet = `# ${displayPath}\n\n\`\`\`${extension.slice(1)}\n${content}\n\`\`\`\n\n`;
      return {
        snippet,
        wasIncluded: true,
        defaultIgnored: false,
        customIgnored: false,
        isBinaryOrSvg: false,
        tokenCount: estimateTokenCount(content)
      };
    } else {
      const fileType = getFileType(absolutePath);
      const snippet = `# ${displayPath}\n\n${
        fileType === 'SVG Image'
          ? `This is a file of the type: ${fileType}\n\n`
          : `This is a binary file of the type: ${fileType}\n\n`
      }`;
      return {
        snippet,
        wasIncluded: true,
        defaultIgnored: false,
        customIgnored: false,
        isBinaryOrSvg: true,
        tokenCount: 10 // Fixed token count for binary/SVG files
      };
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    const errorStack = (error as Error).stack;
    logger.error(`❌ Error processing file ${file} in directory ${cwd}: ${errorMessage}`);
    logger.debug(`Error stack trace: ${errorStack}`);
    return {
      snippet: '',
      wasIncluded: false,
      defaultIgnored: false,
      customIgnored: false,
      isBinaryOrSvg: false,
      tokenCount: 0
    };
  }
}
