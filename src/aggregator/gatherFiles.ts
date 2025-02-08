import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import {logger} from "../utils/logger.js";

export async function gatherFiles(inputPaths: string[]): Promise<{ cwd: string; file: string }[]> {
	const allFiles: { cwd: string; file: string }[] = [];
	for (const inputPath of inputPaths) {
		try {
			const resolved = path.resolve(inputPath);
			const stat = await fs.stat(resolved);
			if (stat.isDirectory()) {
				const filesInDir = await glob('**/*', { nodir: true, dot: true, cwd: resolved });
				for (const f of filesInDir) {
					allFiles.push({ cwd: resolved, file: f });
				}
			} else {
				const parent = path.dirname(resolved);
				const justFile = path.basename(resolved);
				allFiles.push({ cwd: parent, file: justFile });
			}
		} catch (error) {
			logger.error(`❌ Error gathering files for path ${inputPath}: ${(error as Error).message}`);
			throw error;
		}
	}
	return allFiles;
}
