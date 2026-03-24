import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile, suggestFile } from "../utils/files.js";
import { extractLinks } from "../utils/markdown.js";
import { dim, error, fileNotFound, output, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function buildLinkIndex(vaultPath) {
    const files = listFiles(vaultPath, { ext: "md" });
    const outgoing = new Map();
    const incoming = new Map();
    const unresolved = new Map();
    // Initialize all files as having no incoming links
    for (const f of files)
        incoming.set(f, []);
    for (const file of files) {
        const content = fs.readFileSync(path.join(vaultPath, file), "utf-8");
        const links = extractLinks(content);
        outgoing.set(file, links.outgoing);
        for (const target of links.wikilinks) {
            const resolved = resolveFile(vaultPath, target);
            if (resolved) {
                if (!incoming.has(resolved))
                    incoming.set(resolved, []);
                incoming.get(resolved)?.push(file);
            }
            else {
                if (!unresolved.has(target))
                    unresolved.set(target, []);
                unresolved.get(target)?.push(file);
            }
        }
    }
    return { outgoing, incoming, unresolved };
}
export async function backlinks(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const { incoming } = buildLinkIndex(v.path);
    const links = incoming.get(resolved) || [];
    output(opts, {
        json: () => (opts.total ? { total: links.length } : { backlinks: links }),
        human: () => {
            if (opts.total)
                console.log(links.length);
            else
                for (const l of links)
                    console.log(l);
        },
    });
}
export async function links(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const content = fs.readFileSync(path.join(v.path, resolved), "utf-8");
    const { outgoing } = extractLinks(content);
    output(opts, {
        json: () => (opts.total ? { total: outgoing.length } : { links: outgoing }),
        human: () => {
            if (opts.total)
                console.log(outgoing.length);
            else
                for (const l of outgoing)
                    console.log(l);
        },
    });
}
export async function unresolvedLinks(opts) {
    const v = findVault(opts.vault);
    const { unresolved } = buildLinkIndex(v.path);
    const entries = [...unresolved.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    output(opts, {
        json: () => {
            if (opts.total)
                return { total: entries.length };
            if (opts.counts || opts.verbose)
                return {
                    unresolved: Object.fromEntries(entries.map(([k, v]) => [k, opts.verbose ? v : v.length])),
                };
            return { unresolved: entries.map(([k]) => k) };
        },
        human: () => {
            if (opts.total) {
                console.log(entries.length);
            }
            else {
                for (const [target, sources] of entries) {
                    console.log(opts.counts ? `${target}\t${sources.length}` : target);
                    if (opts.verbose) {
                        for (const s of sources)
                            console.log(`  ${dim(s)}`);
                    }
                }
            }
        },
    });
}
export async function orphans(opts) {
    const v = findVault(opts.vault);
    const { incoming } = buildLinkIndex(v.path);
    const result = [...incoming.entries()]
        .filter(([_, links]) => links.length === 0)
        .map(([file]) => file)
        .sort();
    output(opts, {
        json: () => (opts.total ? { total: result.length } : { orphans: result }),
        human: () => {
            if (opts.total)
                console.log(result.length);
            else
                for (const f of result)
                    console.log(f);
        },
    });
}
export async function deadends(opts) {
    const v = findVault(opts.vault);
    const { outgoing } = buildLinkIndex(v.path);
    const result = [...outgoing.entries()]
        .filter(([_, links]) => links.length === 0)
        .map(([file]) => file)
        .sort();
    output(opts, {
        json: () => (opts.total ? { total: result.length } : { deadends: result }),
        human: () => {
            if (opts.total)
                console.log(result.length);
            else
                for (const f of result)
                    console.log(f);
        },
    });
}
