import { type OutputOptions } from "../utils/output.js";
export declare function aliases(opts: OutputOptions & {
    vault?: string;
    file?: string;
    total?: boolean;
    verbose?: boolean;
}): Promise<void>;
