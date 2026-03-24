export interface VaultInfo {
    name: string;
    path: string;
}
/**
 * Walk up from startDir looking for .napkin/ folder.
 * The .napkin/ directory IS the vault root — all content lives inside it.
 * Returns vault name (parent dir name) and the .napkin/ path.
 */
export declare function findVault(startDir?: string): VaultInfo;
/**
 * Read a JSON config file from .obsidian/ directory.
 * Returns parsed JSON or null if file doesn't exist.
 */
export declare function getVaultConfig(vaultPath: string, configFile: string): Record<string, unknown> | null;
