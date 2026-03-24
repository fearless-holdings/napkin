import * as fs from "node:fs";
import * as path from "node:path";
export const DEFAULT_CONFIG = {
    overview: {
        depth: 3,
        keywords: 8,
    },
    search: {
        limit: 30,
        snippetLines: 0,
    },
    daily: {
        folder: "daily",
        format: "YYYY-MM-DD",
    },
    templates: {
        folder: "Templates",
    },
    distill: {
        enabled: false,
        intervalMinutes: 60,
        model: { provider: "anthropic", id: "claude-sonnet-4-6" },
        templates: [],
    },
    graph: {
        renderer: "auto",
    },
};
/**
 * Load napkin config from .napkin/config.json.
 * Missing fields fall back to defaults.
 */
export function loadConfig(vaultPath) {
    const configPath = path.join(vaultPath, "config.json");
    if (!fs.existsSync(configPath))
        return { ...DEFAULT_CONFIG };
    try {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return deepMerge(DEFAULT_CONFIG, raw);
    }
    catch {
        return { ...DEFAULT_CONFIG };
    }
}
/**
 * Save napkin config to .napkin/config.json and sync to .obsidian/.
 */
export function saveConfig(vaultPath, config) {
    const configPath = path.join(vaultPath, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    syncObsidianConfig(vaultPath, config);
}
/**
 * Update specific config fields, save, and sync.
 */
export function updateConfig(vaultPath, partial) {
    const current = loadConfig(vaultPath);
    const updated = deepMerge(current, partial);
    saveConfig(vaultPath, updated);
    return updated;
}
/**
 * Write .obsidian/ config files derived from napkin config.
 * napkin is the source of truth — Obsidian reads from these.
 */
function syncObsidianConfig(vaultPath, config) {
    const obsidianDir = path.join(vaultPath, ".obsidian");
    if (!fs.existsSync(obsidianDir)) {
        fs.mkdirSync(obsidianDir, { recursive: true });
    }
    // daily-notes.json
    fs.writeFileSync(path.join(obsidianDir, "daily-notes.json"), JSON.stringify({
        folder: config.daily.folder,
        format: config.daily.format,
        template: `${config.templates.folder}/Daily Note`,
    }, null, 2));
    // templates.json
    fs.writeFileSync(path.join(obsidianDir, "templates.json"), JSON.stringify({
        folder: config.templates.folder,
    }, null, 2));
    // app.json
    const appPath = path.join(obsidianDir, "app.json");
    let app = {};
    if (fs.existsSync(appPath)) {
        try {
            app = JSON.parse(fs.readFileSync(appPath, "utf-8"));
        }
        catch {
            // ignore
        }
    }
    app.alwaysUpdateLinks = true;
    fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
}
// biome-ignore lint/suspicious/noExplicitAny: deep merge requires flexible types
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const srcVal = source[key];
        const tgtVal = target[key];
        if (srcVal &&
            typeof srcVal === "object" &&
            !Array.isArray(srcVal) &&
            tgtVal &&
            typeof tgtVal === "object" &&
            !Array.isArray(tgtVal)) {
            result[key] = deepMerge(tgtVal, srcVal);
        }
        else {
            result[key] = srcVal;
        }
    }
    return result;
}
