import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { EXIT_NOT_FOUND, EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles } from "../utils/files.js";
import { bold, dim, error, output, success, } from "../utils/output.js";
import { findVault } from "../utils/vault.js";
function genId() {
    return crypto.randomBytes(8).toString("hex");
}
function readCanvas(vaultPath, fileRef) {
    // Try resolving as .canvas file
    let filePath = fileRef;
    if (!filePath.endsWith(".canvas"))
        filePath = `${filePath}.canvas`;
    const fullPath = path.join(vaultPath, filePath);
    if (!fs.existsSync(fullPath)) {
        // Search by name
        const all = listFiles(vaultPath).filter((f) => f.endsWith(".canvas"));
        const target = fileRef.toLowerCase().replace(/\.canvas$/, "");
        const found = all.find((f) => path.basename(f, ".canvas").toLowerCase() === target);
        if (!found) {
            error(`Canvas not found: ${fileRef}`);
            process.exit(EXIT_NOT_FOUND);
        }
        filePath = found;
    }
    const content = fs.readFileSync(path.join(vaultPath, filePath), "utf-8");
    const canvas = JSON.parse(content);
    canvas.nodes = canvas.nodes || [];
    canvas.edges = canvas.edges || [];
    return { canvas, filePath };
}
function writeCanvas(vaultPath, filePath, canvas) {
    fs.writeFileSync(path.join(vaultPath, filePath), JSON.stringify(canvas, null, 2));
}
export async function canvases(opts) {
    const v = findVault(opts.vault);
    const files = listFiles(v.path).filter((f) => f.endsWith(".canvas"));
    output(opts, {
        json: () => (opts.total ? { total: files.length } : { canvases: files }),
        human: () => {
            if (opts.total) {
                console.log(files.length);
            }
            else if (files.length === 0) {
                console.log("No .canvas files found");
            }
            else {
                for (const f of files)
                    console.log(f);
            }
        },
    });
}
export async function canvasRead(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const { canvas, filePath } = readCanvas(v.path, opts.file);
    output(opts, {
        json: () => ({ path: filePath, ...canvas }),
        human: () => {
            console.log(bold(filePath));
            console.log(`${canvas.nodes.length} nodes, ${canvas.edges.length} edges`);
            console.log();
            for (const node of canvas.nodes) {
                const desc = node.type === "text"
                    ? (node.text?.split("\n")[0] || "").slice(0, 60)
                    : node.type === "file"
                        ? node.file
                        : node.type === "link"
                            ? node.url
                            : node.type === "group"
                                ? node.label || "(unnamed group)"
                                : "";
                console.log(`  ${dim(node.id.slice(0, 8))}  ${node.type.padEnd(6)} ${desc}`);
            }
            if (canvas.edges.length > 0) {
                console.log();
                for (const edge of canvas.edges) {
                    const label = edge.label ? ` "${edge.label}"` : "";
                    console.log(`  ${dim(edge.id.slice(0, 8))}  ${edge.fromNode.slice(0, 8)} → ${edge.toNode.slice(0, 8)}${label}`);
                }
            }
        },
    });
}
export async function canvasNodes(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const { canvas } = readCanvas(v.path, opts.file);
    let nodes = canvas.nodes;
    if (opts.type) {
        nodes = nodes.filter((n) => n.type === opts.type);
    }
    output(opts, {
        json: () => ({ nodes }),
        human: () => {
            for (const node of nodes) {
                const desc = node.type === "text"
                    ? (node.text?.split("\n")[0] || "").slice(0, 60)
                    : node.type === "file"
                        ? node.file
                        : node.type === "link"
                            ? node.url
                            : node.label || "";
                console.log(`${node.id}  ${node.type.padEnd(6)} ${desc}`);
            }
        },
    });
}
export async function canvasCreate(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No file name specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const fileName = opts.file.endsWith(".canvas")
        ? opts.file
        : `${opts.file}.canvas`;
    const targetPath = opts.path ? `${opts.path}/${fileName}` : fileName;
    const fullPath = path.join(v.path, targetPath);
    if (fs.existsSync(fullPath)) {
        error(`Canvas already exists: ${targetPath}`);
        process.exit(EXIT_USER_ERROR);
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const canvas = { nodes: [], edges: [] };
    writeCanvas(v.path, targetPath, canvas);
    output(opts, {
        json: () => ({ path: targetPath, created: true }),
        human: () => success(`Created ${targetPath}`),
    });
}
export async function canvasAddNode(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No canvas file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    const nodeType = (opts.type || "text");
    if (!["text", "file", "link", "group"].includes(nodeType)) {
        error("Invalid node type. Use: text, file, link, or group");
        process.exit(EXIT_USER_ERROR);
    }
    const { canvas, filePath } = readCanvas(v.path, opts.file);
    // Auto-position: find rightmost node and place next to it
    const maxX = canvas.nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
    const node = {
        id: genId(),
        type: nodeType,
        x: opts.x
            ? Number.parseInt(opts.x, 10)
            : canvas.nodes.length > 0
                ? maxX + 50
                : 0,
        y: opts.y ? Number.parseInt(opts.y, 10) : 0,
        width: opts.width
            ? Number.parseInt(opts.width, 10)
            : nodeType === "group"
                ? 600
                : 300,
        height: opts.height
            ? Number.parseInt(opts.height, 10)
            : nodeType === "group"
                ? 400
                : 150,
    };
    if (nodeType === "text")
        node.text = opts.text || "";
    if (nodeType === "file") {
        node.file = opts.noteFile || "";
        if (opts.subpath)
            node.subpath = opts.subpath;
    }
    if (nodeType === "link")
        node.url = opts.url || "";
    if (nodeType === "group")
        node.label = opts.label || "";
    if (opts.color)
        node.color = opts.color;
    canvas.nodes.push(node);
    writeCanvas(v.path, filePath, canvas);
    output(opts, {
        json: () => ({ id: node.id, type: node.type, added: true }),
        human: () => success(`Added ${node.type} node ${node.id}`),
    });
}
export async function canvasAddEdge(opts) {
    const v = findVault(opts.vault);
    if (!opts.file) {
        error("No canvas file specified. Use --file <name>");
        process.exit(EXIT_USER_ERROR);
    }
    if (!opts.from || !opts.to) {
        error("Both --from and --to node IDs required");
        process.exit(EXIT_USER_ERROR);
    }
    const { canvas, filePath } = readCanvas(v.path, opts.file);
    // Validate node IDs exist (match by full ID or prefix)
    const findNode = (ref) => canvas.nodes.find((n) => n.id === ref || n.id.startsWith(ref));
    const fromNode = findNode(opts.from);
    const toNode = findNode(opts.to);
    if (!fromNode) {
        error(`Node not found: ${opts.from}`);
        process.exit(EXIT_NOT_FOUND);
    }
    if (!toNode) {
        error(`Node not found: ${opts.to}`);
        process.exit(EXIT_NOT_FOUND);
    }
    const edge = {
        id: genId(),
        fromNode: fromNode.id,
        toNode: toNode.id,
    };
    if (opts.fromSide)
        edge.fromSide = opts.fromSide;
    if (opts.toSide)
        edge.toSide = opts.toSide;
    if (opts.label)
        edge.label = opts.label;
    if (opts.color)
        edge.color = opts.color;
    canvas.edges.push(edge);
    writeCanvas(v.path, filePath, canvas);
    output(opts, {
        json: () => ({
            id: edge.id,
            from: edge.fromNode,
            to: edge.toNode,
            added: true,
        }),
        human: () => success(`Added edge ${edge.fromNode.slice(0, 8)} → ${edge.toNode.slice(0, 8)}`),
    });
}
export async function canvasRemoveNode(opts) {
    const v = findVault(opts.vault);
    if (!opts.file || !opts.id) {
        error("Both --file and --id required");
        process.exit(EXIT_USER_ERROR);
    }
    const { canvas, filePath } = readCanvas(v.path, opts.file);
    const id = opts.id;
    const node = canvas.nodes.find((n) => n.id === id || n.id.startsWith(id));
    if (!node) {
        error(`Node not found: ${opts.id}`);
        process.exit(EXIT_NOT_FOUND);
    }
    // Remove node and any connected edges
    canvas.nodes = canvas.nodes.filter((n) => n.id !== node.id);
    canvas.edges = canvas.edges.filter((e) => e.fromNode !== node.id && e.toNode !== node.id);
    writeCanvas(v.path, filePath, canvas);
    output(opts, {
        json: () => ({ id: node.id, removed: true }),
        human: () => success(`Removed node ${node.id}`),
    });
}
