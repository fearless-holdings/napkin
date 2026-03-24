import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../utils/config.js";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile, suggestFile } from "../utils/files.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { error, fileNotFound, output, success, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
export async function read(fileRef, opts) {
    const v = findVault(opts.vault);
    if (!fileRef) {
        error("No file specified. Usage: napkin read <file>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, fileRef);
    if (!resolved) {
        fileNotFound(fileRef, suggestFile(v.path, fileRef));
        process.exit(EXIT_NOT_FOUND);
    }
    const content = fs.readFileSync(path.join(v.path, resolved), "utf-8");
    output(opts, {
        json: () => ({ path: resolved, content }),
        human: () => console.log(content),
    });
}
export async function create(opts) {
    const v = findVault(opts.vault);
    let targetPath;
    if (opts.path) {
        targetPath = opts.path.endsWith(".md") ? opts.path : `${opts.path}.md`;
    }
    else {
        const name = opts.name || "Untitled";
        targetPath = `${name}.md`;
    }
    const fullPath = path.join(v.path, targetPath);
    if (fs.existsSync(fullPath) && !opts.overwrite) {
        error(`File already exists: ${targetPath}. Use --overwrite to replace.`);
        process.exit(EXIT_USER_ERROR);
    }
    let content = opts.content || "";
    if (opts.template) {
        const config = loadConfig(v.path);
        const templateRef = resolveFile(v.path, opts.template) ||
            resolveFile(v.path, `${config.templates.folder}/${opts.template}`);
        if (templateRef) {
            content = fs.readFileSync(path.join(v.path, templateRef), "utf-8");
        }
        else {
            const tmplFiles = listFiles(v.path, {
                folder: config.templates.folder,
                ext: "md",
            }).map((f) => path.basename(f, ".md"));
            fileNotFound(opts.template, tmplFiles.slice(0, 3));
            process.exit(EXIT_NOT_FOUND);
        }
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    output(opts, {
        json: () => ({ path: targetPath, created: true }),
        human: () => success(`Created ${targetPath}`),
    });
}
async function readStdin() {
    if (process.stdin.isTTY)
        return undefined;
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    const result = Buffer.concat(chunks).toString("utf-8").trimEnd();
    return result || undefined;
}
export async function append(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use: napkin append <file> [content]");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.content) {
        opts.content = await readStdin();
    }
    if (!opts.content) {
        error("No content specified. Use: napkin append <file> <content>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const fullPath = path.join(v.path, resolved);
    const existing = fs.readFileSync(fullPath, "utf-8");
    const separator = opts.inline ? "" : "\n";
    fs.writeFileSync(fullPath, existing + separator + opts.content);
    output(opts, {
        json: () => ({ path: resolved, appended: true }),
        human: () => success(`Appended to ${resolved}`),
    });
}
export async function prepend(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use: napkin prepend <file> [content]");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.content) {
        opts.content = await readStdin();
    }
    if (!opts.content) {
        error("No content specified. Use: napkin prepend <file> <content>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const fullPath = path.join(v.path, resolved);
    const existing = fs.readFileSync(fullPath, "utf-8");
    const separator = opts.inline ? "" : "\n";
    // Insert after frontmatter if present
    const { properties, body, raw } = parseFrontmatter(existing);
    if (Object.keys(properties).length > 0) {
        const frontmatter = `---\n${raw}\n---\n`;
        fs.writeFileSync(fullPath, frontmatter + opts.content + separator + body);
    }
    else {
        fs.writeFileSync(fullPath, opts.content + separator + existing);
    }
    output(opts, {
        json: () => ({ path: resolved, prepended: true }),
        human: () => success(`Prepended to ${resolved}`),
    });
}
export async function move(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.to) {
        error("No destination specified. Use --to <path>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    let destPath = opts.to;
    // If destination is a folder (no .md extension), move file into it keeping the name
    if (!destPath.endsWith(".md")) {
        destPath = path.join(destPath, path.basename(resolved));
    }
    const srcFull = path.join(v.path, resolved);
    const destFull = path.join(v.path, destPath);
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.renameSync(srcFull, destFull);
    output(opts, {
        json: () => ({ from: resolved, to: destPath }),
        human: () => success(`Moved ${resolved} → ${destPath}`),
    });
}
export async function rename(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.name) {
        error("No new name specified. Use --name <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const resolved = resolveFile(v.path, opts.file);
    if (!resolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    const newName = opts.name.endsWith(".md") ? opts.name : `${opts.name}.md`;
    const destPath = path.join(path.dirname(resolved), newName);
    const srcFull = path.join(v.path, resolved);
    const destFull = path.join(v.path, destPath);
    fs.renameSync(srcFull, destFull);
    output(opts, {
        json: () => ({ from: resolved, to: destPath }),
        human: () => success(`Renamed ${resolved} → ${destPath}`),
    });
}
export async function del(opts) {
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
    const fullPath = path.join(v.path, resolved);
    if (opts.permanent) {
        fs.unlinkSync(fullPath);
    }
    else {
        const trashDir = path.join(v.path, ".trash");
        fs.mkdirSync(trashDir, { recursive: true });
        const trashPath = path.join(trashDir, path.basename(resolved));
        fs.renameSync(fullPath, trashPath);
    }
    output(opts, {
        json: () => ({
            path: resolved,
            deleted: true,
            permanent: !!opts.permanent,
        }),
        human: () => success(`Deleted ${resolved}${opts.permanent ? " (permanent)" : " (moved to .trash)"}`),
    });
}
