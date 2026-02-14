import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Server,
  ShieldAlert,
  Layout,
  Database,
  Zap,
  Lock,
  Network,
  Smartphone,
  Globe,
  Box,
  Settings,
  Terminal,
  Play,
  Activity,
  Plus,
  Search,
  X,
  CreditCard,
  Mail,
  Slack,
  FileText,
  Code,
  Shield,
  Key,
  Layers,
  Wifi,
  Save,
  Trash2,
  Code2,
  Workflow,
} from "lucide-react";
// Assuming IDEPage is in the same directory or you can paste the IDE code here.
// If you are using the single-file version from before, replace this import with the IDEPage component definition.
import IDEPage from "./IDEPage";
import "./app.css";
// --- 1. CONFIGURATION ---
const COLUMNS = {
  mcp: {
    label: "MCP SERVERS",
    color: "#06b6d4",
    icon: Server,
    bg: "rgba(6, 182, 212, 0.05)",
    border: "rgba(6, 182, 212, 0.2)",
    handle: "!bg-cyan-500",
  },
  provider: {
    label: "ARCHESTRA PROVIDER",
    color: "#8b5cf6",
    icon: ShieldAlert,
    bg: "rgba(139, 92, 246, 0.05)",
    border: "rgba(139, 92, 246, 0.2)",
    handle: "!bg-violet-500",
  },
  client: {
    label: "CLIENT APPLICATIONS",
    color: "#eab308",
    icon: Layout,
    bg: "rgba(234, 179, 8, 0.05)",
    border: "rgba(234, 179, 8, 0.2)",
    handle: "!bg-yellow-500",
  },
};

const ICON_MAP = {
  db: Database,
  api: Zap,
  secure: Lock,
  net: Network,
  mobile: Smartphone,
  web: Globe,
  box: Box,
  stripe: CreditCard,
  mail: Mail,
  slack: Slack,
  file: FileText,
  code: Code,
  shield: Shield,
  key: Key,
  layers: Layers,
  wifi: Wifi,
  terminal: Terminal,
};

// --- 2. TOOL DEFINITIONS ---
const TOOL_CONFIGS = {
  "t-pg": {
    fields: [
      {
        key: "db_url",
        label: "Connection String",
        type: "password",
        placeholder: "postgresql://...",
      },
      {
        key: "pool_size",
        label: "Pool Size",
        type: "number",
        placeholder: "10",
      },
      {
        key: "ssl",
        label: "SSL Mode",
        type: "select",
        options: ["Disable", "Require", "Verify-CA"],
      },
    ],
  },
  "t-stripe": {
    fields: [
      {
        key: "api_key",
        label: "Secret Key",
        type: "password",
        placeholder: "sk_live_...",
      },
      {
        key: "webhook",
        label: "Webhook URL",
        type: "text",
        placeholder: "https://...",
      },
      {
        key: "currency",
        label: "Default Currency",
        type: "select",
        options: ["USD", "EUR", "GBP"],
      },
    ],
  },
  "t-slack": {
    fields: [
      {
        key: "bot_token",
        label: "Bot User Token",
        type: "password",
        placeholder: "xoxb-...",
      },
      {
        key: "channel",
        label: "Default Channel",
        type: "text",
        placeholder: "#alerts",
      },
    ],
  },
  "t-gateway": {
    fields: [
      { key: "port", label: "Port", type: "number", placeholder: "8080" },
      {
        key: "timeout",
        label: "Timeout (ms)",
        type: "number",
        placeholder: "5000",
      },
      { key: "cors", label: "CORS Origins", type: "text", placeholder: "*" },
    ],
  },
  "t-guard": {
    fields: [
      {
        key: "sensitivity",
        label: "Sensitivity Level",
        type: "select",
        options: ["High", "Medium", "Low"],
      },
      {
        key: "log_retention",
        label: "Log Retention (Days)",
        type: "number",
        placeholder: "30",
      },
    ],
  },
  "t-next": {
    fields: [
      {
        key: "url",
        label: "App URL",
        type: "text",
        placeholder: "https://myapp.vercel.app",
      },
      {
        key: "api_route",
        label: "API Route",
        type: "text",
        placeholder: "/api/chat",
      },
    ],
  },
  default: {
    fields: [
      {
        key: "name",
        label: "Resource Name",
        type: "text",
        placeholder: "My Resource",
      },
      {
        key: "desc",
        label: "Description",
        type: "text",
        placeholder: "Description...",
      },
    ],
  },
};

const AVAILABLE_TOOLS = {
  mcp: [
    {
      id: "t-pg",
      label: "Postgres DB",
      sublabel: "Read/Write SQL",
      icon: "db",
    },
    {
      id: "t-stripe",
      label: "Stripe API",
      sublabel: "Payments",
      icon: "stripe",
    },
    {
      id: "t-slack",
      label: "Slack Bot",
      sublabel: "Channel Ops",
      icon: "slack",
    },
    {
      id: "t-fs",
      label: "File System",
      sublabel: "Local Storage",
      icon: "file",
    },
  ],
  provider: [
    { id: "t-gateway", label: "API Gateway", sublabel: "Ingress", icon: "net" },
    {
      id: "t-guard",
      label: "PII Redaction",
      sublabel: "Privacy Filter",
      icon: "shield",
    },
    { id: "t-auth", label: "Auth Guard", sublabel: "JWT/OAuth", icon: "key" },
  ],
  client: [
    {
      id: "t-next",
      label: "Next.js App",
      sublabel: "Web Dashboard",
      icon: "web",
    },
    { id: "t-cli", label: "CLI Tool", sublabel: "Terminal", icon: "terminal" },
  ],
};

// --- 3. CUSTOM REACT FLOW COMPONENTS ---
const LaneNode = ({ data }) => {
  const colConfig = COLUMNS[data.category];
  const Icon = colConfig.icon;
  return (
    <div
      className="h-full w-full relative rounded-xl transition-all"
      style={{
        backgroundColor: colConfig.bg,
        border: `1px solid ${colConfig.border}`,
        minWidth: 10,
        minHeight: 10,
      }}
    >
      <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0B0E14] border shadow-xl"
          style={{ borderColor: colConfig.border }}
        >
          <Icon size={14} color={colConfig.color} />
          <span
            className="text-[11px] font-bold tracking-[2px]"
            style={{ color: colConfig.color }}
          >
            {colConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
};

const CardNode = ({ data, selected }) => {
  const colConfig = COLUMNS[data.category] || COLUMNS.mcp;
  const Icon = ICON_MAP[data.icon] || Box;
  return (
    <div
      className={`relative group flex items-center justify-between w-full h-full px-3 pr-4 bg-[#151A25] border rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-1 ${selected ? `border-[${colConfig.color}] shadow-[0_0_20px_-5px_${colConfig.color}40]` : "border-[#2A3241] hover:border-gray-500"}`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg transition-all"
        style={{ backgroundColor: colConfig.color }}
      />
      <div className="flex items-center gap-3 ml-3">
        <div
          className={`p-1.5 rounded-md bg-[#0B0E14] border border-[#2A3241] ${selected ? "opacity-100" : "opacity-70"}`}
        >
          <Icon size={16} color={colConfig.color} />
        </div>
        <div className="flex flex-col">
          <span
            className={`text-[12px] font-bold tracking-wide ${selected ? "text-white" : "text-gray-300"}`}
          >
            {data.label}
          </span>
          <span className="text-[9px] text-gray-500 font-mono uppercase">
            {data.sublabel}
          </span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-2 !h-2 !border-none opacity-0 group-hover:opacity-100 transition-opacity ${colConfig.handle}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={`!w-2 !h-2 !border-none opacity-0 group-hover:opacity-100 transition-opacity ${colConfig.handle}`}
      />
    </div>
  );
};

const PlusNode = ({ data }) => {
  const colConfig = COLUMNS[data.category];
  return (
    <button
      onClick={() => data.onOpenModal(data.category)}
      className="group w-full h-full border border-dashed border-[#2A3241] rounded-lg flex items-center justify-center gap-2 hover:border-gray-500 hover:bg-[#151A25]/50 transition-all active:scale-95"
    >
      <div
        className={`p-1 rounded-full bg-[#0B0E14] border border-[#2A3241] group-hover:border-[${colConfig.color}] transition-colors`}
      >
        <Plus size={14} color={colConfig.color} />
      </div>
      <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-300 tracking-wide">
        ADD NODE
      </span>
    </button>
  );
};

// --- 4. CONFIGURATION SIDEBAR COMPONENT ---
const ConfigSidebar = ({ selectedNode, updateNodeData, onDeleteNode }) => {
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-600">
        <div className="w-16 h-16 rounded-full bg-[#151A25] border border-[#2A3241] flex items-center justify-center mb-4">
          <Layout size={24} className="text-gray-500 opacity-50" />
        </div>
        <h3 className="text-sm font-bold text-gray-400 mb-2">
          No Node Selected
        </h3>
        <p className="text-xs leading-relaxed max-w-[200px]">
          Click a node to configure its parameters.
        </p>
      </div>
    );
  }

  const toolId = selectedNode.data.toolId || "default";
  const config = TOOL_CONFIGS[toolId] || TOOL_CONFIGS["default"];
  const values = selectedNode.data.config || {};

  const handleChange = (key, value) => {
    updateNodeData(selectedNode.id, {
      ...selectedNode.data,
      config: { ...values, [key]: value },
    });
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-10 fade-in duration-200">
      <div className="p-6 border-b border-[#2A3241]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded bg-[#151A25] border border-[#2A3241]">
            <Settings size={14} className="text-gray-400" />
          </div>
          <span className="text-xs font-bold text-gray-400 tracking-widest">
            CONFIGURATION
          </span>
        </div>
        <div className="space-y-2 mt-4">
          <label className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
            NODE IDENTITY
          </label>
          <input
            type="text"
            className="w-full bg-[#0E1117] border border-[#2A3241] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            value={selectedNode.data.label || ""}
            onChange={(e) => updateNodeData(selectedNode.id, { ...selectedNode.data, label: e.target.value })}
            placeholder="E.g. Auth Gateway"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              {field.label}
            </label>
            {field.type === "select" ? (
              <select
                className="w-full bg-[#0E1117] border border-[#2A3241] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors appearance-none"
                value={values[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              >
                <option value="" disabled>
                  Select option...
                </option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === "password" ? "password" : "text"}
                className="w-full bg-[#0E1117] border border-[#2A3241] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-gray-700"
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-violet-400" />
            <span className="text-xs font-bold text-violet-400">
              LIVE METRICS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-gray-500">Uptime</div>
              <div className="text-sm font-mono text-gray-300">99.9%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Latency</div>
              <div className="text-sm font-mono text-gray-300">24ms</div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-[#2A3241] flex gap-3">
        <button
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
          onClick={() => updateNodeData(selectedNode.id, selectedNode.data)}
        >
          <Save size={14} /> SAVE
        </button>
        <button
          className="flex items-center justify-center p-2 rounded-md bg-[#2A3241] hover:bg-red-900/20 hover:text-red-400 text-gray-400 transition-colors"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// --- 5. INITIAL DATA ---
const LANE_WIDTH = 350;
const LANE_HEIGHT = 800;
const CARD_WIDTH = 310;
const CARD_HEIGHT = 64;
const START_X = 100;
const GAP_X = 60;
const START_Y = 60;
const CARD_GAP_Y = 90;

const initialNodes = [
  {
    id: "lane-mcp",
    type: "lane",
    position: { x: START_X, y: 50 },
    style: { width: LANE_WIDTH, height: LANE_HEIGHT },
    data: { category: "mcp" },
    zIndex: -1,
  },
  {
    id: "lane-provider",
    type: "lane",
    position: { x: START_X + LANE_WIDTH + GAP_X, y: 50 },
    style: { width: LANE_WIDTH, height: LANE_HEIGHT },
    data: { category: "provider" },
    zIndex: -1,
  },
  {
    id: "lane-client",
    type: "lane",
    position: { x: START_X + (LANE_WIDTH + GAP_X) * 2, y: 50 },
    style: { width: LANE_WIDTH, height: LANE_HEIGHT },
    data: { category: "client" },
    zIndex: -1,
  },
  {
    id: "add-mcp",
    type: "plus",
    parentId: "lane-mcp",
    extent: "parent",
    position: { x: 20, y: START_Y },
    style: { width: CARD_WIDTH, height: 48 },
    data: { category: "mcp" },
  },
  {
    id: "add-provider",
    type: "plus",
    parentId: "lane-provider",
    extent: "parent",
    position: { x: 20, y: START_Y },
    style: { width: CARD_WIDTH, height: 48 },
    data: { category: "provider" },
  },
  {
    id: "add-client",
    type: "plus",
    parentId: "lane-client",
    extent: "parent",
    position: { x: 20, y: START_Y },
    style: { width: CARD_WIDTH, height: 48 },
    data: { category: "client" },
  },
];

const initialEdges = [];

export default function ArchestraStudio() {
  const [activeScreen, setActiveScreen] = useState("orchestra"); // 'orchestra' | 'ide'
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    category: null,
  });

  // Fetch actual nodes and discovered servers from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Try to load existing manifest first
        const loadRes = await fetch('http://localhost:3001/api/orchestra/load');
        const loadData = await loadRes.json();

        if (loadData.success && loadData.nodes) {
          setNodes(loadData.nodes);
          setEdges(loadData.edges || []);
          console.log("Loaded architecture from manifest.");
          return;
        }

        // 2. If no manifest, perform discovery logic
        const [nodesRes, mcpRes] = await Promise.all([
          fetch('http://localhost:3001/api/orchestra/nodes'),
          fetch('http://localhost:3001/api/mcp/discover')
        ]);

        const nodesData = await nodesRes.json();
        const mcpData = await mcpRes.json();

        if (nodesData.success) {
          // Keep only lanes and add buttons from initial state
          const updatedNodes = [...initialNodes.filter(n => n.type === 'lane' || n.type === 'plus')];

          // Count items per category to stack them correctly
          const counts = { mcp: 0, provider: 0, client: 0 };

          nodesData.standardNodes.forEach((node) => {
            const cat = node.category;
            updatedNodes.push({
              id: node.id,
              type: 'card',
              parentId: `lane-${cat}`,
              extent: 'parent',
              position: { x: 20, y: START_Y + (counts[cat] * CARD_GAP_Y) },
              style: { width: CARD_WIDTH, height: CARD_HEIGHT },
              data: { ...node }
            });
            counts[cat]++;
          });

          // Also inject discovered MCP servers as nodes in the MCP lane
          if (mcpData.success) {
            mcpData.servers.forEach((server) => {
              updatedNodes.push({
                id: `mcp-auto-${server.id}`,
                type: 'card',
                parentId: 'lane-mcp',
                extent: 'parent',
                position: { x: 20, y: START_Y + (counts.mcp * CARD_GAP_Y) },
                style: { width: CARD_WIDTH, height: CARD_HEIGHT },
                data: {
                  category: 'mcp',
                  label: server.name.replace('.py', '').replace('mcp_', '').toUpperCase(),
                  sublabel: 'Auto-discovered Server',
                  icon: 'code',
                  toolId: server.id
                }
              });
              counts.mcp++;
            });
          }

          // Reposition "Add" buttons to be at the bottom of each list
          updatedNodes.forEach(node => {
            if (node.type === 'plus') {
              const cat = node.data.category;
              node.position.y = START_Y + (counts[cat] * CARD_GAP_Y);
            }
          });

          setNodes(updatedNodes);
        }
      } catch (err) {
        console.error("Failed to fetch backend data:", err);
      }
    };

    fetchData();
  }, []); // Only on mount

  // 3. Auto-save architecture to backend (Architecture as Code)
  useEffect(() => {
    // Skip saving if nodes are just the default lanes (empty)
    if (nodes.length <= 3) return;

    const timer = setTimeout(async () => {
      try {
        await fetch('http://localhost:3001/api/orchestra/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges })
        });
        console.log("Auto-saved Archestra topology.");
      } catch (err) {
        console.error("Failed to auto-save Archestra topology:", err);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const nodeTypes = useMemo(
    () => ({ lane: LaneNode, card: CardNode, plus: PlusNode }),
    [],
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#fff", strokeWidth: 1.5 },
            type: "smoothstep",
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const updateNodeData = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: newData } : node,
        ),
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: newData } : prev,
      );
    },
    [setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return;

      const category = nodeToDelete.data.category;
      const deleteY = nodeToDelete.position.y;

      setNodes((nds) => {
        // 1. Remove the node
        let updatedNodes = nds.filter((n) => n.id !== nodeId);

        // 2. Shift all nodes below it in the same lane up
        updatedNodes = updatedNodes.map((n) => {
          if (n.parentId === `lane-${category}` && n.position.y > deleteY) {
            return { ...n, position: { ...n.position, y: n.position.y - CARD_GAP_Y } };
          }
          return n;
        });

        return updatedNodes;
      });

      // 3. Remove any connected edges
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

      setSelectedNode(null);
    },
    [nodes, setNodes, setEdges],
  );

  const handleAddNode = useCallback(
    (toolData) => {
      const category = modalState.category;
      setNodes((currentNodes) => {
        const addButton = currentNodes.find((n) => n.id === `add-${category}`);
        if (!addButton) return currentNodes;
        const newNodeId = `${category}-${Date.now()}`;
        const newNode = {
          id: newNodeId,
          type: "card",
          parentId: `lane-${category}`,
          extent: "parent",
          position: { x: addButton.position.x, y: addButton.position.y },
          style: { width: CARD_WIDTH, height: CARD_HEIGHT },
          data: {
            category,
            label: toolData.label,
            sublabel: toolData.sublabel,
            icon: toolData.icon,
            toolId: toolData.id,
          },
        };
        const updatedButton = {
          ...addButton,
          position: {
            ...addButton.position,
            y: addButton.position.y + CARD_GAP_Y,
          },
        };
        return [
          ...currentNodes.filter((n) => n.id !== `add-${category}`),
          newNode,
          updatedButton,
        ];
      });
      setModalState({ isOpen: false, category: null });
    },
    [modalState, setNodes],
  );

  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((node) =>
        node.type === "plus"
          ? {
            ...node,
            data: {
              ...node.data,
              onOpenModal: (cat) =>
                setModalState({ isOpen: true, category: cat }),
            },
          }
          : node,
      ),
    [nodes],
  );

  // Modal Component
  const NodeSelectorModal = ({ isOpen, onClose, category, onSelect }) => {
    const [search, setSearch] = useState("");
    if (!isOpen) return null;
    const colConfig = COLUMNS[category];
    const tools = AVAILABLE_TOOLS[category] || [];
    const filteredTools = tools.filter((t) =>
      t.label.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-[500px] bg-[#0B0E14] border border-[#2A3241] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-[#2A3241] flex items-center justify-between bg-[#151A25]">
            <span className="text-sm font-bold tracking-wide text-gray-200">
              ADD {colConfig.label} NODE
            </span>
            <button onClick={onClose}>
              <X size={18} className="text-gray-500 hover:text-white" />
            </button>
          </div>
          <div className="p-4 border-b border-[#2A3241]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-3 text-gray-500"
              />
              <input
                autoFocus
                type="text"
                placeholder="Search tools..."
                className="w-full bg-[#0B0E14] border border-[#2A3241] rounded-lg py-2 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredTools.map((tool) => {
              const Icon = ICON_MAP[tool.icon] || Box;
              return (
                <button
                  key={tool.id}
                  onClick={() => onSelect(tool)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#151A25] group transition-colors text-left border border-transparent hover:border-[#2A3241]"
                >
                  <div
                    className={`p-2 rounded-md bg-[#0B0E14] border border-[#2A3241] group-hover:border-[${colConfig.color}]`}
                  >
                    <Icon size={18} color={colConfig.color} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-200 group-hover:text-white">
                      {tool.label}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase">
                      {tool.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen bg-[#0B0E14] overflow-hidden font-sans text-gray-200 relative">
      <NodeSelectorModal
        isOpen={modalState.isOpen}
        category={modalState.category}
        onClose={() => setModalState({ isOpen: false, category: null })}
        onSelect={handleAddNode}
      />

      {/* --- CONTENT AREA (SWITCHABLE) --- */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header with INTEGRATED NAVIGATION */}
        <div className="h-[60px] bg-[#0B0E14]/80 backdrop-blur-md border-b border-[#2A3241] flex items-center justify-between px-6 z-40 shrink-0 relative">
          <div className="flex items-center gap-3">
            <h1 className="text-gray-200 font-bold tracking-widest text-xs">
              ARCHESTRA <span className="text-violet-500">STUDIO</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#151A25] text-gray-500 border border-[#2A3241]">
              v3.0.0
            </span>
          </div>

          {/* --- TOP NAVIGATION BAR (CENTERED) --- */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center h-8 gap-8  bg-[#151A25] border border-[#2A3241] rounded-lg">
              <button
                onClick={() => setActiveScreen("orchestra")}
                className={`flex items-center gap-2   rounded-md transition-all duration-200 ${activeScreen === "orchestra"
                  ? " text-violet-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#2A3241]/50"
                  }`}
              >
                <Workflow size={14} />
                <span className="text-[10px]  font-bold tracking-wide ml-8">
                  ORCHESTRA
                </span>
              </button>
              <div className="w-px h-4 bg-[#2A3241]" />
              <button
                onClick={() => setActiveScreen("ide")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 ${activeScreen === "ide"
                  ? "bg-[#2A3241] text-cyan-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#2A3241]/50"
                  }`}
              >
                <Code2 size={14} />
                <span className="text-[10px] font-bold tracking-wide">IDE</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-4 py-1.5 rounded-md shadow-lg shadow-violet-900/20 active:scale-95 transition-all">
              <Play size={14} fill="currentColor" />
              <span className="text-xs font-bold tracking-wide">DEPLOY</span>
            </button>
          </div>
        </div>

        {/* --- ORCHESTRA VIEW --- */}
        <div
          className="flex-1 flex overflow-hidden"
          style={{ display: activeScreen === "orchestra" ? "flex" : "none" }}
        >
          <div className="flex-1 relative bg-[#0B0E14]">
            <ReactFlow
              nodes={nodesWithHandlers}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(e, node) => setSelectedNode(node)}
              onPaneClick={() => setSelectedNode(null)}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
              minZoom={0.5}
              defaultEdgeOptions={{
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
            >
              <Background
                color="#2A3241"
                variant="dots"
                gap={24}
                size={1.5}
                className="opacity-40"
              />
              <Controls className="!bg-[#151A25] !border-[#2A3241] !fill-gray-400" />
              <MiniMap
                nodeColor={(n) => COLUMNS[n.data.category]?.color || "#333"}
                className="!bg-[#151A25] !border-[#2A3241]"
              />
            </ReactFlow>
          </div>

          {/* Config Sidebar (Only visible in Orchestra Mode) */}
          <div
            className={`w-[320px] bg-[#0B0E14] border-l border-[#2A3241] z-30 transition-all duration-300 ${!selectedNode ? "hidden" : "block"}`}
          >
            <ConfigSidebar
              selectedNode={selectedNode}
              updateNodeData={updateNodeData}
              onDeleteNode={handleDeleteNode}
            />
          </div>
        </div>

        {/* --- IDE VIEW --- */}
        <div
          className="flex-1 flex overflow-hidden"
          style={{ display: activeScreen === "ide" ? "flex" : "none" }}
        >
          <IDEPage />
        </div>
      </div>
    </div>
  );
}
