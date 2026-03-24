import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile, suggestFile } from "../utils/files.js";
import { parseFrontmatter, removeProperty as removeProp, setProperty as setProp, } from "../utils/frontmatter.js";
import { error, fileNotFound, output, success, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function collectProperties(vaultPath, fileFilter) {
    const propCounts = new Map();
    const files = fileFilter
        ? (() => {
            const r = resolveFile(vaultPath, fileFilter);
            return r ? [r] : [];
        })()
        : listFiles(vaultPath, { ext: "md" });
    for (const file of files) {
        const content = fs.readFileSync(path.join(vaultPath, file), "utf-8");
        const { properties } = parseFrontmatter(content);
        for (const key of Object.keys(properties)) {
            propCounts.set(key, (propCounts.get(key) || 0) + 1);
        }
    }
    return propCounts;
}
export async function properties(opts) {
    const v = findVault(opts.vault);
    const propCounts = collectProperties(v.path, opts.file);
    const entries = [...propCounts.entries()];
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
                return { properties: Object.fromEntries(entries) };
            return { properties: entries.map(([p]) => p) };
        },
        human: () => {
            if (opts.total) {
                console.log(entries.length);
            }
            else {
                for (const [prop, count] of entries) {
                    console.log(opts.counts ? `${prop}\t${count}` : prop);
                }
            }
        },
    });
}
export async function propertySet(opts) {
    const v = findVault(opts.vault);
    if (!opts.name || opts.value === undefined) {
        error("Usage: property:set --name <name> --value <value> --file <file>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const fullPath = path.join(v.path, resolved);
    const content = fs.readFileSync(fullPath, "utf-8");
    // Try to parse value as number/boolean/array
    let parsedValue = opts.value;
    if (opts.value === "true")
        parsedValue = true;
    else if (opts.value === "false")
        parsedValue = false;
    else if (!Number.isNaN(Number(opts.value)) && opts.value.trim() !== "")
        parsedValue = Number(opts.value);
    const updated = setProp(content, opts.name, parsedValue);
    fs.writeFileSync(fullPath, updated);
    output(opts, {
        json: () => ({ path: resolved, property: opts.name, value: parsedValue }),
        human: () => success(`Set ${opts.name} = ${opts.value} on ${resolved}`),
    });
}
export async function propertyRemove(opts) {
    const v = findVault(opts.vault);
    if (!opts.name) {
        error("No property name specified. Use --name <name>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const fullPath = path.join(v.path, resolved);
    const content = fs.readFileSync(fullPath, "utf-8");
    const updated = removeProp(content, opts.name);
    fs.writeFileSync(fullPath, updated);
    output(opts, {
        json: () => ({ path: resolved, removed: opts.name }),
        human: () => success(`Removed ${opts.name} from ${resolved}`),
    });
}
export async function propertyRead(opts) {
    const v = findVault(opts.vault);
    if (!opts.name) {
        error("No property name specified. Use --name <name>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const fullPath = path.join(v.path, resolved);
    const content = fs.readFileSync(fullPath, "utf-8");
    const { properties: props } = parseFrontmatter(content);
    const value = props[opts.name];
    output(opts, {
        json: () => ({ property: opts.name, value: value ?? null }),
        human: () => console.log(value !== undefined ? String(value) : ""),
    });
}
