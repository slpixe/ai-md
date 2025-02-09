export interface FileObject {
    cwd: string;
    file: string;
}

export interface FileTokenInfo {
    path: string;
    tokenCount: number;
    percentage: number;
}

export interface ProcessFileResult {
    snippet: string;
    wasIncluded: boolean;
    defaultIgnored: boolean;
    customIgnored: boolean;
    isBinaryOrSvg: boolean;
    tokenCount: number;
}
