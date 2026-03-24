import { type OutputOptions } from "../utils/output.js";
interface SearchOpts extends OutputOptions {
    vault?: string;
    query?: string;
    path?: string;
    limit?: string;
    total?: boolean;
    snippetLines?: string;
    snippets?: boolean;
    score?: boolean;
}
export declare function search(opts: SearchOpts): Promise<void>;
export {};
