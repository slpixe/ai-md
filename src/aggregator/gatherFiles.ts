import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import {logger} from "../utils/logger.js";

export async function gatherFiles(inputPaths: string[]): Promise<{ cwd: string; file: string }[]> {
const allFiles: { cwd: string; file: string }[] = [];
logger.debug(`Starting to gather files from ${inputPaths.length} input paths`);

for (const inputPath of inputPaths) {
logger.debug(`Processing input path: ${inputPath}`);
		try {
			const resolved = path.resolve(inputPath);
			const stat = await fs.stat(resolved);
if (stat.isDirectory()) {
logger.debug(`${resolved} is a directory, using glob to find files`);
const filesInDir = await glob('**/*', { nodir: true, dot: true, cwd: resolved });
logger.debug(`Found ${filesInDir.length} files in directory ${resolved}`);
				for (const f of filesInDir) {
					allFiles.push({ cwd: resolved, file: f });
				}
} else {
const parent = path.dirname(resolved);
const justFile = path.basename(resolved);
logger.debug(`${resolved} is a file, using parent dir: ${parent}`);
allFiles.push({ cwd: parent, file: justFile });
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
return allFiles;
}
