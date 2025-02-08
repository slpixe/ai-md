import { logger } from './logger.js';

export function removeWhitespace(val: string): string {
	logger.debug(`Removing whitespace from content of length ${val.length}`);
	return val.replace(/\s+/g, " ").trim();
}

export function escapeTripleBackticks(content: string): string {
	logger.debug(`Escaping triple backticks in content of length ${content.length}`);
	return content.replace(/\`\`\`/g, "\\`\\`\\`");
}
