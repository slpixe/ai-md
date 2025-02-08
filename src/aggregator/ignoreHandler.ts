import { promises as fs } from 'fs';
import path from 'path';
import ignore, { type Ignore } from 'ignore';
import {logger} from "../utils/logger.js";

export async function readIgnoreFile(fileDir: string, fileName: string): Promise<string[]> {
	try {
		const filePath = path.join(fileDir, fileName);
		const content = await fs.readFile(filePath, 'utf-8');
		logger.info(`📄 Found ${fileName} file in ${fileDir}.`);
		return content
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '' && !line.startsWith('#'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			logger.warn(`❓ No ${fileName} file found in ${fileDir}.`);
			return [];
		}
		logger.error(`❌ Error reading ignore file ${fileName} in ${fileDir}: ${(error as Error).message}`);
		throw error;
	}
}
