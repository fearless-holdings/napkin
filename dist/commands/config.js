import { loadConfig, updateConfig } from "../utils/config.js";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { bold, dim, error, output, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
export async function configShow(opts) {
    const v = findVault(opts.vault);
    const config = loadConfig(v.path);
    output(opts, {
        json: () => config,
        human: () => {
            console.log(JSON.stringify(config, null, 2));
        },
    });
}
export async function configSet(opts) {
    const v = findVault(opts.vault);
    if (!opts.key || opts.value === undefined) {
        error("Usage: napkin config set --key <path> --value <value>");
        process.exit(EXIT_USER_ERROR);
    }
    // Parse dotted key path into nested object
    const parts = opts.key.split(".");
    const obj = {};
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = {};
        current = current[parts[i]];
    }
    // Parse value (try JSON, fall back to string)
    let parsed;
    try {
        parsed = JSON.parse(opts.value);
    }
    catch {
        parsed = opts.value;
    }
    current[parts[parts.length - 1]] = parsed;
    const updated = updateConfig(v.path, obj);
    output(opts, {
        json: () => updated,
        human: () => {
            console.log(`${dim("set")} ${bold(opts.key)} = ${JSON.stringify(parsed)}`);
        },
    });
}
export async function configGet(opts) {
    const v = findVault(opts.vault);
    if (!opts.key) {
        error("Usage: napkin config get --key <path>");
        process.exit(EXIT_USER_ERROR);
    }
    const config = loadConfig(v.path);
    const parts = opts.key.split(".");
    let value = config;
    for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
            value = value[part];
        }
        else {
            value = undefined;
            break;
        }
    }
    output(opts, {
        json: () => ({ key: opts.key, value }),
        human: () => {
            if (value === undefined) {
                console.log(dim("(not set)"));
            }
            else {
                console.log(typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value));
            }
        },
    });
}
