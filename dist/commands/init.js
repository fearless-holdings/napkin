import * as fs from "node:fs";
import * as path from "node:path";
import { TEMPLATES } from "../templates/index.js";
import { DEFAULT_CONFIG, saveConfig } from "../utils/config.js";
import { bold, dim, error, output, success, } from "../utils/output.js";
function scaffoldTemplate(targetDir, template) {
    const created = [];
    for (const dir of template.dirs) {
        const dirPath = path.join(targetDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            created.push(`${dir}/`);
        }
    }
    for (const [filePath, content] of Object.entries(template.files)) {
        const fullPath = path.join(targetDir, filePath);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);
            created.push(filePath);
        }
    }
    const napkinPath = path.join(targetDir, "NAPKIN.md");
    if (!fs.existsSync(napkinPath)) {
        fs.writeFileSync(napkinPath, template.napkinMd);
        created.push("NAPKIN.md");
    }
    return created;
}
export async function init(opts) {
    const targetDir = path.resolve(opts.path || process.cwd());
    // .napkin/ is the vault root — all content lives inside it
    const napkinDir = path.join(targetDir, ".napkin");
    const napkinExists = fs.existsSync(napkinDir);
    const configExists = fs.existsSync(path.join(napkinDir, "config.json"));
    if (napkinExists && configExists && !opts.template) {
        output(opts, {
            json: () => ({
                status: "exists",
                path: napkinDir,
            }),
            human: () => {
                console.log(`${dim("Vault already initialized at")} ${bold(napkinDir)}`);
            },
        });
        return;
    }
    if (opts.template && !TEMPLATES[opts.template]) {
        error(`Unknown template: ${opts.template}. Available: ${Object.keys(TEMPLATES).join(", ")}`);
        process.exit(1);
    }
    if (!napkinExists) {
        fs.mkdirSync(napkinDir, { recursive: true });
    }
    // Write config.json and sync .obsidian/ from it
    if (!fs.existsSync(path.join(napkinDir, "config.json"))) {
        saveConfig(napkinDir, DEFAULT_CONFIG);
    }
    let templateFiles = [];
    if (opts.template) {
        // Scaffold inside .napkin/ (the vault root)
        templateFiles = scaffoldTemplate(napkinDir, TEMPLATES[opts.template]);
    }
    output(opts, {
        json: () => ({
            status: "created",
            path: napkinDir,
            napkin: !napkinExists,
            template: opts.template || null,
            files: templateFiles,
        }),
        human: () => {
            console.log(`${dim("Initialized vault at")} ${bold(napkinDir)}`);
            if (!napkinExists)
                console.log(`  ${dim("created")} .napkin/`);
            if (!configExists)
                console.log(`  ${dim("created")} config.json`);
            if (opts.template) {
                console.log(`  ${dim("template")} ${bold(opts.template)}`);
                for (const f of templateFiles) {
                    console.log(`  ${dim("created")} ${f}`);
                }
            }
            console.log("");
            success("Edit .napkin/NAPKIN.md to set your context.");
        },
    });
}
export async function initTemplates(opts) {
    const templates = Object.values(TEMPLATES).map((t) => ({
        name: t.name,
        description: t.description,
        dirs: t.dirs,
    }));
    output(opts, {
        json: () => ({ templates }),
        human: () => {
            for (const t of templates) {
                console.log(`${bold(t.name)} — ${t.description}`);
                console.log(`  ${dim("folders:")} ${t.dirs.join(", ")}`);
            }
        },
    });
}
