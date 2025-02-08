export interface FileObject {
	cwd: string;
	file: string;
}

export interface ProcessFileResult {
	snippet: string;
	wasIncluded: boolean;
	defaultIgnored: boolean;
	customIgnored: boolean;
	isBinaryOrSvg: boolean;
}
