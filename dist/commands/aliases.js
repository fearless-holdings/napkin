import * as fs from "node:fs";
import * as path from "node:path";
import { listFiles, resolveFile } from "../utils/files.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { dim, output } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function collectAliases(vaultPath, fileFilter) {
    const files = fileFilter
        ? (() => {
            const r = resolveFile(vaultPath, fileFilter);
            return r ? [r] : [];
        })()
        : listFiles(vaultPath, { ext: "md" });
    const results = [];
    for (const file of files) {
        const content = fs.readFileSync(path.join(vaultPath, file), "utf-8");
        const { properties } = parseFrontmatter(content);
        const aliases = properties.aliases;
        if (Array.isArray(aliases)) {
            for (const a of aliases)
                results.push({ alias: String(a), file });
        }
        else if (typeof aliases === "string" && aliases) {
            results.push({ alias: aliases, file });
        }
    }
    return results;
}
export async function aliases(opts) {
    const v = findVault(opts.vault);
    const result = collectAliases(v.path, opts.file);
    output(opts, {
        json: () => {
            if (opts.total)
                return { total: result.length };
            if (opts.verbose)
                return { aliases: result };
            return { aliases: result.map((r) => r.alias) };
        },
        human: () => {
            if (opts.total) {
                console.log(result.length);
            }
            else {
                for (const r of result) {
                    console.log(opts.verbose ? `${r.alias}\t${dim(r.file)}` : r.alias);
                }
            }
        },
    });
}
