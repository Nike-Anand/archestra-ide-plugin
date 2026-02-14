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
import "./premium-glass.css";
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
    bg: "rgba(6, 182, 212, 0.03)",
    border: "rgba(6, 182, 212, 0.15)",
    text: "text-cyan-400",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.1)]",
  },
  provider: {
    label: "ARCHESTRA PROVIDER",
    color: "#8b5cf6",
    icon: ShieldAlert,
    bg: "rgba(139, 92, 246, 0.03)",
    border: "rgba(139, 92, 246, 0.15)",
    text: "text-violet-400",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.1)]",
  },
  client: {
    label: "CLIENT APPLICATIONS",
    color: "#f59e0b",
    icon: Layout,
    bg: "rgba(245, 158, 11, 0.03)",
    border: "rgba(245, 158, 11, 0.15)",
    text: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
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
      className={`h-full w-full relative rounded-3xl border-2 transition-all duration-700 ease-premium bg-obsidian-900/40 backdrop-blur-md`}
      style={{
        borderColor: colConfig.border,
      }}
    >
      <div className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${colConfig.color}15 0%, transparent 100%)` }} />

      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center px-8">
        <div
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl bg-obsidian-950 border-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] ${colConfig.glow}`}
          style={{ borderColor: colConfig.border }}
        >
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <Icon size={18} style={{ color: colConfig.color }} />
          </div>
          <span
            className="text-[11px] font-black tracking-[0.4em] uppercase text-tech"
            style={{ color: colConfig.color }}
          >
            {colConfig.label}
          </span>
        </div>
      </div>

      {/* Decorative vertical line */}
      <div className="absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-[1px] opacity-10"
        style={{ backgroundColor: colConfig.color }} />
    </div>
  );
};

const CardNode = ({ data, selected }) => {
  const colConfig = COLUMNS[data.category] || COLUMNS.mcp;
  const Icon = ICON_MAP[data.icon] || Box;

  return (
    <div className={`w-[400px] h-[90px] rounded-[24px] card-glass flex items-center relative group transition-all duration-700 hover:scale-[1.02] animate-float-gentle ${selected ? 'ring-2 ring-neon-cyan/60 border-neon-cyan/40 neon-glow-cyan bg-obsidian-900/90' : 'hover:border-white/20'}`}>
      {/* Top highlight */}
      <div className="absolute inset-x-0 h-[2px] top-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none rounded-t-[24px]" />

      {/* Shimmer effect */}
      <div className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[24px]" />

      {/* Side accent bar */}
      <div
        className="w-2 h-[70%] absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.6)] transition-all duration-700 neon-border-glow"
        style={{ backgroundColor: colConfig.color, '--glow-color': colConfig.color }}
      />

      {/* DRAG HANDLE - CENTER ZONE */}
      <div className="drag-handle flex-1 h-full flex items-center justify-between px-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-5 flex-1 justify-center">
          {/* Icon container with gradient */}
          <div
            className="p-4 rounded-[18px] border border-white/15 shadow-2xl group-hover:scale-110 transition-all duration-700 relative overflow-hidden depth-layer-2"
            style={{
              background: `linear-gradient(135deg, ${colConfig.color}15, ${colConfig.color}08)`
            }}
          >
            <div className="glass-shine opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <Icon size={20} style={{ color: colConfig.color }} className="relative z-10 drop-shadow-lg" strokeWidth={2.5} />
          </div>

          {/* Text content */}
          <div className="flex flex-col items-center text-center gap-1.5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.35em] italic opacity-70">
              {data.sublabel}
            </span>
            <span className="text-[17px] font-black text-white tracking-tight uppercase italic leading-none truncate max-w-[260px] drop-shadow-lg">
              {data.customName || data.label}
            </span>
          </div>
        </div>
      </div>

      {/* CONNECTIVITY PORTS - Enhanced visual feedback */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-[50px] !h-full !-left-1 !bg-transparent !border-none !rounded-none hover:!bg-neon-cyan/10 transition-all !z-[100] flex items-center justify-start p-2 ${selected ? 'group-selected-active' : ''}`}
        style={{ top: '0', transform: 'none' }}
      >
        <div className={`w-2 h-16 rounded-full transition-all duration-700 ${selected ? 'bg-neon-cyan scale-y-125 shadow-[0_0_30px_rgba(0,242,255,0.9)] animate-pulse-glow' : 'bg-white/15 scale-y-60 group-hover:scale-y-110 group-hover:bg-neon-cyan/50 group-hover:shadow-[0_0_20px_rgba(0,242,255,0.5)]'}`} />
      </Handle>

      <Handle
        type="source"
        position={Position.Right}
        className={`!w-[50px] !h-full !-right-1 !bg-transparent !border-none !rounded-none hover:!bg-neon-cyan/10 transition-all !z-[100] flex items-center justify-end p-2 ${selected ? 'group-selected-active' : ''}`}
        style={{ top: '0', transform: 'none' }}
      >
        <div className={`w-2 h-16 rounded-full transition-all duration-700 ${selected ? 'bg-neon-cyan scale-y-125 shadow-[0_0_30px_rgba(0,242,255,0.9)] animate-pulse-glow' : 'bg-white/15 scale-y-60 group-hover:scale-y-110 group-hover:bg-neon-cyan/50 group-hover:shadow-[0_0_20px_rgba(0,242,255,0.5)]'}`} />
      </Handle>
    </div>
  );
};

const PlusNode = ({ data, selected }) => {
  const colConfig = COLUMNS[data.category];
  return (
    <button
      onClick={() => data.onOpenModal(data.category)}
      className="group w-full h-full bg-white/[0.01] border-[1.5px] border-dashed border-white/10 rounded-[24px] flex items-center justify-center gap-6 hover:border-white/30 hover:bg-white/[0.03] transition-all duration-700 ease-premium active:scale-[0.98] shadow-inner relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid-faded opacity-10" />
      <div
        className={`w-12 h-12 rounded-2xl bg-obsidian-950 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-180 transition-all duration-700 shadow-2xl relative z-10`}
        style={{ borderColor: selected ? colConfig.color : 'rgba(255,255,255,0.08)' }}
      >
        <Plus size={24} style={{ color: colConfig.color }} strokeWidth={3} />
      </div>
      <div className="flex flex-col items-start gap-1 relative z-10 text-left">
        <span className="text-[10px] font-black tracking-[0.4em] text-slate-500 group-hover:text-white uppercase transition-all">
          Deploy Instance
        </span>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colConfig.color }} />
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest opacity-80">
            {colConfig.label.split(' ')[0]}
          </span>
        </div>
      </div>
    </button>
  );
};

// --- 4. CONFIGURATION SIDEBAR COMPONENT ---
const ConfigSidebar = ({ selectedNode, updateNodeData, onDeleteNode }) => {
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-obsidian-950/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-faded opacity-20" />
        <div className="w-24 h-24 rounded-[32px] bg-obsidian-900 border border-white/5 flex items-center justify-center mb-8 shadow-2xl glass-panel-heavy group">
          <Settings size={36} className="text-slate-600 opacity-40 group-hover:rotate-90 transition-transform duration-1000" />
        </div>
        <h3 className="text-xl font-black text-white mb-4 tracking-tighter uppercase relative z-10">
          Parameter Input Required
        </h3>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-[260px] font-bold uppercase tracking-widest opacity-60 relative z-10">
          Select a system node from the orchestration layer to calibrate its operational parameters.
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
    <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-700 bg-obsidian-950/40 relative">
      <div className="absolute inset-0 bg-grid-faded opacity-10 pointer-events-none" />

      <div className="p-10 border-b border-white/5 bg-obsidian-950/60 relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-neon-purple/5 border border-neon-purple/20 shadow-[0_0_20px_rgba(188,19,254,0.1)]">
              <Settings size={20} className="text-neon-purple" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-neon-purple tracking-[0.4em] uppercase leading-none">
                Configuration
              </span>
              <span className="text-sm font-black text-white mt-1.5 uppercase tracking-tighter italic">
                {selectedNode.data.label || "Unnamed Component"}
              </span>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-neon-emerald/5 border border-neon-emerald/20 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-neon-emerald animate-pulse neon-border-glow" style={{ '--glow-color': '#00ffaa' }} />
            <span className="text-[9px] font-black text-neon-emerald uppercase tracking-widest">Active</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1 opacity-60">
              Module Identifier
            </label>
            <div className="px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-neon-cyan text-[11px] font-black tracking-widest shadow-inner overflow-hidden relative">
              <div className="absolute inset-0 bg-grid-faded opacity-10" />
              {toolId.toUpperCase()}::SYSTEM_CORE
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[9px] font-black text-neon-purple uppercase tracking-[0.4em] ml-1 opacity-70">
              Technical Identity
            </label>
            <input
              type="text"
              className="w-full bg-obsidian-950/60 border border-white/10 rounded-2xl px-6 py-4 text-[13px] font-black text-white placeholder:text-slate-700 focus:outline-none focus:border-neon-purple focus:ring-4 focus:ring-neon-purple/5 transition-all shadow-2xl glass-panel-heavy"
              value={selectedNode.data.customName || selectedNode.data.label || ""}
              onChange={(e) => updateNodeData(selectedNode.id, { ...selectedNode.data, customName: e.target.value })}
              placeholder="e.g. Primary Analytics Node"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar relative z-10">
        <div className="grid gap-8">
          {config.fields.map((field) => (
            <div key={field.key} className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
                  {field.label}
                </label>
                <div className="w-10 h-[1px] bg-white/5" />
              </div>

              {field.type === "select" ? (
                <div className="relative group">
                  <select
                    className="w-full bg-obsidian-950/60 border border-white/10 rounded-2xl px-6 py-5 text-[13px] font-black text-white focus:outline-none focus:border-neon-purple focus:ring-4 focus:ring-neon-purple/5 transition-all appearance-none cursor-pointer shadow-2xl glass-panel-heavy"
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    <option value="" disabled>Select Core Parameter...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt} className="bg-obsidian-950 text-white p-4">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-neon-purple transition-colors">
                    <Plus size={16} />
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <input
                    type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                    className="w-full bg-obsidian-950/60 border border-white/10 rounded-2xl px-6 py-5 text-[13px] font-black text-white placeholder:text-slate-700 focus:outline-none focus:border-neon-purple focus:ring-4 focus:ring-neon-purple/5 transition-all shadow-2xl glass-panel-heavy"
                    placeholder={field.placeholder}
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 shadow-inner relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="absolute inset-0 bg-grid-faded opacity-10" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-neon-cyan animate-pulse" />
              <span className="text-[10px] font-black text-neon-cyan tracking-[0.4em] uppercase">
                Node Latency
              </span>
            </div>
            <span className="text-[11px] font-black text-white/40">STABLE</span>
          </div>
          <div className="grid grid-cols-2 gap-10 relative z-10">
            <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Throughput</div>
              <div className="text-xl font-black text-white tracking-tighter">24.8 GB/s</div>
            </div>
            <div className="space-y-1">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ping</div>
              <div className="text-xl font-black text-white tracking-tighter">8.2 MS</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-10 border-t border-white/5 bg-obsidian-950/60 flex gap-5 relative z-10">
        <button
          className="btn-tech flex-[3] flex items-center justify-center gap-4 py-5 rounded-2xl bg-white text-obsidian-950 text-[11px] font-black tracking-[0.3em] uppercase transition-all shadow-[0_20px_40px_-5px_rgba(255,255,255,0.1)] active:scale-95 group overflow-hidden"
          onClick={() => updateNodeData(selectedNode.id, selectedNode.data)}
        >
          <div className="glass-shine" />
          <Save size={18} className="group-hover:-translate-y-1 transition-transform" strokeWidth={3} /> Commit Changes
        </button>
        <button
          className="btn-tech flex-1 flex items-center justify-center py-5 rounded-2xl bg-obsidian-900 border border-white/10 hover:border-red-500/50 hover:text-red-500 text-slate-600 transition-all active:scale-95 group"
          onClick={() => onDeleteNode(selectedNode.id)}
          title="Terminal Component"
        >
          <Trash2 size={22} className="group-hover:scale-110 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// --- 5. INITIAL DATA ---
const LANE_WIDTH = 420;
const LANE_HEIGHT = 900;
const CARD_WIDTH = 380;
const CARD_HEIGHT = 80;
const START_X = 120;
const GAP_X = 60;
const START_Y = 100;
const CARD_GAP_Y = 100;

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
    style: { width: CARD_WIDTH, height: 54 },
    data: { category: "mcp" },
  },
  {
    id: "add-provider",
    type: "plus",
    parentId: "lane-provider",
    extent: "parent",
    position: { x: 20, y: START_Y },
    style: { width: CARD_WIDTH, height: 54 },
    data: { category: "provider" },
  },
  {
    id: "add-client",
    type: "plus",
    parentId: "lane-client",
    extent: "parent",
    position: { x: 20, y: START_Y },
    style: { width: CARD_WIDTH, height: 54 },
    data: { category: "client" },
  },
];

const initialEdges = [];

export default function ArchestraStudio() {
  const [activeScreen, setActiveScreen] = useState("orchestra");
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    category: null,
  });

  // 1. Discovery Sync
  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const resp = await fetch("http://localhost:3001/api/mcp/discover");
        const dataArray = await resp.json();
        if (dataArray && dataArray.length > 0) {
          setNodes((nds) => nds.map((n) => n.id === "mcp-pg" ? { ...n, data: { ...n.data, availableServers: dataArray } } : n));
        }
      } catch (err) {
        console.error("Discovery failed:", err);
      }
    };
    fetchDiscovery();
  }, [setNodes]);

  // 2. Auto-save
  useEffect(() => {
    if (nodes.length <= 3) return;
    const timer = setTimeout(async () => {
      try {
        await fetch('http://localhost:3001/api/orchestra/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges })
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const nodeTypes = useMemo(() => ({ lane: LaneNode, card: CardNode, plus: PlusNode }), []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#fff", strokeWidth: 1.5 }, type: "smoothstep" }, eds));
  }, [setEdges]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: newData } : node));
    setSelectedNode((prev) => prev?.id === nodeId ? { ...prev, data: newData } : prev);
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => {
      const nodeToDelete = nds.find((n) => n.id === nodeId);
      if (!nodeToDelete) return nds;
      const category = nodeToDelete.data.category;
      const deleteY = nodeToDelete.position.y;
      let updated = nds.filter((n) => n.id !== nodeId);
      return updated.map((n) => (n.parentId === `lane-${category}` && n.position.y > deleteY) ? { ...n, position: { ...n.position, y: n.position.y - CARD_GAP_Y } } : n);
    });
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleAddNode = useCallback((toolData) => {
    const category = modalState.category;
    setNodes((currentNodes) => {
      const addButton = currentNodes.find((n) => n.id === `add-${category}`);
      const timestamp = Date.now();
      const existingCount = currentNodes.filter(n => n.data?.toolId === toolData.id).length;
      const defaultName = existingCount > 0 ? `${toolData.label} ${existingCount + 1}` : toolData.label;

      const newNode = {
        id: `${category}-${timestamp}`,
        type: "card",
        parentId: `lane-${category}`,
        extent: "parent",
        position: { x: addButton.position.x, y: addButton.position.y },
        dragHandle: ".drag-handle",
        data: {
          category,
          label: toolData.label,
          customName: defaultName,
          sublabel: toolData.sublabel,
          icon: toolData.icon,
          toolId: toolData.id
        },
      };
      const updatedButton = { ...addButton, position: { ...addButton.position, y: addButton.position.y + CARD_GAP_Y } };
      return [...currentNodes.filter((n) => n.id !== `add-${category}`), newNode, updatedButton];
    });
    setModalState({ isOpen: false, category: null });
  }, [modalState.category, setNodes]);

  const nodesWithHandlers = useMemo(() =>
    nodes.map((node) => {
      let updated = node;
      if (node.type === "plus") {
        updated = { ...node, data: { ...node.data, onOpenModal: (cat) => setModalState({ isOpen: true, category: cat }) } };
      }
      if (node.type === "card") {
        updated = { ...updated, dragHandle: ".drag-handle" };
      }
      return updated;
    }),
    [nodes]
  );

  const NodeSelectorModal = ({ isOpen, onClose, category, onSelect }) => {
    const [search, setSearch] = useState("");
    if (!isOpen) return null;
    const colConfig = COLUMNS[category];
    const IconComponent = colConfig.icon;
    const filteredTools = (AVAILABLE_TOOLS[category] || []).filter(t => t.label.toLowerCase().includes(search.toLowerCase()) || t.sublabel.toLowerCase().includes(search.toLowerCase()));

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="absolute inset-0 bg-obsidian-950/95 backdrop-blur-3xl" onClick={onClose} />

        <div className="relative w-full max-w-6xl h-[90vh] floating-panel flex flex-col depth-layer-4">
          {/* Animated background */}
          <div className="absolute inset-0 bg-grid-faded opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(188,19,254,0.08),transparent_50%)] pointer-events-none" />

          {/* Header */}
          <div className="px-20 py-14 flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-obsidian-950/60 to-obsidian-900/40 relative z-10">
            <div className="flex items-center gap-12">
              {/* Icon */}
              <div
                className="p-6 rounded-[32px] border border-white/15 shadow-2xl relative overflow-hidden group depth-layer-3 animate-float-gentle"
                style={{
                  background: `linear-gradient(135deg, ${colConfig.color}20, ${colConfig.color}08)`
                }}
              >
                <div className="glass-shine opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <IconComponent size={42} style={{ color: colConfig.color }} className="relative z-10 drop-shadow-2xl" strokeWidth={2.5} />
              </div>

              {/* Title */}
              <div className="flex flex-col gap-3">
                <h2 className="text-5xl font-black text-white tracking-tight uppercase italic leading-none drop-shadow-lg">
                  {colConfig.label}
                </h2>
                <div className="flex items-center gap-4">
                  <div
                    className="badge-glass-purple"
                    style={{
                      background: `linear-gradient(135deg, ${colConfig.color}20, ${colConfig.color}10)`,
                      borderColor: `${colConfig.color}40`,
                      color: colConfig.color
                    }}
                  >
                    Component Registry
                  </div>
                  <div className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                    {filteredTools.length} Available
                  </span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-16">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-neon-cyan transition-all duration-500 group-focus-within:scale-110" size={22} strokeWidth={2.5} />
                <input
                  autoFocus
                  className="input-glass w-full pl-16 pr-6 py-5 text-base font-bold tracking-tight"
                  placeholder="Search components..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-5 rounded-[20px] bg-white/[0.03] border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:scale-110 hover:rotate-90 depth-layer-1"
            >
              <X size={26} strokeWidth={2.5} />
            </button>
          </div>

          {/* Tool Grid */}
          <div className="flex-1 overflow-y-auto px-20 py-14 custom-scrollbar-premium relative z-10">
            <div className="grid grid-cols-1 gap-5">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool, idx) => {
                  const ToolIcon = ICON_MAP[tool.icon] || Box;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onSelect(tool)}
                      className="card-glass w-full flex items-center justify-between p-10 group cursor-pointer"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center gap-12 relative z-10">
                        {/* Icon container */}
                        <div
                          className="p-8 rounded-[24px] border border-white/15 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 relative overflow-hidden depth-layer-2"
                          style={{
                            background: `linear-gradient(135deg, ${colConfig.color}18, ${colConfig.color}08)`
                          }}
                        >
                          <div className="glass-shine opacity-15" />
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                          <ToolIcon size={36} style={{ color: colConfig.color }} className="relative z-10 drop-shadow-lg" strokeWidth={2.5} />
                        </div>

                        {/* Text content */}
                        <div className="flex flex-col text-left gap-2.5">
                          <div className="text-[26px] font-black text-white tracking-tight italic group-hover:translate-x-2 transition-transform duration-500 drop-shadow-lg">
                            {tool.label}
                          </div>
                          <div className="text-[11px] text-slate-500 font-black uppercase tracking-[0.35em] opacity-70">
                            {tool.sublabel}
                          </div>
                        </div>
                      </div>

                      {/* Add button */}
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-10 group-hover:translate-x-0">
                        <div className="text-[10px] font-black text-neon-cyan uppercase tracking-[0.3em]">
                          Deploy
                        </div>
                        <div className="p-4 rounded-[16px] bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan neon-glow-cyan">
                          <Plus size={22} strokeWidth={3} />
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-40 flex flex-col items-center text-center opacity-30">
                  <div className="w-32 h-32 rounded-full bg-white/[0.02] border-2 border-white/10 flex items-center justify-center mb-10 animate-pulse">
                    <Search size={56} strokeWidth={1.5} />
                  </div>
                  <p className="text-lg font-black tracking-[0.4em] uppercase italic text-slate-600">
                    No Components Found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen bg-obsidian-950 overflow-hidden font-sans text-gray-200 relative selection:bg-neon-cyan/30 selection:text-white">
      {/* Procedural backgrounds */}
      <div className="absolute inset-0 bg-grid-faded opacity-30 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-noise z-0" />

      <NodeSelectorModal
        isOpen={modalState.isOpen}
        category={modalState.category}
        onClose={() => setModalState({ isOpen: false, category: null })}
        onSelect={handleAddNode}
      />

      <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden z-10">
        {/* --- GLOBAL CONTROL BAR --- */}
        <div className="h-[72px] flex items-center justify-between px-10 bg-obsidian-950/60 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-[60] shadow-[0_10px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Bar accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />

          <div className="flex items-center gap-5 group cursor-pointer min-w-[240px]">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan rotate-3 group-hover:rotate-12 transition-all duration-700 flex items-center justify-center shadow-[0_0_30px_rgba(188,19,254,0.3)] glass-panel-heavy">
                <Workflow size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-md bg-obsidian-950 border border-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-neon-emerald animate-pulse" style={{ boxShadow: '0 0 8px #00ffaa' }} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white leading-none">ORCHESTRA</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[7px] font-black tracking-[0.5em] text-neon-cyan opacity-80 uppercase">Studio v4.0</span>
                <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.3em]">Active</span>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <nav className="flex items-center p-1 bg-black/50 rounded-2xl border border-white/8 shadow-inner glass-panel-heavy">
              <button
                onClick={() => setActiveScreen("orchestra")}
                className={`btn-tech flex items-center gap-2.5 px-8 py-2.5 rounded-xl text-[9px] font-black tracking-[0.2em] uppercase transition-all duration-500 ${activeScreen === "orchestra" ? "bg-white text-obsidian-950 shadow-[0_8px_20px_rgba(255,255,255,0.2)] scale-[1.03]" : "text-slate-500 hover:text-white"}`}
              >
                <Layers size={13} /> Design
              </button>
              <button
                onClick={() => setActiveScreen("ide")}
                className={`btn-tech flex items-center gap-2.5 px-8 py-2.5 rounded-xl text-[9px] font-black tracking-[0.2em] uppercase transition-all duration-500 ${activeScreen === "ide" ? "bg-white text-obsidian-950 shadow-[0_8px_20px_rgba(255,255,255,0.2)] scale-[1.03]" : "text-slate-500 hover:text-white"}`}
              >
                <Code2 size={13} /> Dev-Ide
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-6 min-w-[240px] justify-end">
            <div className="hidden xl:flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-neon-emerald" />
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Online</span>
              </div>
              <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest opacity-60">ID: 0x8F2A...9C</span>
            </div>
            <button className="btn-tech flex items-center gap-3 px-8 py-3 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white hover:scale-105 transition-all duration-500 font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_16px_32px_-8px_rgba(188,19,254,0.4)] active:scale-95 group overflow-hidden">
              <div className="glass-shine" />
              <Play size={14} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
              Deploy
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden" style={{ display: activeScreen === "orchestra" ? "flex" : "none" }}>
          <div className="flex-1 relative bg-obsidian-950">
            <ReactFlow
              nodes={nodesWithHandlers}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(e, node) => {
                // Single click just focuses the node (highlighting handles)
                // We don't open the sidebar here anymore.
              }}
              onPaneClick={() => setSelectedNode(null)}
              onNodeDoubleClick={(e, node) => {
                if (node.type === "lane") {
                  setModalState({ isOpen: true, category: node.data.category });
                } else if (node.type === "card") {
                  setSelectedNode(node);
                }
              }}
              onNodesDelete={(deleted) => { deleted.forEach((n) => handleDeleteNode(n.id)); }}
              onEdgesDelete={(deleted) => { setEdges((eds) => eds.filter(e => !deleted.find(d => d.id === e.id))); }}
              deleteKeyCode={["Backspace", "Delete"]}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.2}
              connectionRadius={50}
              snapToGrid={true}
              snapGrid={[20, 20]}
              defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, color: '#00f2ff' }, style: { strokeWidth: 3, stroke: "rgba(0, 242, 255, 0.3)" } }}
            >
              <Background color="#1e293b" variant="lines" gap={40} size={1} className="opacity-20" />
              <Controls className="!bg-obsidian-900/80 !border-white/10 !fill-white/40" />
              <MiniMap nodeColor={(n) => COLUMNS[n.data.category]?.color || "#333"} className="!bg-obsidian-950 !border-white/10 !rounded-2xl shadow-2xl" />
            </ReactFlow>
          </div>
          <div className={`w-[480px] bg-obsidian-900/60 backdrop-blur-3xl border-l border-white/10 z-30 transition-all duration-700 ease-premium ${!selectedNode ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}>
            <ConfigSidebar selectedNode={selectedNode} updateNodeData={updateNodeData} onDeleteNode={handleDeleteNode} />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-obsidian-950" style={{ display: activeScreen === "ide" ? "flex" : "none" }}>
          <IDEPage />
        </div>
      </div>
    </div>
  );
}
