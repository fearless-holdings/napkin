import matter from "gray-matter";
/**
 * Parse YAML frontmatter from markdown content.
 */
export function parseFrontmatter(content) {
    const result = matter(content);
    return {
        properties: result.data,
        body: result.content,
        raw: result.matter,
    };
}
/**
 * Set a property in frontmatter, creating the --- block if needed.
 */
export function setProperty(content, name, value) {
    const result = matter(content);
    const data = { ...result.data, [name]: value };
    return matter.stringify(result.content, data);
}
/**
 * Remove a property from frontmatter.
 */
export function removeProperty(content, name) {
    const result = matter(content);
    const data = { ...result.data };
    delete data[name];
    // If no properties left, return just the body
    if (Object.keys(data).length === 0) {
        const body = result.content;
        return body.startsWith("\n") ? body.slice(1) : body;
    }
    return matter.stringify(result.content, data);
}
