import { useState, useEffect, useRef, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
  Cpu,
  FolderOpen,
  ChevronRight,
  FileCode,
  Save,
  Ban,
  Square,
  X,
  Hammer,
  Terminal,
  FilePlus,
  Database,
  Plus,
  Command,
  TestTube,
  Key,
  Wand2,
  LayoutTemplate,
  Sparkles,
  Bot,
  Circle,
  RefreshCw,
} from "lucide-react";
import {
  FileTreeItem,
  ABtn,
  Toast,
  CopilotPane,
  LLMTestWorkbench,
  AIExplanationModal,
  SecretsManagerModal,
  CommandPalette,
  MagicToolsSidebar,
} from "./components/ide/cmps";

export default function IDEPage() {
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [bottomPanelTab, setBottomPanelTab] = useState("console");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [mcpStatus, setMcpStatus] = useState("Idle");
  const [detectedCaps, setDetectedCaps] = useState([]);
  const [notification, setNotification] = useState(null);
  const [sections, setSections] = useState({
    explorer: true,
    mcp: true,
    quick: true,
  });
  const [projectHandle, setProjectHandle] = useState(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [secretsModalOpen, setSecretsModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalType, setAiModalType] = useState("tool");
  const [testWorkbenchOpen, setTestWorkbenchOpen] = useState(false);
  const [playgroundArgs, setPlaygroundArgs] = useState({});
  const [selectedPlaygroundTool, setSelectedPlaygroundTool] = useState(null);
  const [currentEnvContent, setCurrentEnvContent] = useState("");
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const notify = (message, type = "info") => setNotification({ message, type });
  const activeFile = openFiles.find((f) => f.path === activeFileId) || null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  // Auto-connect to project and auto-refresh file list
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const port = 3001;
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:${port}/api/fs/list`);
        const data = await res.json();
        if (data.success && data.files) {
          // Filter to only show the 'studio' folder's contents (the actual nodes)
          const studioFolder = data.files.find(f => f.name === 'studio');
          const orchestraFiles = studioFolder ? studioFolder.children || [] : [];

          // Deduplicate items to avoid key warnings
          const uniqueItems = Array.from(new Map(orchestraFiles.map(i => [i.path, i])).values());

          setFiles(uniqueItems);
          console.log("Connected to Archestra Studio nodes.");

          if (uniqueItems.length > 0 && !activeFileId) {
            handleFileClick(uniqueItems[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch project files:", err);
      }
    };

    // Initial fetch
    fetchProject();

    // Auto-refresh every 3 seconds to detect new nodes
    const refreshInterval = setInterval(fetchProject, 3000);

    return () => clearInterval(refreshInterval);
  }, [activeFileId]);

  const handleMagicAction = async (tool) => {
    if (tool.actionType === "create") {
      const fileName = prompt(
        `Create file for ${tool.label}?`,
        tool.id === "dockerfile"
          ? "Dockerfile"
          : tool.id.includes("config")
            ? "config.json"
            : "server.py",
      );
      if (fileName) await createNewFile(fileName, tool.content);
    } else insertSnippet(tool.content);
  };
  const handleOpenTerminal = () => {
    setBottomPanelOpen(true);
    setBottomPanelTab("console");
  };
  const handleTestMCP = async () => {
    if (!activeFile?.name.endsWith(".py")) {
      notify("Open a Python file to test", "warning");
      return;
    }
    setMcpStatus("Running");

    // Notify backend
    try {
      await fetch('http://localhost:3001/api/mcp/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: activeFile.name })
      });
    } catch (e) {
      console.error("Failed to notify backend about server run:", e);
    }

    setLogs((p) => [
      ...p,
      { type: "info", text: `> python ${activeFile.name}` },
      { type: "stdout", text: `MCP Server '${activeFile.name}' initialized at stdio…` },
      { type: "info", text: "Connecting to inspector..." }
    ]);
    setTestWorkbenchOpen(true);
  };
  const handleManageSecrets = async () => {
    let envContent = "";
    const findEnv = (nodes) => {
      for (let n of nodes) {
        if (n.name === ".env") return n;
        if (n.children) {
          const f = findEnv(n.children);
          if (f) return f;
        }
      }
      return null;
    };
    if (projectHandle) {
      const e = findEnv(files);
      if (e) {
        try {
          envContent = await (await e.handle.getFile()).text();
        } catch { }
      }
    } else {
      const s = openFiles.find((f) => f.name === ".env");
      if (s) envContent = s.content;
    }
    setCurrentEnvContent(envContent);
    setSecretsModalOpen(true);
  };
  const handleSaveSecrets = async (newContent) => {
    if (projectHandle) {
      await createNewFile(".env", newContent);
    } else {
      const idx = openFiles.findIndex((f) => f.name === ".env");
      if (idx >= 0) {
        const u = [...openFiles];
        u[idx] = {
          ...u[idx],
          content: newContent,
          originalContent: newContent,
          isUnsaved: false,
        };
        setOpenFiles(u);
      } else createNewFile(".env", newContent);
    }
    notify("Secrets saved to .env", "success");
  };
  const handleSave = async () => {
    if (!activeFile) return;
    try {
      let handle = activeFile.handle;
      if (!handle)
        handle = await window.showSaveFilePicker({
          suggestedName: activeFile.name,
          types: [
            {
              description: "Text File",
              accept: { "text/plain": [".py", ".txt", ".json", ".md"] },
            },
          ],
        });
      const w = await handle.createWritable();
      await w.write(activeFile.content);
      await w.close();
      setOpenFiles((p) =>
        p.map((f) =>
          f.path === activeFileId
            ? {
              ...f,
              handle,
              name: handle.name,
              originalContent: f.content,
              isUnsaved: false,
            }
            : f,
        ),
      );
      notify("File saved", "success");
    } catch (e) {
      if (e.name !== "AbortError") notify("Failed to save", "error");
    }
  };
  const handleNewServerButton = async () => {
    const name = prompt("Server filename:", "server.py");
    if (!name) return;
    await createNewFile(
      name,
      `from mcp.server.fastmcp import FastMCP\n\nmcp = FastMCP("My Agent")\n\n@mcp.tool()\nasync def add(a: int, b: int) -> int:\n    """Add two numbers"""\n    return a + b\n\nif __name__ == "__main__":\n    mcp.run()`,
    );
  };
  const handleNewFileButton = async () => {
    const name = prompt("Filename:", "untitled.py");
    if (!name) return;
    await createNewFile(name, "");
  };

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        e.stopPropagation();
        bottomPanelOpen && bottomPanelTab === "console"
          ? setBottomPanelOpen(false)
          : handleOpenTerminal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        setCmdPaletteOpen((p) => !p);
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "e") {
        e.preventDefault();
        e.stopPropagation();
        handleManageSecrets();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleTestMCP();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [activeFileId, openFiles, bottomPanelOpen, bottomPanelTab]);

  const getAllFiles = (nodes, r = []) => {
    nodes.forEach((n) => {
      if (n.kind === "file") r.push(n);
      if (n.kind === "directory" && n.children) getAllFiles(n.children, r);
    });
    return r;
  };
  const flatFileList = useMemo(() => getAllFiles(files), [files]);

  const readDirectory = async (dh, path = "") => {
    const entries = [];
    for await (const entry of dh.values()) {
      const p = `${path}/${entry.name}`;
      if (entry.kind === "file")
        entries.push({
          name: entry.name,
          kind: "file",
          path: p,
          handle: entry,
        });
      else
        entries.push({
          name: entry.name,
          kind: "directory",
          path: p,
          handle: entry,
          children: await readDirectory(entry, p),
        });
    }
    return entries.sort((a, b) =>
      a.kind === b.kind
        ? a.name.localeCompare(b.name)
        : a.kind === "directory"
          ? -1
          : 1,
    );
  };

  const handleOpenFolder = async () => {
    try {
      const dh = await window.showDirectoryPicker();
      setProjectHandle(dh);
      setFiles(await readDirectory(dh));
      notify(`Opened ${dh.name}`, "success");
    } catch (e) {
      if (e.name !== "AbortError") notify("Failed to open folder", "error");
    }
  };

  const createNewFile = async (fileName, content = "") => {
    if (projectHandle) {
      try {
        const fh = await projectHandle.getFileHandle(fileName, {
          create: true,
        });
        const w = await fh.createWritable();
        await w.write(content);
        await w.close();
        setFiles(await readDirectory(projectHandle));
        if (fileName !== ".env")
          await handleFileClick({
            name: fileName,
            kind: "file",
            path: `/${fileName}`,
            handle: fh,
          });
        notify(`Created ${fileName}`, "success");
      } catch {
        notify("Failed to create file", "error");
      }
    } else {
      const fp = `/scratch/${fileName}`;
      setOpenFiles((p) => [
        ...p,
        {
          name: fileName,
          path: fp,
          kind: "file",
          content,
          originalContent: content,
          isUnsaved: true,
          handle: null,
        },
      ]);
      setActiveFileId(fp);
      notify(`Created scratch file: ${fileName}`, "info");
    }
  };

  const handleFileClick = async (item) => {
    if (item.kind === "directory") return;
    const existing = openFiles.find((f) => f.path === item.path);
    if (existing) {
      setActiveFileId(item.path);
      return;
    }
    try {
      let content = "";
      if (item.handle) {
        content = await (await item.handle.getFile()).text();
      } else {
        // Fallback to backend read
        const port = 3001;
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:${port}/api/fs/read?path=${encodeURIComponent(item.path)}`);
        const data = await res.json();
        if (data.success) content = data.content;
        else throw new Error("API error");
      }

      setOpenFiles((p) => [
        ...p,
        { ...item, content, originalContent: content, isUnsaved: false },
      ]);
      setActiveFileId(item.path);
      if (item.name.endsWith(".py")) {
        detectCapabilities(content);
        setTimeout(() => updateDecorations(content), 100);
      }
    } catch (e) {
      notify("Error reading file", "error");
      console.error(e);
    }
  };

  const closeFile = (e, path) => {
    if (e) e.stopPropagation();
    const f = openFiles.find((x) => x.path === path);
    if (
      f?.isUnsaved &&
      !window.confirm(`${f.name} has unsaved changes. Close anyway?`)
    )
      return;
    const next = openFiles.filter((x) => x.path !== path);
    setOpenFiles(next);
    if (activeFileId === path)
      setActiveFileId(next.length > 0 ? next[next.length - 1].path : null);
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Set theme
    monaco.editor.defineTheme("obsidian", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0C0C0D",
        "editor.lineHighlightBackground": "#111113",
        "editor.selectionBackground": "#5C6BC028",
        "editorLineNumber.foreground": "#303038",
        "editorLineNumber.activeForeground": "#505060",
        "editorCursor.foreground": "#5C6BC0",
        "editorWidget.background": "#111113",
        "editorWidget.border": "#1D1D20",
        "input.background": "#161618",
        "input.border": "#1D1D20",
        "scrollbarSlider.background": "#1D1D20",
        "scrollbarSlider.hoverBackground": "#2E2E32",
      },
    });
    monaco.editor.setTheme("obsidian");

    // Clear previous commands/providers if any (though mount is usually once)
    if (window.mcpCodeLensProvider) window.mcpCodeLensProvider.dispose();

    window.mcpCodeLensProvider = monaco.languages.registerCodeLensProvider("python", {
      provideCodeLenses: (model) => {
        const lenses = [];
        const content = model.getValue();
        const rx = /@mcp\.(tool|resource|prompt)/g;
        let m;
        while ((m = rx.exec(content)) !== null) {
          const pos = model.getPositionAt(m.index);
          lenses.push({
            range: {
              startLineNumber: pos.lineNumber,
              startColumn: pos.column,
              endLineNumber: pos.lineNumber,
              endColumn: pos.column + m[0].length,
            },
            id: `explain-mcp-${m.index}`,
            command: {
              id: "cmd-explain-mcp",
              title: "✦ Explain with AI",
              arguments: [m[1], m[0]],
            },
          });
        }
        return { lenses, dispose: () => { } };
      },
    });

    // Use a global flag to prevent double registration of the same command
    if (!window.mcpCommandRegistered) {
      monaco.editor.registerCommand("cmd-explain-mcp", (_, type, snippet) => {
        setAiModalType(type);
        setAiModalOpen(true);
      });
      window.mcpCommandRegistered = true;
    }

    if (activeFile) updateDecorations(activeFile.content);
  };

  const updateDecorations = (content) => {
    const editor = editorRef.current;
    if (!editor || !content) return;
    const model = editor.getModel();
    if (!model) return;
    const decs = [];
    [
      { rx: /@mcp\.tool/g, cls: "deco-tool" },
      { rx: /@mcp\.resource/g, cls: "deco-resource" },
      { rx: /@mcp\.prompt/g, cls: "deco-prompt" },
    ].forEach(({ rx, cls }) => {
      let m;
      rx.lastIndex = 0;
      while ((m = rx.exec(content)) !== null) {
        const s = model.getPositionAt(m.index),
          e = model.getPositionAt(m.index + m[0].length);
        decs.push({
          range: new window.monaco.Range(
            s.lineNumber,
            s.column,
            e.lineNumber,
            e.column,
          ),
          options: { inlineClassName: cls },
        });
      }
    });
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      decs,
    );
  };

  const handleEditorChange = (value) => {
    if (!activeFile) return;
    setOpenFiles((p) =>
      p.map((f) =>
        f.path === activeFileId
          ? { ...f, content: value, isUnsaved: value !== f.originalContent }
          : f,
      ),
    );
    if (activeFile?.name.endsWith(".py")) {
      detectCapabilities(value);
      updateDecorations(value);
    }
  };

  const detectCapabilities = (content) => {
    if (!content) return;
    const caps = [];
    const parseArgs = (s) =>
      s
        ? s
          .split(",")
          .map((a) => {
            const [n, t] = a.split(":").map((x) => x.trim());
            return { name: n, type: t || "any" };
          })
          .filter((a) => a.name && a.name !== "self")
        : [];
    [
      ["tool", /@mcp\.tool\(.*?\)\s+(?:async\s+)?def\s+(\w+)\s*\((.*?)\)/gs],
      [
        "resource",
        /@mcp\.resource\(.*?\)\s+(?:async\s+)?def\s+(\w+)\s*\((.*?)\)/gs,
      ],
      [
        "prompt",
        /@mcp\.prompt\(.*?\)\s+(?:async\s+)?def\s+(\w+)\s*\((.*?)\)/gs,
      ],
    ].forEach(([type, rx]) => {
      let m;
      while ((m = rx.exec(content)) !== null)
        caps.push({ type, name: m[1], args: parseArgs(m[2]), line: m.index });
    });
    setDetectedCaps(caps.sort((a, b) => a.line - b.line));
  };

  const insertSnippet = (snippet) => {
    const editor = editorRef.current;
    if (!editor) {
      notify("Open a file to insert snippet", "warning");
      return;
    }
    editor.executeEdits("mcp-snippets", [
      { range: editor.getSelection(), text: snippet, forceMoveMarkers: true },
    ]);
    editor.focus();
    notify("Snippet inserted", "success");
  };

  const handleStop = () => {
    setMcpStatus("Stopped");
    setLogs((p) => [...p, { type: "error", text: "Process terminated." }]);
  };
  const handleExecuteTool = () => {
    if (!selectedPlaygroundTool) return;
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: selectedPlaygroundTool.name, arguments: playgroundArgs },
    };
    setLogs((p) => [
      ...p,
      { type: "info", text: `[Playground] JSON-RPC:` },
      { type: "stdout", text: JSON.stringify(payload, null, 2) },
    ]);
    setBottomPanelTab("console");
    notify("Tool call dispatched", "success");
  };
  const scrollToTool = (name) => {
    if (!editorRef.current) return;
    const matches = editorRef.current.getModel().findMatches(name);
    if (matches.length > 0) {
      editorRef.current.revealRangeInCenter(matches[0].range);
      editorRef.current.setPosition({
        lineNumber: matches[0].range.startLineNumber,
        column: 1,
      });
      editorRef.current.focus();
    }
  };

  const commands = [
    {
      label: "Test with LLM",
      icon: <Bot size={13} />,
      shortcut: "⌘↵",
      action: handleTestMCP,
    },
    {
      label: "Open Terminal",
      icon: <Terminal size={13} />,
      shortcut: "⌘`",
      action: handleOpenTerminal,
    },
    {
      label: "Manage Secrets",
      icon: <Key size={13} />,
      shortcut: "⌘⌥E",
      action: handleManageSecrets,
    },
    {
      label: "Save File",
      icon: <Save size={13} />,
      shortcut: "⌘S",
      action: handleSave,
    },
    {
      label: "New Server File",
      icon: <FilePlus size={13} />,
      action: handleNewServerButton,
    },
    {
      label: "New Empty File",
      icon: <Plus size={13} />,
      action: handleNewFileButton,
    },
    {
      label: "Open Folder",
      icon: <FolderOpen size={13} />,
      action: handleOpenFolder,
    },
    {
      label: "Close Active Tab",
      icon: <X size={13} />,
      action: () => activeFileId && closeFile(null, activeFileId),
    },
    {
      label: "Toggle Terminal",
      icon: <Terminal size={13} />,
      action: () => setBottomPanelOpen((p) => !p),
    },
    {
      label: "Toggle Magic Tools",
      icon: <Wand2 size={13} />,
      action: () => setRightPanelOpen((p) => !p),
    },
  ];

  const CAP_CFG = {
    tool: { icon: <Hammer size={11} />, c: "var(--c-tool)" },
    resource: { icon: <Database size={11} />, c: "var(--c-resource)" },
    prompt: { icon: <LayoutTemplate size={11} />, c: "var(--c-prompt)" },
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="mcp-root"
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* Modals */}
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        commands={commands}
        files={flatFileList}
        onFileSelect={handleFileClick}
      />
      <SecretsManagerModal
        isOpen={secretsModalOpen}
        onClose={() => setSecretsModalOpen(false)}
        onSave={handleSaveSecrets}
        existingContent={currentEnvContent}
      />
      <AIExplanationModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        type={aiModalType}
      />
      <LLMTestWorkbench
        isOpen={testWorkbenchOpen}
        onClose={() => setTestWorkbenchOpen(false)}
        tools={detectedCaps.filter((c) => c.type === "tool")}
        onRunLog={(msg) => setLogs((p) => [...p, { type: "info", text: msg }])}
      />

      {/* ── LEFT SIDEBAR ────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 260,
          background: "var(--s0)",
          borderRight: "1px solid var(--b1)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 10,
          animation: "fadeRight 220ms ease",
          position: "relative",
        }}
      >
        {/* Sidebar ambient glow */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, background: "linear-gradient(180deg, rgba(124,92,252,0.04), transparent)", pointerEvents: "none", zIndex: 0 }} />

        {/* Logo Header */}
        <div className="ide-sidebar-header" style={{ position: "relative", zIndex: 1 }}>
          <div className="ide-logo-icon">
            <Cpu size={14} style={{ color: "var(--a)" }} />
          </div>
          <span className="ide-logo-text">MCP Studio</span>
          {projectHandle && (
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80, fontFamily: "var(--f-mono)" }}>
              {projectHandle.name}
            </span>
          )}
        </div>


        <div className="scroll" style={{ flex: 1, overflowY: "auto" }}>
          {/* Quick Actions */}
          <div style={{ borderBottom: "1px solid var(--b0)" }}>
            <div
              className="sec-hdr"
              onClick={() => setSections((p) => ({ ...p, quick: !p.quick }))}
            >
              <span className="sec-label">Quick Actions</span>
              <ChevronRight
                size={10}
                className={`chevron ${sections.quick ? "open" : ""}`}
                style={{ color: "var(--t3)" }}
              />
            </div>
            {sections.quick && (
              <div className="p-4 grid grid-cols-2 gap-3">
                {[
                  {
                    icon: <Database size={18} className="text-cyan-400" />,
                    label: "Nodes",
                    color: "rgba(0,242,255,0.08)",
                    borderColor: "rgba(0,242,255,0.15)",
                    action: () => setSections((p) => ({ ...p, explorer: !p.explorer })),
                  },
                  {
                    icon: <Key size={18} className="text-amber-400" />,
                    label: "Secrets",
                    color: "rgba(255,170,0,0.08)",
                    borderColor: "rgba(255,170,0,0.15)",
                    action: handleManageSecrets,
                  },
                  {
                    icon: <Command size={18} className="text-rose-400" />,
                    label: "Terminal",
                    color: "rgba(255,51,102,0.08)",
                    borderColor: "rgba(255,51,102,0.15)",
                    action: () => setBottomPanelOpen(true),
                  },
                  {
                    icon: <Wand2 size={18} className="text-violet-400" />,
                    label: "Magic",
                    color: "rgba(124,92,252,0.08)",
                    borderColor: "rgba(124,92,252,0.15)",
                    action: () => setRightPanelOpen((p) => !p),
                  },
                ].map(({ icon, label, color, borderColor, action }, i) => (
                  <button
                    key={label}
                    className="qa-card group relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-300 cursor-pointer"
                    style={{ background: color, borderColor, animationDelay: `${i * 80}ms` }}
                    onClick={action}
                  >
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5 group-hover:scale-110 transition-all duration-400">
                      {icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 group-hover:text-slate-200 transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Explorer */}
          <div style={{ borderBottom: "1px solid var(--b0)" }}>
            <div
              className="sec-hdr"
              onClick={() =>
                setSections((p) => ({ ...p, explorer: !p.explorer }))
              }
            >
              <span className="sec-label">Explorer</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  className="ibtn focusable"
                  style={{ width: 18, height: 18 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const fetchProject = async () => {
                      try {
                        const port = 3001;
                        const host = window.location.hostname;
                        const res = await fetch(`http://${host}:${port}/api/fs/list`);
                        const data = await res.json();
                        if (data.success) {
                          const studioFolder = data.files.find(f => f.name === 'studio');
                          setFiles(studioFolder ? studioFolder.children || [] : []);
                        }
                        notify("Project nodes refreshed", "success");
                      } catch (err) {
                        notify("Refresh failed", "error");
                      }
                    };
                    fetchProject();
                  }}
                  title="Refresh Explorer"
                >
                  <RefreshCw size={10} />
                </button>
                <button
                  className="ibtn focusable"
                  style={{ width: 18, height: 18 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewFileButton();
                  }}
                  title="New file"
                >
                  <Plus size={10} />
                </button>
                <ChevronRight
                  size={10}
                  className={`chevron ${sections.explorer ? "open" : ""}`}
                  style={{ color: "var(--t3)" }}
                />
              </div>
            </div>
            {sections.explorer && (
              <div style={{ paddingTop: 2, paddingBottom: 4 }}>
                {files.length === 0 && (
                  <div
                    style={{
                      padding: "14px 12px",
                      fontSize: 11.5,
                      color: "var(--t3)",
                      textAlign: "center",
                      animation: "fadeUp 200ms ease",
                    }}
                  >
                    No files found in project root
                  </div>
                )}
                {files.map((f) => (
                  <FileTreeItem
                    key={f.path}
                    item={f}
                    activePath={activeFileId}
                    onFileClick={handleFileClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div>
            <div
              className="sec-hdr"
              onClick={() => setSections((p) => ({ ...p, mcp: !p.mcp }))}
            >
              <span className="sec-label">
                Capabilities
                {detectedCaps.length > 0 && (
                  <span
                    style={{
                      marginLeft: 5,
                      background: "var(--s3)",
                      color: "var(--t2)",
                      borderRadius: 8,
                      padding: "0 4px",
                      fontSize: 9,
                      verticalAlign: "middle",
                      animation: "popIn 200ms cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  >
                    {detectedCaps.length}
                  </span>
                )}
              </span>
              <ChevronRight
                size={10}
                className={`chevron ${sections.mcp ? "open" : ""}`}
                style={{ color: "var(--t3)" }}
              />
            </div>
            {sections.mcp && (
              <div style={{ paddingTop: 2, paddingBottom: 4 }}>
                {detectedCaps.length === 0 ? (
                  <div
                    style={{
                      padding: "12px",
                      fontSize: 11.5,
                      color: "var(--t3)",
                      textAlign: "center",
                    }}
                  >
                    No capabilities detected
                  </div>
                ) : (
                  detectedCaps.map((cap, i) => {
                    const cfg = CAP_CFG[cap.type];
                    return (
                      <div
                        key={i}
                        onClick={() => scrollToTool(cap.name)}
                        className={`tree-item cap-item`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <span
                          style={{
                            color: cfg.c,
                            display: "flex",
                            flexShrink: 0,
                          }}
                        >
                          {cfg.icon}
                        </span>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {cap.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--t4)",
                            flexShrink: 0,
                          }}
                        >
                          {cap.type}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
        }}
      >
        {/* Tab bar */}
        <div className="ide-tabbar" style={{ paddingRight: 48 }}>
          {openFiles.length === 0 && (
            <div className="flex items-center px-5 text-[11px] font-medium tracking-wide text-slate-600 uppercase">
              No files open
            </div>
          )}
          {openFiles.map((f) => (
            <div
              key={f.path}
              onClick={() => setActiveFileId(f.path)}
              className={`ide-tab group ${activeFileId === f.path ? "active" : ""}`}
            >
              <FileCode
                size={13}
                className={f.name.endsWith(".py") ? "text-violet-400" : "text-slate-500"}
              />
              <span className="text-[12px] font-medium tracking-tight">
                {f.name}
              </span>

              {f.isUnsaved && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse" />
              )}

              <button
                onClick={(e) => closeFile(e, f.path)}
                className="ide-tab-close ml-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="absolute right-0 top-0 bottom-0 flex items-center px-3 bg-[var(--s1)] border-l border-[var(--b1)] gap-1">
            <button
              className={`p-1.5 rounded-lg transition-all ${rightPanelOpen ? "bg-violet-500/10 text-violet-400 shadow-[0_0_12px_rgba(124,92,252,0.15)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              onClick={() => setRightPanelOpen((p) => !p)}
              title="Magic Tools"
            >
              <Wand2 size={15} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {activeFile && (
          <div className="ide-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--f-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeFile.path}
              </span>
              {activeFile.isUnsaved && (
                <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20" style={{ animation: "pulse 2.5s ease infinite" }}>
                  Modified
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <ABtn className="btn-secondary" onClick={handleSave} style={{ fontSize: 11, padding: "5px 10px" }}>
                <Save size={12} /> Save
              </ABtn>
              <ABtn className="btn-primary" onClick={handleTestMCP} style={{ fontSize: 11, padding: "5px 12px" }}>
                <Bot size={12} /> Test MCP
              </ABtn>
            </div>
          </div>
        )}

        {/* Editor area */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--bg)",
          }}
        >
          {activeFile ? (
            <div style={{ flex: 1, animation: "fadeIn 180ms ease" }}>
              <Editor
                height="100%"
                defaultLanguage="python"
                path={activeFile.path}
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 13,
                  lineHeight: 22,
                  minimap: { enabled: true, scale: 0.7 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 18, bottom: 18 },
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  fontLigatures: true,
                  renderLineHighlight: "line",
                }}
              />
            </div>
          ) : (
            /* ── Animated empty state ── */
            <div className="ide-empty-state">
              {/* Ambient scan line */}
              <div className="scan-line" />
              {/* Background grid */}
              <div className="bg-grid-faded" style={{ position: "absolute", inset: 0, animation: "gridFade 5s ease-in-out infinite" }} />

              {/* Orbital icon */}
              <div className="ide-empty-icon">
                <Cpu size={28} strokeWidth={1.25} style={{ color: "var(--a)", animation: "breathe 3s ease-in-out infinite" }} />
              </div>

              <div style={{ textAlign: "center", animation: "fadeUp 300ms 100ms ease both" }}>
                <p className="gradient-text-static" style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", fontFamily: "var(--f-main)" }}>
                  No file selected
                </p>
                <p style={{ fontSize: 12, color: "var(--t3)", margin: 0 }}>
                  Open a file from the explorer or press{" "}
                  <kbd style={{ fontSize: 10, padding: "2px 6px", background: "var(--s3)", border: "1px solid var(--b2)", borderRadius: 4, fontFamily: "var(--f-mono)", color: "var(--t2)" }}>
                    ⌘K
                  </kbd>{" "}
                  to get started
                </p>
              </div>

              {/* Shortcut chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 320, animation: "fadeUp 300ms 200ms ease both" }}>
                {[
                  ["⌘K", "Commands"],
                  ["⌘↵", "Test LLM"],
                  ["⌘`", "Terminal"],
                  ["⌘S", "Save"],
                ].map(([k, l], i) => (
                  <div
                    key={k}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                      background: "rgba(124,92,252,0.04)", border: "1px solid var(--b1)", borderRadius: 6,
                      fontSize: 11, color: "var(--t3)", animation: `fadeUp 250ms ${300 + i * 60}ms ease both`,
                    }}
                  >
                    <kbd style={{ fontFamily: "var(--f-mono)", fontSize: 10, background: "var(--s3)", padding: "0 4px", borderRadius: 3, color: "var(--t2)" }}>
                      {k}
                    </kbd>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom panel */}
          {bottomPanelOpen && (
            <div className="ide-bottom-panel">
              <div className="ide-bottom-panel-header">
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  {[
                    ["console", "Terminal"],
                    ["playground", "Tool Playground"],
                    ["copilot", "Copilot"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={`ptab focusable ${bottomPanelTab === id ? "active" : ""}`}
                      onClick={() => setBottomPanelTab(id)}
                    >
                      {id === "copilot" && (
                        <Sparkles
                          size={10}
                          style={{
                            color:
                              bottomPanelTab === "copilot"
                                ? "var(--a)"
                                : "var(--t3)",
                          }}
                        />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 9px",
                    gap: 2,
                  }}
                >
                  <button
                    className="ibtn focusable"
                    onClick={() => setLogs([])}
                    title="Clear"
                    style={{ width: 24, height: 24 }}
                  >
                    <Ban size={12} />
                  </button>
                  <button
                    className="ibtn focusable"
                    onClick={handleStop}
                    title="Stop"
                    style={{ width: 24, height: 24 }}
                  >
                    <Square size={12} />
                  </button>
                  <div
                    style={{
                      width: 1,
                      height: 14,
                      background: "var(--b1)",
                      margin: "0 3px",
                    }}
                  />
                  <button
                    className="ibtn focusable"
                    onClick={() => setBottomPanelOpen(false)}
                    style={{ width: 24, height: 24 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Terminal */}
              {bottomPanelTab === "console" && (
                <div className="ide-terminal scroll">
                  {logs.map((l, i) => (
                    <div
                      key={i}
                      className="log-line"
                      style={{
                        color:
                          l.type === "error"
                            ? "var(--red)"
                            : l.type === "info"
                              ? "var(--t3)"
                              : "var(--t1)",
                        marginBottom: 1,
                        animationDelay: `${i * 20}ms`,
                      }}
                    >
                      {l.type === "info" && (
                        <span style={{ color: "var(--t4)", marginRight: 6 }}>
                          ›
                        </span>
                      )}
                      {l.text}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <span
                      style={{
                        color: "var(--t4)",
                        animation: "pulse 3s ease-in-out infinite",
                      }}
                    >
                      No output yet…
                    </span>
                  )}
                </div>
              )}

              {/* Playground */}
              {bottomPanelTab === "playground" && (
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                  <div
                    className="scroll"
                    style={{
                      width: 180,
                      borderRight: "1px solid var(--b1)",
                      overflowY: "auto",
                      padding: 8,
                      background: "var(--s0)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--t3)",
                        padding: "3px 5px 7px",
                      }}
                    >
                      Tools
                    </div>
                    {detectedCaps.filter((c) => c.type === "tool").length ===
                      0 ? (
                      <div
                        style={{
                          padding: "6px",
                          fontSize: 11.5,
                          color: "var(--t3)",
                          fontStyle: "italic",
                        }}
                      >
                        No tools found
                      </div>
                    ) : (
                      detectedCaps
                        .filter((c) => c.type === "tool")
                        .map((t, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedPlaygroundTool(t);
                              setPlaygroundArgs({});
                            }}
                            className="focusable"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "5px 9px",
                              borderRadius: "var(--r-sm)",
                              cursor: "pointer",
                              marginBottom: 1,
                              fontSize: 12,
                              border: "none",
                              fontFamily: "var(--f-ui)",
                              background:
                                selectedPlaygroundTool?.name === t.name
                                  ? "var(--a-dim)"
                                  : "none",
                              color:
                                selectedPlaygroundTool?.name === t.name
                                  ? "var(--a)"
                                  : "var(--t2)",
                              borderLeft: `2px solid ${selectedPlaygroundTool?.name === t.name ? "var(--a)" : "transparent"}`,
                              transition: "all 120ms",
                              animation: `capSlide 200ms ease ${i * 50}ms both`,
                            }}
                          >
                            {t.name}
                          </button>
                        ))
                    )}
                  </div>
                  <div
                    className="scroll"
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: 18,
                      background: "var(--bg)",
                    }}
                  >
                    {selectedPlaygroundTool ? (
                      <div
                        style={{
                          maxWidth: 380,
                          animation: "fadeUp 180ms ease",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 18,
                          }}
                        >
                          <Hammer
                            size={13}
                            style={{ color: "var(--c-tool)" }}
                          />
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: "var(--t1)",
                            }}
                          >
                            {selectedPlaygroundTool.name}
                          </span>
                        </div>
                        {selectedPlaygroundTool.args.length === 0 ? (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--t3)",
                              marginBottom: 14,
                              fontStyle: "italic",
                            }}
                          >
                            No arguments required.
                          </p>
                        ) : (
                          selectedPlaygroundTool.args.map((arg, i) => (
                            <div
                              key={arg.name}
                              style={{
                                marginBottom: 10,
                                animation: `fadeUp 140ms ${i * 60}ms ease both`,
                              }}
                            >
                              <label
                                style={{
                                  display: "block",
                                  fontSize: 11,
                                  color: "var(--t2)",
                                  marginBottom: 4,
                                  fontFamily: "var(--f-mono)",
                                }}
                              >
                                {arg.name}{" "}
                                <span style={{ color: "var(--t3)" }}>
                                  : {arg.type}
                                </span>
                              </label>
                              <input
                                className="input focusable"
                                style={{ width: "100%", padding: "6px 10px" }}
                                onChange={(e) =>
                                  setPlaygroundArgs({
                                    ...playgroundArgs,
                                    [arg.name]: e.target.value,
                                  })
                                }
                              />
                            </div>
                          ))
                        )}
                        <ABtn
                          className="btn-primary"
                          onClick={handleExecuteTool}
                          style={{ marginTop: 6, fontSize: 12 }}
                        >
                          <TestTube size={13} /> Execute
                        </ABtn>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          color: "var(--t3)",
                          fontStyle: "italic",
                        }}
                      >
                        Select a tool to execute
                      </div>
                    )}
                  </div>
                </div>
              )}

              {bottomPanelTab === "copilot" && (
                <CopilotPane onInsertCode={insertSnippet} />
              )}
            </div>
          )}
        </div>

        <footer className="ide-statusbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="focusable"
              onClick={handleOpenTerminal}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 100ms" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
            >
              <Terminal size={10} /> Terminal
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: mcpStatus === "Running" ? "var(--green)" : "var(--t3)", transition: "color 300ms" }}>
              <span className={`dot ${mcpStatus === "Running" ? "dot-running" : "dot-idle"}`} />
              MCP {mcpStatus}
            </div>
          </div>
          <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--f-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>
            {activeFile ? activeFile.path : "Archestra Studio"}
          </span>
        </footer>
      </main>

      {/* Right sidebar */}
      {rightPanelOpen && (
        <MagicToolsSidebar
          onAction={handleMagicAction}
          onClose={() => setRightPanelOpen(false)}
        />
      )}

      {/* Toast */}
      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
