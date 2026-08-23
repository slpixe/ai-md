import { logger } from '../utils/logger.js';
import type { FileTokenInfo } from '../types/index.d.ts';

export function displayIncludedFiles(includedFiles: string[]): void {
  logger.info('📋 Files included in the output:');
  includedFiles.forEach((file, index) => {
    logger.info(` ${index + 1}. ${file}`);
  });
}

export function displayTokenizedFiles(files: FileTokenInfo[]): void {
  logger.info('\n📊 Token analysis:');

  if (files.length === 0) {
    logger.info('No included files to analyze.');
    return;
  }

  const maxPathLength = Math.max(...files.map(f => f.path.length));
  const maxTokenLength = Math.max(...files.map(f => f.tokenCount.toString().length));
  logger.info('╭' + '─'.repeat(maxPathLength + maxTokenLength + 20) + '╮');
  
  files.forEach(file => {
    const pathPadded = file.path.padEnd(maxPathLength);
    const tokensPadded = file.tokenCount.toString().padStart(maxTokenLength);
    const percentPadded = file.percentage.toFixed(1).padStart(5);
    logger.info(`│ ${pathPadded} │ ${tokensPadded} tokens │ ${percentPadded}% │`);
  });
  
  const totalTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);
  logger.info('├' + '─'.repeat(maxPathLength + maxTokenLength + 20) + '┤');
  logger.info(`│ Total tokens: ${totalTokens.toString().padStart(maxTokenLength + maxPathLength + 12)} │`);
  logger.info('╰' + '─'.repeat(maxPathLength + maxTokenLength + 20) + '╯');
}
