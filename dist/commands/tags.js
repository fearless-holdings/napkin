import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile } from "../utils/files.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { extractTags } from "../utils/markdown.js";
import { bold, dim, error, output, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function collectTags(vaultPath, fileFilter) {
    const tagCounts = new Map();
    const tagFiles = new Map();
    const files = fileFilter
        ? (() => {
            const r = resolveFile(vaultPath, fileFilter);
            return r ? [r] : [];
        })()
        : listFiles(vaultPath, { ext: "md" });
    for (const file of files) {
        const content = fs.readFileSync(path.join(vaultPath, file), "utf-8");
        const { properties } = parseFrontmatter(content);
        const inlineTags = extractTags(content);
        // Combine inline tags and frontmatter tags
        const allTags = new Set(inlineTags);
        if (Array.isArray(properties.tags)) {
            for (const t of properties.tags)
                allTags.add(String(t));
        }
        for (const tag of allTags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            if (!tagFiles.has(tag))
                tagFiles.set(tag, []);
            tagFiles.get(tag)?.push(file);
        }
    }
    return { tagCounts, tagFiles };
}
export async function tags(opts) {
    const v = findVault(opts.vault);
    const { tagCounts } = collectTags(v.path, opts.file);
    const entries = [...tagCounts.entries()];
    if (opts.sort === "count") {
        entries.sort((a, b) => b[1] - a[1]);
    }
    else {
        entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    output(opts, {
        json: () => {
            if (opts.total)
                return { total: entries.length };
            if (opts.counts)
                return { tags: Object.fromEntries(entries) };
            return { tags: entries.map(([t]) => t) };
        },
        human: () => {
            if (opts.total) {
                console.log(entries.length);
            }
            else {
                for (const [tag, count] of entries) {
                    console.log(opts.counts ? `${tag}\t${count}` : tag);
                }
            }
        },
    });
}
export async function tag(opts) {
    const v = findVault(opts.vault);
    if (!opts.name) {
        error("No tag name specified. Use --name <tag>");
        process.exit(EXIT_USER_ERROR);
    }
    const { tagCounts, tagFiles } = collectTags(v.path);
    const count = tagCounts.get(opts.name) || 0;
    const files = tagFiles.get(opts.name) || [];
    output(opts, {
        json: () => ({ tag: opts.name, count, ...(opts.verbose ? { files } : {}) }),
        human: () => {
            console.log(`${bold(opts.name)}  ${count} occurrence${count !== 1 ? "s" : ""}`);
            if (opts.verbose) {
                for (const f of files)
                    console.log(`  ${dim(f)}`);
            }
        },
    });
}
