import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { resolveFile, suggestFile } from "../utils/files.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { dim, error, fileNotFound, output, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
export async function wordcount(opts) {
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
    const { body } = parseFrontmatter(content);
    const text = body.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const characters = text.length;
    output(opts, {
        json: () => {
            if (opts.words)
                return { words };
            if (opts.characters)
                return { characters };
            return { words, characters };
        },
        human: () => {
            if (opts.words)
                console.log(words);
            else if (opts.characters)
                console.log(characters);
            else {
                console.log(`${dim("words")}       ${words}`);
                console.log(`${dim("characters")}  ${characters}`);
            }
        },
    });
}
