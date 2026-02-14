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
  // Auto-connect to project if no handle is set
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
    fetchProject();
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
          width: 248,
          background: "var(--s0)",
          borderRight: "1px solid var(--b1)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 10,
          animation: "fadeRight 220ms ease",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 46,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            borderBottom: "1px solid var(--b1)",
            gap: 9,
          }}
        >
          <div
            className="logo-icon"
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "var(--a-dim)",
              border: "1px solid var(--a-bdr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Cpu size={13} style={{ color: "var(--a)" }} />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--t1)",
              letterSpacing: "-0.01em",
            }}
          >
            MCP Studio
          </span>
          {projectHandle && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10.5,
                color: "var(--t3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 80,
              }}
            >
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
              <div
                style={{
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 5,
                }}
              >
                {[
                  {
                    icon: (
                      <FilePlus size={14} style={{ color: "var(--green)" }} />
                    ),
                    label: "New Server",
                    action: handleNewServerButton,
                  },
                  {
                    icon: <Key size={14} style={{ color: "var(--amber)" }} />,
                    label: "Secrets",
                    action: handleManageSecrets,
                  },
                  {
                    icon: <Command size={14} style={{ color: "var(--red)" }} />,
                    label: "Commands",
                    action: () => setCmdPaletteOpen(true),
                  },
                  {
                    icon: <Wand2 size={14} style={{ color: "var(--a)" }} />,
                    label: "Templates",
                    action: () => setRightPanelOpen((p) => !p),
                  },
                ].map(({ icon, label, action }, i) => (
                  <button
                    key={label}
                    className="qa-card focusable"
                    onClick={action}
                    style={{
                      padding: "8px 9px",
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      background: "var(--s1)",
                      border: "1px solid var(--b1)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 5,
                      textAlign: "left",
                      animation: `fadeUp 200ms ease ${i * 60}ms both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--s2)";
                      e.currentTarget.style.borderColor = "var(--b2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--s1)";
                      e.currentTarget.style.borderColor = "var(--b1)";
                    }}
                  >
                    {icon}
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--t2)",
                        fontWeight: 500,
                      }}
                    >
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
        <div
          style={{
            height: 36,
            background: "var(--s0)",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "stretch",
            overflowX: "auto",
            flexShrink: 0,
            position: "relative",
            paddingRight: 44,
            animation: "fadeDown 180ms ease",
          }}
        >
          {openFiles.length === 0 && (
            <span
              style={{
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                color: "var(--t4)",
              }}
            >
              No file open
            </span>
          )}
          {openFiles.map((f, i) => (
            <div
              key={f.path}
              onClick={() => setActiveFileId(f.path)}
              className={`tab ${activeFileId === f.path ? "active" : ""}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <FileCode
                size={11}
                style={{
                  color: f.name.endsWith(".py") ? "#4D8FCC" : "var(--t3)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  maxWidth: 110,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </span>
              {f.isUnsaved && (
                <Circle
                  size={5}
                  style={{
                    color: "var(--t2)",
                    fill: "var(--t2)",
                    flexShrink: 0,
                    animation: "pulse 2s ease infinite",
                  }}
                />
              )}
              <button
                onClick={(e) => closeFile(e, f.path)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--t3)",
                  display: "flex",
                  padding: 2,
                  borderRadius: 3,
                  opacity: 0,
                  marginLeft: 1,
                  transition:
                    "opacity 100ms, background 80ms, color 80ms, transform 80ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background = "var(--s4)";
                  e.currentTarget.style.color = "var(--t1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0";
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.transform = "";
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "100%",
              display: "flex",
              alignItems: "center",
              padding: "0 9px",
              background: "var(--s0)",
              borderLeft: "1px solid var(--b1)",
              gap: 2,
            }}
          >
            <button
              className={`ibtn focusable ${rightPanelOpen ? "on" : ""}`}
              onClick={() => setRightPanelOpen((p) => !p)}
              title="Magic Tools"
            >
              <Wand2 size={14} />
            </button>
          </div>
        </div>

        {/* Toolbar — slides down when file opens */}
        {activeFile && (
          <div
            className="toolbar-in"
            style={{
              height: 38,
              background: "var(--s1)",
              borderBottom: "1px solid var(--b1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 13px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--t3)",
                  fontFamily: "var(--f-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeFile.path}
              </span>
              {activeFile.isUnsaved && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--amber)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                    animation: "pulse 2.5s ease infinite",
                  }}
                >
                  Modified
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <ABtn
                className="btn-secondary"
                onClick={handleSave}
                style={{ fontSize: 11.5, padding: "5px 10px" }}
              >
                <Save size={12} /> Save
              </ABtn>
              <ABtn
                className="btn-primary"
                onClick={handleTestMCP}
                style={{ fontSize: 11.5, padding: "5px 12px" }}
              >
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
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Ambient scan line */}
              <div className="scan-line" />
              {/* Background grid */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(var(--b0) 1px, transparent 1px), linear-gradient(90deg, var(--b0) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  animation: "gridFade 5s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />

              {/* Orbital rings */}
              <div
                style={{
                  position: "relative",
                  width: 80,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className="empty-ring"
                  style={{
                    position: "absolute",
                    inset: -14,
                    borderRadius: "50%",
                    border: "1px solid var(--b1)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    border: "1px dashed var(--a-bdr)",
                    animation: "orbitSlow 12s linear infinite",
                  }}
                />
                <div
                  className="empty-float"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: "var(--s1)",
                    border: "1px solid var(--b1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  <Cpu
                    size={24}
                    strokeWidth={1.25}
                    style={{
                      color: "var(--t3)",
                      animation: "breathe 3s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  animation: "fadeUp 300ms 100ms ease both",
                }}
              >
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "var(--t2)",
                    margin: "0 0 5px",
                  }}
                >
                  No file selected
                </p>
                <p style={{ fontSize: 12, color: "var(--t3)", margin: 0 }}>
                  Open a folder or press{" "}
                  <kbd
                    style={{
                      fontSize: 10.5,
                      padding: "1px 5px",
                      background: "var(--s2)",
                      border: "1px solid var(--b1)",
                      borderRadius: "var(--r-sm)",
                      fontFamily: "var(--f-mono)",
                    }}
                  >
                    ⌘K
                  </kbd>{" "}
                  to get started
                </p>
              </div>

              {/* Animated feature chips */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  maxWidth: 320,
                  animation: "fadeUp 300ms 200ms ease both",
                }}
              >
                {[
                  ["⌘K", "Commands"],
                  ["⌘↵", "Test LLM"],
                  ["⌘`", "Terminal"],
                  ["⌘S", "Save"],
                ].map(([k, l], i) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      background: "var(--s1)",
                      border: "1px solid var(--b1)",
                      borderRadius: "var(--r-md)",
                      fontSize: 11,
                      color: "var(--t3)",
                      animation: `fadeUp 250ms ${300 + i * 60}ms ease both`,
                    }}
                  >
                    <kbd
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: 10,
                        background: "var(--s3)",
                        padding: "0 3px",
                        borderRadius: 2,
                      }}
                    >
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
            <div
              className="panel-in"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                height: 300,
                background: "var(--s0)",
                borderTop: "1px solid var(--b1)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 -12px 40px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  height: 34,
                  background: "var(--s1)",
                  borderBottom: "1px solid var(--b1)",
                  display: "flex",
                  alignItems: "stretch",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
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
                <div
                  className="scroll"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "11px 14px",
                    background: "#050507",
                    fontFamily: "var(--f-mono)",
                    fontSize: 12,
                    lineHeight: 1.62,
                  }}
                >
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

        {/* Status bar */}
        <footer
          style={{
            height: 23,
            background: "var(--s1)",
            borderTop: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 13px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="focusable"
              onClick={handleOpenTerminal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10.5,
                color: "var(--t3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "color 100ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
            >
              <Terminal size={10} /> Terminal
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10.5,
                color: mcpStatus === "Running" ? "var(--green)" : "var(--t3)",
                transition: "color 300ms",
              }}
            >
              <span
                className={`dot ${mcpStatus === "Running" ? "dot-running" : "dot-idle"}`}
              />
              MCP {mcpStatus}
            </div>
          </div>
          <span
            style={{
              fontSize: 10.5,
              color: "var(--t3)",
              fontFamily: "var(--f-mono)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 320,
            }}
          >
            {activeFile ? activeFile.path : "—"}
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
