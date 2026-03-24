import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { dim, error, output, success, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function readBookmarks(vaultPath) {
    const configPath = path.join(vaultPath, ".obsidian", "bookmarks.json");
    try {
        const content = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return [];
    }
}
function writeBookmarks(vaultPath, bookmarks) {
    const configPath = path.join(vaultPath, ".obsidian", "bookmarks.json");
    fs.writeFileSync(configPath, JSON.stringify(bookmarks, null, 2));
}
function flattenBookmarks(items) {
    const result = [];
    for (const item of items) {
        if (item.type === "group" && item.items) {
            result.push(...flattenBookmarks(item.items));
        }
        else {
            result.push(item);
        }
    }
    return result;
}
export async function bookmarks(opts) {
    const v = findVault(opts.vault);
    const items = readBookmarks(v.path);
    const flat = flattenBookmarks(items);
    output(opts, {
        json: () => (opts.total ? { total: flat.length } : { bookmarks: flat }),
        human: () => {
            if (opts.total) {
                console.log(flat.length);
            }
            else {
                for (const b of flat) {
                    const label = b.title || b.path || b.query || b.url || "(untitled)";
                    console.log(opts.verbose ? `${label}\t${dim(b.type)}` : label);
                }
            }
        },
    });
}
export async function bookmark(opts) {
    const v = findVault(opts.vault);
    let entry;
    if (opts.file) {
        entry = {
            type: "file",
            path: opts.file,
            title: opts.title,
            subpath: opts.subpath,
        };
    }
    else if (opts.folder) {
        entry = { type: "folder", path: opts.folder, title: opts.title };
    }
    else if (opts.search) {
        entry = { type: "search", query: opts.search, title: opts.title };
    }
    else if (opts.url) {
        entry = { type: "url", url: opts.url, title: opts.title };
    }
    else {
        error("Specify --file, --folder, --search, or --url to bookmark");
        process.exit(EXIT_USER_ERROR);
    }
    const items = readBookmarks(v.path);
    items.push(entry);
    writeBookmarks(v.path, items);
    output(opts, {
        json: () => ({ added: entry }),
        human: () => success(`Bookmarked ${entry.path || entry.query || entry.url}`),
    });
}
