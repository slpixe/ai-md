import { isBinaryFile } from "isbinaryfile";
import path from 'path';
import { logger } from './logger.js';

export async function isTextFile(filePath: string): Promise<boolean> {
	try {
		logger.debug(`Checking if file is text: ${filePath}`);
		const isBinary = await isBinaryFile(filePath);
		const result = !isBinary && !filePath.toLowerCase().endsWith('.svg');
		logger.debug(`File ${filePath} is ${result ? 'text' : 'non-text'}`);
		return result;
	} catch (error) {
		logger.error(`Error checking if file is binary: ${filePath}`, error);
		return false;
	}
}

export function getFileType(filePath: string): string {
	const extension = path.extname(filePath).toLowerCase();
	logger.debug(`Getting file type for extension: ${extension}`);
	switch (extension) {
		case '.jpg':
		case '.jpeg':
		case '.png':
		case '.gif':
		case '.bmp':
		case '.webp':
			return 'Image';
		case '.svg':
			return 'SVG Image';
		case '.wasm':
			return 'WebAssembly';
		case '.pdf':
			return 'PDF';
		case '.doc':
		case '.docx':
			return 'Word Document';
		case '.xls':
		case '.xlsx':
			return 'Excel Spreadsheet';
		case '.ppt':
		case '.pptx':
			return 'PowerPoint Presentation';
		case '.zip':
		case '.rar':
		case '.7z':
			return 'Compressed Archive';
		case '.exe':
			return 'Executable';
		case '.dll':
			return 'Dynamic-link Library';
		case '.so':
			return 'Shared Object';
		case '.dylib':
			return 'Dynamic Library';
		default:
			return 'Binary';
	}
}

export function shouldTreatAsBinary(filePath: string): boolean {
	logger.debug(`Checking if file should be treated as binary: ${filePath}`);
	return filePath.toLowerCase().endsWith('.svg') || getFileType(filePath) !== 'Binary';
}
