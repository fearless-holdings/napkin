export interface NapkinConfig {
    overview: {
        depth: number;
        keywords: number;
    };
    search: {
        limit: number;
        snippetLines: number;
    };
    daily: {
        folder: string;
        format: string;
    };
    templates: {
        folder: string;
    };
    distill: {
        enabled: boolean;
        intervalMinutes: number;
        model: {
            provider: string;
            id: string;
        };
        templates: string[];
    };
    graph: {
        renderer: "auto" | "glimpse" | "browser";
    };
}
export declare const DEFAULT_CONFIG: NapkinConfig;
/**
 * Load napkin config from .napkin/config.json.
 * Missing fields fall back to defaults.
 */
export declare function loadConfig(vaultPath: string): NapkinConfig;
/**
 * Save napkin config to .napkin/config.json and sync to .obsidian/.
 */
export declare function saveConfig(vaultPath: string, config: NapkinConfig): void;
/**
 * Update specific config fields, save, and sync.
 */
export declare function updateConfig(vaultPath: string, partial: Record<string, unknown>): NapkinConfig;
