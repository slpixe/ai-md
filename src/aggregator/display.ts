import { logger } from '../utils/logger.js';

export function displayIncludedFiles(includedFiles: string[]): void {
	logger.info('📋 Files included in the output:');
	includedFiles.forEach((file, index) => {
		logger.info(` ${index + 1}. ${file}`);
	});
}
