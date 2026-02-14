import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001; // Using 3001 to avoid conflict with anything else

app.use(cors());
app.use(express.json());

// Discovery: Find all files starting with "mcp_" and ending with ".py"
app.get('/api/mcp/discover', (req, res) => {
    try {
        const files = fs.readdirSync(process.cwd());
        const mcpFiles = files
            .filter(f => f.startsWith('mcp_') && f.endsWith('.py'))
            .map(f => ({
                name: f,
                id: f.replace('.py', ''),
                path: path.join(process.cwd(), f)
            }));
        res.json({ success: true, servers: mcpFiles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// File System: List all files in the current directory (for the IDE Explorer)
app.get('/api/fs/list', (req, res) => {
    const listFiles = (dir) => {
        const results = [];
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (item === 'node_modules' || item.startsWith('.')) continue;
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            const isDirectory = stats.isDirectory();
            results.push({
                name: item,
                path: '/' + fullPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, ''),
                kind: isDirectory ? 'directory' : 'file',
                children: isDirectory ? listFiles(fullPath) : undefined
            });
        }
        return results;
    };

    try {
        const files = listFiles(process.cwd());
        res.json({ success: true, files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// File System: Read file content
app.get('/api/fs/read', (req, res) => {
    const filePath = req.query.path;
    try {
        // Strip leading slash if present to avoid path.join turning it into an absolute root path on Windows
        const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        const fullPath = path.join(process.cwd(), normalizedPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        res.json({ success: true, content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Orchestra: Get required nodes
app.get('/api/orchestra/nodes', (req, res) => {
    const nodes = [
        { id: 'mcp-db', category: 'mcp', label: 'Postgres DB', sublabel: 'SQL Analytics', icon: 'db', toolId: 't-pg' },
        { id: 'mcp-fs', category: 'mcp', label: 'File System', sublabel: 'Data Lake', icon: 'file', toolId: 't-fs' },
        { id: 'prov-gw', category: 'provider', label: 'Archestra Gateway', sublabel: 'Edge Ingress', icon: 'net', toolId: 't-gateway' },
        { id: 'prov-sec', category: 'provider', label: 'Policy Guard', sublabel: 'Zero Trust', icon: 'shield', toolId: 't-guard' },
        { id: 'cli-portal', category: 'client', label: 'Admin Portal', sublabel: 'Next.js UI', icon: 'web', toolId: 't-next' },
    ];
    res.json({ success: true, standardNodes: nodes });
});

// Orchestra: Save graph state (Representing architecture as code/config)
app.post('/api/orchestra/save', (req, res) => {
    const { nodes, edges } = req.body;
    try {
        const manifest = {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            topology: { nodes, edges }
        };
        fs.writeFileSync(path.join(process.cwd(), 'archestra_manifest.json'), JSON.stringify(manifest, null, 2));

        // Ensure a 'studio' directory exists for individual node code
        const studioDir = path.join(process.cwd(), 'studio');
        if (!fs.existsSync(studioDir)) {
            fs.mkdirSync(studioDir);
        } else {
            // Strict Cleanup: Delete all .py files in studio to ensure sync with current graph
            const existingFiles = fs.readdirSync(studioDir);
            for (const file of existingFiles) {
                if (file.endsWith('.py')) {
                    try { fs.unlinkSync(path.join(studioDir, file)); } catch (e) { }
                }
            }
        }

        const getSafeModName = (node) => {
            // Use customName if available, otherwise fall back to label
            const userLabel = node.data.customName || node.data.label || 'node';
            const slug = userLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_');

            // Extract a tiny suffix (2 chars) just to prevent OS-level file conflicts if names are identical
            const idStr = String(node.id);
            const suffix = idStr.length > 2 ? idStr.slice(-2) : idStr;

            return `${node.data.category}_${slug}_${suffix}`;
        };

        // 1. Generate individual files for each node
        const cardNodes = nodes.filter(n => n.type === 'card');
        const nodeToModMap = {};

        // Pre-calculate module names for all nodes so we can reference them in connections
        cardNodes.forEach(node => {
            nodeToModMap[node.id] = getSafeModName(node);
        });

        cardNodes.forEach(node => {
            const modName = nodeToModMap[node.id];
            const nodeFileName = `${modName}.py`;
            const nodeFilePath = path.join(studioDir, nodeFileName);

            // Find connections for YOU:
            const outgoing = edges.filter(e => e.source === node.id).map(e => ({
                targetId: e.target,
                targetMod: nodeToModMap[e.target] || 'unknown',
                label: nodes.find(n => n.id === e.target)?.data?.label || 'Unknown Node'
            }));
            const incoming = edges.filter(e => e.target === node.id).map(e => ({
                sourceId: e.source,
                sourceMod: nodeToModMap[e.source] || 'unknown',
                label: nodes.find(n => n.id === e.source)?.data?.label || 'Unknown Node'
            }));

            let nodeCode = `"""\nArchestra Node: ${node.data.customName || node.data.label}\nCategory: ${node.data.category}\nGenerated on: ${manifest.lastUpdated}\n"""\nimport os\nimport sys\n\n# Ensure we can import other nodes in the studio\nsys.path.append(os.path.dirname(__file__))\n\n`;

            // 1. GENERATE IMPORTS FOR CONNECTED NODES
            if (incoming.length > 0) {
                nodeCode += `# Upstream Imports\n`;
                incoming.forEach(inc => {
                    if (inc.sourceMod !== 'unknown') {
                        nodeCode += `import ${inc.sourceMod}\n`;
                    }
                });
                nodeCode += `\n`;
            }


            nodeCode += `# --- TOPOLOGY METADATA ---\n`;
            nodeCode += `# This node receives data from ${incoming.length} upstream node(s)\n`;
            nodeCode += `INCOMING_NODES = ${JSON.stringify(incoming, null, 4)}\n`;
            nodeCode += `# This node sends data to ${outgoing.length} downstream node(s)\n`;
            nodeCode += `OUTGOING_NODES = ${JSON.stringify(outgoing, null, 4)}\n\n`;

            if (node.data.category === 'mcp') {
                nodeCode += `from archestra import MCPClient\n\nconfig = ${JSON.stringify(node.data.config || {}, null, 4)}\n\ndef get_node():\n    return MCPClient(id="${node.id}", type="${node.data.toolId}", config=config)\n`;
            } else if (node.data.category === 'provider') {
                nodeCode += `from archestra import ArchestraGateway\n\nconfig = ${JSON.stringify(node.data.config || {}, null, 4)}\n\ndef get_node(registry):\n    # Initialize upstream dependencies\n    upstream_servers = []\n`;
                incoming.forEach(inc => {
                    if (inc.sourceMod !== 'unknown') {
                        nodeCode += `    upstream_servers.append(${inc.sourceMod}.get_node())\n`;
                    }
                });
                nodeCode += `    \n    return ArchestraGateway(\n        name="${node.data.label}", \n        registry=registry, \n        mcp_servers=upstream_servers, \n        **config\n    )\n`;
            } else if (node.data.category === 'client') {
                nodeCode += `from archestra import MCPClient\n\nconfig = ${JSON.stringify(node.data.config || {}, null, 4)}\n\ndef get_client():\n    # Resolve data sources\n    sources = []\n`;
                incoming.forEach(inc => {
                    if (inc.sourceMod !== 'unknown') {
                        const call = inc.sourceMod.startsWith('client') ? 'get_client' : 'get_node';
                        nodeCode += `    sources.append(${inc.sourceMod}.${call}())\n`;
                    }
                });
                nodeCode += `    return MCPClient(id="${node.id}", type="${node.data.toolId}", config=config, sources=sources)\n`;
            } else {
                nodeCode += `# Generic Configuration\nconfig = ${JSON.stringify(node.data.config || {}, null, 4)}\n`;
            }

            fs.writeFileSync(nodeFilePath, nodeCode);
        });

        // 2. Generate the main Orchestration script that imports these nodes
        let pythonCode = `"""\nArchestra Deployment Script\nAutomatically generated on ${manifest.lastUpdated}\n"""\nfrom archestra import ArchestraRegistry, ArchestraOrchestrator\nimport sys\nimport os\n\n# Ensure studio path is importable\nsys.path.append(os.path.join(os.getcwd(), 'studio'))\n\n# 1. Initialize Registry\nregistry = ArchestraRegistry(name="TimeToRise-Registry")\n\n# 2. Import and Register Nodes\n`;

        cardNodes.filter(n => n.data.category === 'mcp' || n.data.category === 'provider').forEach(node => {
            const modName = nodeToModMap[node.id];
            if (!modName) return;
            const registryMethod = node.data.category === 'mcp' ? 'add_server' : 'add_provider';
            pythonCode += `import ${modName}\nregistry.${registryMethod}(id="${node.id}", node=${modName}.get_node(${node.data.category === 'provider' ? 'registry' : ''}))\n`;
        });

        pythonCode += `\n# 3. Setup Orchestrator and Flows\norchestrator = ArchestraOrchestrator(name="MainOrchestrator")\n\n# Configure Flows based on UI connections\n`;

        edges.forEach(edge => {
            pythonCode += `orchestrator.add_flow(source="${edge.source}", target="${edge.target}", options={"animated": ${edge.animated}})\n`;
        });

        pythonCode += `\nif __name__ == "__main__":\n    print("Deploying Archestra Studio Architecture from individual node files...")\n    orchestrator.deploy()\n`;

        fs.writeFileSync(path.join(process.cwd(), 'archestra_deploy.py'), pythonCode);

        console.log("Archestra Topology saved as individual node files and manifest.");
        res.json({ success: true, message: 'Architecture saved as individual code files.' });
    } catch (error) {
        console.error("Save error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Orchestra: Load graph state
app.get('/api/orchestra/load', (req, res) => {
    const manifestPath = path.join(process.cwd(), 'archestra_manifest.json');
    try {
        if (fs.existsSync(manifestPath)) {
            const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            res.json({ success: true, ...data.topology });
        } else {
            res.json({ success: false, message: 'No manifest found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Run MCP (Stub)
app.post('/api/mcp/run', (req, res) => {
    const { serverId } = req.body;
    console.log(`Running MCP Server: ${serverId}`);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
