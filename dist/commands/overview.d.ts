import { type OutputOptions } from "../utils/output.js";
export declare function overview(opts: OutputOptions & {
    vault?: string;
    depth?: string;
    keywords?: string;
}): Promise<void>;
