export interface Heading {
    level: number;
    text: string;
    line: number;
}
export interface Task {
    line: number;
    status: string;
    text: string;
    done: boolean;
}
export interface LinkInfo {
    outgoing: string[];
    wikilinks: string[];
}
/**
 * Extract headings from markdown content.
 */
export declare function extractHeadings(content: string): Heading[];
/**
 * Extract tasks (checkboxes) from markdown content.
 */
export declare function extractTasks(content: string): Task[];
/**
 * Extract tags from markdown content (both inline #tags and frontmatter tags).
 */
export declare function extractTags(content: string): string[];
/**
 * Extract links from markdown content.
 */
export declare function extractLinks(content: string): LinkInfo;
