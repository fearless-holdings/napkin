import * as fs from "node:fs";
import * as path from "node:path";
import { buildDatabase, parseBaseFile, queryBase } from "../utils/bases.js";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles } from "../utils/files.js";
import { bold, dim, error, output, success, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
export async function bases(opts) {
    const v = findVault(opts.vault);
    const files = listFiles(v.path).filter((f) => f.endsWith(".base"));
    output(opts, {
        json: () => ({ bases: files }),
        human: () => {
            if (files.length === 0) {
                console.log("No .base files found");
            }
            else {
                for (const f of files)
                    console.log(f);
            }
        },
    });
}
export async function baseViews(opts) {
    const v = findVault(opts.vault);
    const baseFile = resolveBaseFile(v.path, opts);
    if (!baseFile) {
        error("No base file specified. Use --file or --path");
        process.exit(EXIT_USER_ERROR);
    }
    const content = fs.readFileSync(path.join(v.path, baseFile), "utf-8");
    const config = parseBaseFile(content);
    const views = (config.views || []).map((view) => ({
        name: view.name || "(unnamed)",
        type: view.type,
    }));
    output(opts, {
        json: () => ({ views }),
        human: () => {
            for (const view of views) {
                console.log(`${bold(view.name)}  ${dim(view.type)}`);
            }
        },
    });
}
export async function baseQuery(opts) {
    const v = findVault(opts.vault);
    const baseFile = resolveBaseFile(v.path, opts);
    if (!baseFile) {
        error("No base file specified. Use --file or --path");
        process.exit(EXIT_USER_ERROR);
    }
    const content = fs.readFileSync(path.join(v.path, baseFile), "utf-8");
    const config = parseBaseFile(content);
    const db = await buildDatabase(v.path);
    try {
        // Derive thisFile from the base file path
        const thisFile = baseFile
            ? {
                name: path.basename(baseFile),
                path: baseFile,
                folder: path.dirname(baseFile),
            }
            : undefined;
        const result = await queryBase(db, config, opts.view, thisFile);
        const fmt = opts.format || "json";
        // Apply displayNames to columns for output
        const displayCols = result.columns.map((c) => result.displayNames?.[c] || c);
        output(opts, {
            json: () => {
                if (fmt === "paths") {
                    const pathIdx = result.columns.indexOf("path");
                    return { paths: result.rows.map((r) => r[pathIdx]) };
                }
                // Convert to array of objects
                const rows = result.rows.map((row) => {
                    const obj = {};
                    for (let i = 0; i < result.columns.length; i++) {
                        obj[result.columns[i]] = row[i];
                    }
                    return obj;
                });
                const out = { columns: result.columns, rows };
                if (result.displayNames &&
                    Object.keys(result.displayNames).length > 0) {
                    out.displayNames = result.displayNames;
                }
                if (result.groups) {
                    out.groups = result.groups.map((g) => ({
                        key: g.key,
                        rows: g.rows.map((row) => {
                            const obj = {};
                            for (let i = 0; i < result.columns.length; i++) {
                                obj[result.columns[i]] = row[i];
                            }
                            return obj;
                        }),
                    }));
                }
                if (result.summaries)
                    out.summaries = result.summaries;
                return out;
            },
            human: () => {
                if (result.rows.length === 0) {
                    console.log("No results");
                    return;
                }
                if (fmt === "paths") {
                    const pathIdx = result.columns.indexOf("path");
                    for (const row of result.rows)
                        console.log(row[pathIdx]);
                    return;
                }
                if (fmt === "csv" || fmt === "tsv") {
                    const sep = fmt === "csv" ? "," : "\t";
                    console.log(displayCols.join(sep));
                    for (const row of result.rows) {
                        console.log(row.map((v) => (v === null ? "" : String(v))).join(sep));
                    }
                    return;
                }
                if (fmt === "md") {
                    console.log(`| ${displayCols.join(" | ")} |`);
                    console.log(`| ${displayCols.map(() => "---").join(" | ")} |`);
                    for (const row of result.rows) {
                        console.log(`| ${row.map((v) => (v === null ? "" : String(v))).join(" | ")} |`);
                    }
                    return;
                }
                // Default: table-like
                for (const row of result.rows) {
                    const obj = {};
                    for (let i = 0; i < result.columns.length; i++) {
                        if (row[i] !== null)
                            obj[result.columns[i]] = row[i];
                    }
                    console.log(JSON.stringify(obj));
                }
            },
        });
    }
    finally {
        db.close();
    }
}
export async function baseCreate(opts) {
    const v = findVault(opts.vault);
    if (!opts.name) {
        error("No name specified. Use --name <name>");
        process.exit(EXIT_USER_ERROR);
    }
    // Create a new note (item in the base)
    const targetPath = opts.path
        ? opts.path.endsWith(".md")
            ? opts.path
            : `${opts.path}/${opts.name}.md`
        : `${opts.name}.md`;
    const fullPath = path.join(v.path, targetPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, opts.content || "");
    output(opts, {
        json: () => ({ path: targetPath, created: true }),
        human: () => success(`Created ${targetPath}`),
    });
}
function resolveBaseFile(vaultPath, opts) {
    if (opts.path) {
        const p = opts.path.endsWith(".base") ? opts.path : `${opts.path}.base`;
        if (fs.existsSync(path.join(vaultPath, p)))
            return p;
        return null;
    }
    if (opts.file) {
        // Search for .base file by name
        const allFiles = listFiles(vaultPath).filter((f) => f.endsWith(".base"));
        const target = opts.file.toLowerCase();
        for (const f of allFiles) {
            const basename = path.basename(f, ".base").toLowerCase();
            if (basename === target)
                return f;
        }
        // Try with .base extension
        const withExt = opts.file.endsWith(".base")
            ? opts.file
            : `${opts.file}.base`;
        if (fs.existsSync(path.join(vaultPath, withExt)))
            return withExt;
        return null;
    }
    return null;
}
