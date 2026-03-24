export interface FileInfo {
    path: string;
    name: string;
    extension: string;
    size: number;
    created: number;
    modified: number;
}
export interface ListFilesOptions {
    folder?: string;
    ext?: string;
}
/**
 * Recursively list files in a vault, skipping .obsidian, .git, .trash, node_modules.
 */
export declare function listFiles(vaultPath: string, opts?: ListFilesOptions): string[];
/**
 * List folders in a vault, skipping hidden/system dirs.
 */
export declare function listFolders(vaultPath: string, parentFolder?: string): string[];
/**
 * Resolve a file reference (wikilink-style name or exact path) to a relative path in the vault.
 * - If fileRef contains '/' or ends with '.md', treat as exact path
 * - Otherwise, search all .md files for a matching basename
 */
export declare function resolveFile(vaultPath: string, fileRef: string): string | null;
/**
 * Suggest similar filenames when a file isn't found.
 * Returns up to 3 suggestions sorted by similarity.
 */
export declare function suggestFile(vaultPath: string, fileRef: string): string[];
/**
 * Read a file's contents, resolving by name or path.
 */
export declare function readFile(vaultPath: string, fileRef: string): {
    path: string;
    content: string;
};
/**
 * Get file info for a resolved file path.
 */
export declare function getFileInfo(vaultPath: string, relativePath: string): FileInfo;
