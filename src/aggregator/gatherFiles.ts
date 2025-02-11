import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { logger } from "../utils/logger.js";

function isGlobPattern(pattern: string): boolean {
  return /[*?[\]]/.test(pattern);
}

function normalizeRelativePath(basePath: string, filePath: string): string {
  // Get the relative path maintaining the input path structure
  const relative = path.relative(basePath, filePath);
  return relative.split(path.sep).join('/');
}

export async function gatherFiles(inputPaths: string[]): Promise<{ cwd: string; file: string }[]> {
  const allFiles: { cwd: string; file: string }[] = [];
  logger.debug(`Starting to gather files from ${inputPaths.length} input paths`);

  for (const inputPath of inputPaths) {
    logger.debug(`Processing input path: ${inputPath}`);
    try {
      if (isGlobPattern(inputPath)) {
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
        
        for (const absolutePath of files) {
          // For glob patterns, maintain the relative path from CWD
          const normalizedPath = normalizeRelativePath(cwd, absolutePath);
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
          for (const absolutePath of files) {
            // For directory input, prefix all files with the input directory name
            const relativeToDir = normalizeRelativePath(resolved, absolutePath);
            const normalizedPath = `${inputDirName}/${relativeToDir}`;
            allFiles.push({ 
              cwd: path.dirname(resolved),
              file: normalizedPath
            });
          }
        } else {
          const dirName = path.dirname(resolved);
          const baseName = path.basename(resolved);
          const parentDirName = path.basename(dirName);
          
          // If the file is directly specified, don't add parent directory prefix
          logger.debug(`${resolved} is a file`);
          allFiles.push({ 
            cwd: dirName,
            file: baseName
          });
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
  // Log all gathered files for debugging
  allFiles.forEach(f => logger.debug(`Gathered file: ${f.file} (cwd: ${f.cwd})`));
  return allFiles;
}
