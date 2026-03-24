import * as fs from "node:fs";
import * as path from "node:path";
import { listFiles, listFolders } from "../utils/files.js";
import { bold, dim, output } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function getVaultSize(vaultPath) {
    let total = 0;
    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === ".git" || entry.name === ".obsidian")
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory())
                walk(full);
            else
                total += fs.statSync(full).size;
        }
    }
    walk(vaultPath);
    return total;
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export async function vault(opts) {
    const v = findVault(opts.vault);
    const files = listFiles(v.path);
    const folders = listFolders(v.path);
    const size = getVaultSize(v.path);
    output(opts, {
        json: () => ({
            name: v.name,
            path: v.path,
            files: files.length,
            folders: folders.length,
            size,
        }),
        human: () => {
            console.log(`${dim("name")}       ${bold(v.name)}`);
            console.log(`${dim("path")}       ${v.path}`);
            console.log(`${dim("files")}      ${files.length}`);
            console.log(`${dim("folders")}    ${folders.length}`);
            console.log(`${dim("size")}       ${formatSize(size)}`);
        },
    });
}
