/**
 * Create a temporary vault for testing.
 * .napkin/ is the vault root — all content lives inside it.
 * Returns:
 *   - path: parent dir (pass to --vault for commands, findVault walks up from here)
 *   - vaultPath: the .napkin/ dir (pass directly to utility functions like listFiles)
 *   - cleanup: removes everything
 */
export declare function createTempVault(files?: Record<string, string>): {
    path: string;
    vaultPath: string;
    cleanup: () => void;
};
