/**
 * Extract headings from markdown content.
 */
export function extractHeadings(content) {
    const headings = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            headings.push({
                level: match[1].length,
                text: match[2].trim(),
                line: i + 1,
            });
        }
    }
    return headings;
}
/**
 * Extract tasks (checkboxes) from markdown content.
 */
export function extractTasks(content) {
    const tasks = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^[\s]*[-*]\s+\[(.)\]\s+(.*)$/);
        if (match) {
            const status = match[1];
            tasks.push({
                line: i + 1,
                status,
                text: match[2].trim(),
                done: status === "x" || status === "X",
            });
        }
    }
    return tasks;
}
/**
 * Extract tags from markdown content (both inline #tags and frontmatter tags).
 */
export function extractTags(content) {
    const tags = new Set();
    // Inline tags: #tag (not inside code blocks or links)
    const tagRegex = /(?:^|\s)#([a-zA-Z][\w/-]*)/g;
    for (let match = tagRegex.exec(content); match !== null; match = tagRegex.exec(content)) {
        tags.add(match[1]);
    }
    return [...tags].sort();
}
/**
 * Extract links from markdown content.
 */
export function extractLinks(content) {
    const wikilinks = [];
    const outgoing = [];
    // Wikilinks: [[target]] or [[target|alias]]
    const wikiRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    for (let match = wikiRegex.exec(content); match !== null; match = wikiRegex.exec(content)) {
        const target = match[1].trim();
        // Strip heading/block refs
        const clean = target.split("#")[0].trim();
        if (clean) {
            wikilinks.push(clean);
            outgoing.push(clean);
        }
    }
    // Markdown links: [text](url)
    const mdRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    for (let match = mdRegex.exec(content); match !== null; match = mdRegex.exec(content)) {
        const url = match[2].trim();
        // Only internal links (not http/https/mailto)
        if (!url.match(/^(https?|mailto|obsidian):\/\//)) {
            const clean = decodeURIComponent(url.split("#")[0].trim());
            if (clean)
                outgoing.push(clean);
        }
    }
    return { outgoing, wikilinks };
}
