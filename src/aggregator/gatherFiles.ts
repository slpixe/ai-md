import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { logger } from "../utils/logger.js";
import { filterFiles } from "../utils/micromatchUtils.js";

/**
 * Normalizes a path to use forward slashes and handles relative paths.
 *
 * @param basePath - The base path for relative path resolution
 * @param filePath - The file path to normalize
 * @returns Normalized path with forward slashes
 */
function normalizeRelativePath(basePath: string, filePath: string): string {
  const relative = path.relative(basePath, filePath);
  return relative.split(path.sep).join('/');
}

/**
 * Gathers files based on input paths, respecting include/exclude patterns.
 * 
 * @param inputPaths - Array of file/directory paths or glob patterns to process
 * @param includePatterns - Optional array of glob patterns to include
 * @param excludePatterns - Optional array of glob patterns to exclude
 * @returns Array of gathered files with their working directories
 */
export async function gatherFiles(
  inputPaths: string[],
  includePatterns?: string[],
  excludePatterns?: string[]
): Promise<{ cwd: string; file: string }[]> {
  const allFiles: { cwd: string; file: string }[] = [];
  logger.debug(`Starting to gather files from ${inputPaths.length} input paths`);

  // If no includes specified, treat all files as included
  const effectiveIncludes = includePatterns?.length ? includePatterns : ['**/*'];

  for (const inputPath of inputPaths) {
    logger.debug(`Processing input path: ${inputPath}`);
    try {
      if (/[*?[\]]/.test(inputPath)) {
        // Handle glob pattern
        logger.debug(`${inputPath} is a glob pattern`);
        const cwd = process.cwd();
        const files = await glob(inputPath, { 
          nodir: true, 
          dot: true,
          cwd: cwd,
          absolute: true
        });
        logger.debug(`Found ${files.length} files matching pattern ${inputPath}`);
        
        // Filter files based on include/exclude patterns
        const normalizedPaths = files.map(f => normalizeRelativePath(cwd, f));
        const filteredPaths = filterFiles(normalizedPaths, effectiveIncludes, excludePatterns);
        
        for (const normalizedPath of filteredPaths) {
          allFiles.push({ 
            cwd: process.cwd(),
            file: normalizedPath
          });
        }
      } else {
        // Handle regular path
        const resolved = path.resolve(inputPath);
        const stat = await fs.stat(resolved);
        
        if (stat.isDirectory()) {
          logger.debug(`${resolved} is a directory, using glob to find files`);
          const files = await glob('**/*', { 
            nodir: true, 
            dot: true, 
            cwd: resolved,
            absolute: true
          });
          logger.debug(`Found ${files.length} files in directory ${resolved}`);
          
          const inputDirName = path.basename(resolved);
          // Get all paths relative to the input directory
          const relativePaths = files.map(f => {
            const relativeToDir = normalizeRelativePath(resolved, f);
            return `${inputDirName}/${relativeToDir}`;
          });
          
          // Filter files based on include/exclude patterns
          const filteredPaths = filterFiles(relativePaths, effectiveIncludes, excludePatterns);
          
          for (const normalizedPath of filteredPaths) {
            allFiles.push({ 
              cwd: path.dirname(resolved),
              file: normalizedPath
            });
          }
        } else {
          const dirName = path.dirname(resolved);
          const baseName = path.basename(resolved);
          
          // For individual files, still check against include/exclude patterns
          const normalizedPath = baseName;
          const shouldInclude = filterFiles([normalizedPath], effectiveIncludes, excludePatterns);
          
          if (shouldInclude.length > 0) {
            logger.debug(`${resolved} is an included file`);
            allFiles.push({ 
              cwd: dirName,
              file: baseName
            });
          } else {
            logger.debug(`${resolved} is excluded by patterns`);
          }
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorStack = (error as Error).stack;
      logger.error(`❌ Error gathering files for path ${inputPath}: ${errorMessage}`);
      logger.debug(`Error stack trace: ${errorStack}`);
      throw error;
    }
  }
  
  logger.debug(`Total files gathered: ${allFiles.length}`);
  allFiles.forEach(f => logger.debug(`Gathered file: ${f.file} (cwd: ${f.cwd})`));
  return allFiles;
}
