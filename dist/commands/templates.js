import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../utils/config.js";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile, suggestFile } from "../utils/files.js";
import { error, fileNotFound, output, success, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function getTemplateFolder(vaultPath) {
    const config = loadConfig(vaultPath);
    return config.templates.folder;
}
export async function templates(opts) {
    const v = findVault(opts.vault);
    const folder = getTemplateFolder(v.path);
    const files = listFiles(v.path, { folder, ext: "md" }).map((f) => path.basename(f, ".md"));
    output(opts, {
        json: () => (opts.total ? { total: files.length } : { templates: files }),
        human: () => {
            if (opts.total)
                console.log(files.length);
            else
                for (const f of files)
                    console.log(f);
        },
    });
}
export async function templateRead(opts) {
    const v = findVault(opts.vault);
    if (!opts.name) {
        error("No template name specified. Use --name <template>");
        process.exit(EXIT_USER_ERROR);
    }
    const folder = getTemplateFolder(v.path);
    const resolved = resolveFile(v.path, `${folder}/${opts.name}`) ||
        resolveFile(v.path, opts.name);
    if (!resolved) {
        const templateFiles = listFiles(v.path, { folder, ext: "md" }).map((f) => path.basename(f, ".md"));
        fileNotFound(opts.name, templateFiles.slice(0, 3));
        process.exit(EXIT_NOT_FOUND);
    }
    let content = fs.readFileSync(path.join(v.path, resolved), "utf-8");
    if (opts.resolve) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        content = content
            .replace(/\{\{date\}\}/g, dateStr)
            .replace(/\{\{time\}\}/g, timeStr)
            .replace(/\{\{title\}\}/g, opts.title || "Untitled");
    }
    output(opts, {
        json: () => ({ template: opts.name, content }),
        human: () => console.log(content),
    });
}
export async function templateInsert(opts) {
    const v = findVault(opts.vault);
    if (!opts.name) {
        error("No template name specified. Use --name <template>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.file) {
        error("No target file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const folder = getTemplateFolder(v.path);
    const templateResolved = resolveFile(v.path, `${folder}/${opts.name}`) ||
        resolveFile(v.path, opts.name);
    if (!templateResolved) {
        const templateFiles = listFiles(v.path, { folder, ext: "md" }).map((f) => path.basename(f, ".md"));
        fileNotFound(opts.name, templateFiles.slice(0, 3));
        process.exit(EXIT_NOT_FOUND);
    }
    const targetResolved = resolveFile(v.path, opts.file);
    if (!targetResolved) {
        fileNotFound(opts.file, suggestFile(v.path, opts.file));
        process.exit(EXIT_NOT_FOUND);
    }
    let templateContent = fs.readFileSync(path.join(v.path, templateResolved), "utf-8");
    // Resolve variables
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const title = path.basename(targetResolved, ".md");
    templateContent = templateContent
        .replace(/\{\{date\}\}/g, dateStr)
        .replace(/\{\{time\}\}/g, timeStr)
        .replace(/\{\{title\}\}/g, title);
    const targetPath = path.join(v.path, targetResolved);
    const existing = fs.readFileSync(targetPath, "utf-8");
    fs.writeFileSync(targetPath, existing + templateContent);
    output(opts, {
        json: () => ({ file: targetResolved, template: opts.name, inserted: true }),
        human: () => success(`Inserted template "${opts.name}" into ${targetResolved}`),
    });
}
