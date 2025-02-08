import { logger } from './logger.js';

export async function estimateTokenCount(text: string): Promise<number> {
	try {
		logger.debug('Estimating token count...');
		const { encodingForModel } = await import('js-tiktoken');
		const enc = encodingForModel("gpt-4o");
		const count = enc.encode(text).length;
		logger.debug(`Estimated ${count} tokens for text of length ${text.length}`);
		return count;
	} catch (error) {
		logger.error("Error estimating token count:", error);
		return 0;
	}
}
