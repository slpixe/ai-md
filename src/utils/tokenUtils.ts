import { logger } from './logger.js';
import { encode } from 'gpt-tokenizer';

export function estimateTokenCount(text: string): number {
  try {
    logger.debug('Estimating token count...');
    const count = encode(text).length;
    logger.debug(`Estimated ${count} tokens for text of length ${text.length}`);
    return count;
  } catch (error) {
    logger.error("Error estimating token count:", error);
    return 0;
  }
}
