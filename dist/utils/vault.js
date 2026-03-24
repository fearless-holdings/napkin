import * as fs from "node:fs";
import * as path from "node:path";
/**
 * Walk up from startDir looking for .napkin/ folder.
 * The .napkin/ directory IS the vault root — all content lives inside it.
 * Returns vault name (parent dir name) and the .napkin/ path.
 */
export function findVault(startDir) {
    let dir = path.resolve(startDir || process.cwd());
    const root = path.parse(dir).root;
    while (true) {
        const napkinDir = path.join(dir, ".napkin");
        if (fs.existsSync(napkinDir) && fs.statSync(napkinDir).isDirectory()) {
            return {
                name: path.basename(dir),
                path: napkinDir,
            };
        }
        const parent = path.dirname(dir);
        if (parent === dir || dir === root) {
            throw new Error("No vault found. Run 'napkin init' to create one, or run this command inside a directory containing .napkin/.");
        }
        dir = parent;
    }
}
/**
 * Read a JSON config file from .obsidian/ directory.
 * Returns parsed JSON or null if file doesn't exist.
 */
export function getVaultConfig(vaultPath, configFile) {
    // .obsidian/ lives inside .napkin/ (the vault root)
    const configPath = path.join(vaultPath, ".obsidian", configFile);
    try {
        const content = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
