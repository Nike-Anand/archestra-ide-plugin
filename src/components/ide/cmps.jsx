import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight,
  Folder,
  FileCode,
  FileType,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Hammer,
  Terminal,
  Plus,
  Search,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Key,
  Wand2,
  Sparkles,
  Bot,
  Copy,
  RefreshCw,
  Send,
  User,
  ArrowDownToLine,
} from "lucide-react";
import { MAGIC_TOOLS_DATA, BADGE_MAP } from "../../utils/constant";
function useRipple() {
  const ref = useRef(null);
  const trigger = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const r = document.createElement("span");
    const size = Math.max(rect.width, rect.height) * 2;
    r.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;
      left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;
      background:rgba(255,255,255,0.06);pointer-events:none;transform:scale(0);
      animation:ripple 500ms ease-out forwards;`;
    el.appendChild(r);
    setTimeout(() => r.remove(), 520);
  }, []);
  return [ref, trigger];
}
// ─── ANIMATED BUTTON ─────────────────────────────────────────────────────────
export const ABtn = ({
  className,
  onClick,
  style,
  children,
  disabled,
  title,
}) => {
  const [ref, ripple] = useRipple();
  return (
    <button
      ref={ref}
      className={`btn ${className || ""} focusable`}
      disabled={disabled}
      title={title}
      style={{ position: "relative", overflow: "hidden", ...style }}
      onClick={(e) => {
        ripple(e);
        onClick && onClick(e);
      }}
    >
      {children}
    </button>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
export const Toast = ({ message, type, onClose }) => {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2700);
    const t2 = setTimeout(onClose, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onClose]);
  const cfg = {
    success: { c: "var(--green)", icon: <CheckCircle size={13} /> },
    error: { c: "var(--red)", icon: <AlertTriangle size={13} /> },
    info: { c: "var(--a)", icon: <Info size={13} /> },
    warning: { c: "var(--amber)", icon: <AlertTriangle size={13} /> },
  }[type] || { c: "var(--a)", icon: <Info size={13} /> };
  return (
    <div
      className={leaving ? "toast-out" : "toast-in"}
      style={{
        position: "fixed",
        bottom: 20,
        right: 16,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        maxWidth: 320,
        overflow: "hidden",
        background: "var(--s2)",
        border: "1px solid var(--b2)",
        borderLeft: `3px solid ${cfg.c}`,
        borderRadius: "var(--r-md)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 13px",
        }}
      >
        <span style={{ color: cfg.c, display: "flex", flexShrink: 0 }}>
          {cfg.icon}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--t1)", lineHeight: 1.4 }}>
          {message}
        </span>
      </div>
      <div style={{ height: 2, background: "var(--b1)" }}>
        <div
          style={{
            height: "100%",
            background: cfg.c,
            animation: `progressDrain 2.7s linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

// ─── COPILOT PANE ────────────────────────────────────────────────────────────
export const CopilotPane = ({ onInsertCode }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "ai",
      text: "Hi, I'm your MCP Copilot.\nAsk me to generate tools, resources, or prompts for your server.",
      code: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isThinking]);

  const generateResponse = (prompt) => {
    const lower = prompt.toLowerCase();
    if (lower.includes("tool") || lower.includes("function")) {
      const match = lower.match(
        /(?:create|make|write)\s+(?:a|an)\s+tool\s+(?:that|to|for)\s+(.*)/i,
      );
      const desc = match ? match[1] : "does something useful";
      const funcName = desc
        .split(" ")
        .slice(0, 3)
        .join("_")
        .replace(/[^a-z0-9_]/g, "");
      return {
        text: `Generated a tool to **${desc}**. Click insert to add it to your editor.`,
        code: `@mcp.tool()\nasync def ${funcName}(ctx: Context, param: str) -> str:\n    """\n    Tool to ${desc}.\n    """\n    ctx.info(f"Starting ${funcName} with {param}")\n    # TODO: implement logic\n    return f"Processed {param}"`,
      };
    }
    if (lower.includes("resource"))
      return {
        text: "Here's a **Dynamic Resource** template for read-only data access.",
        code: `@mcp.resource("app://{category}/{id}")\nasync def get_resource_data(category: str, id: str) -> str:\n    """\n    Fetch data for a specific category and ID.\n    """\n    return f"Data for {category} ID: {id}"`,
      };
    if (lower.includes("prompt"))
      return {
        text: "Here's a **Prompt Template** to structure LLM interactions.",
        code: `@mcp.prompt()\ndef agent_persona(role: str) -> str:\n    """Define the agent's personality"""\n    return f"You are a helpful {role}. Please answer concisely."`,
      };
    return {
      text: 'Try asking:\n— "Create a tool to fetch weather data"\n— "Make a resource for user profiles"\n— "Write a prompt for code review"',
      code: null,
    };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((p) => [...p, { id: Date.now(), role: "user", text: input }]);
    setInput("");
    setIsThinking(true);
    setTimeout(() => {
      const res = generateResponse(input);
      setMessages((p) => [...p, { id: Date.now() + 1, role: "ai", ...res }]);
      setIsThinking(false);
    }, 1100);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0a0e1a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background texture */}
      <div className="absolute inset-0 bg-grid-faded opacity-10 pointer-events-none" />

      {/* Chat messages container with proper scroll */}
      <div
        className="scroll custom-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
          zIndex: 1,
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 8,
              animation: `fadeUp 300ms ease ${idx * 40}ms backwards`,
            }}
          >
            <div
              className={msg.role === "user" ? "bubble-user glass-panel-heavy" : "bubble-bot glass-panel-heavy"}
              style={{
                maxWidth: "88%",
                padding: "10px 14px",
                fontSize: 12.5,
                lineHeight: 1.6,
                background: msg.role === "user"
                  ? "linear-gradient(135deg, rgba(188, 19, 254, 0.15), rgba(188, 19, 254, 0.08))"
                  : "rgba(21, 27, 46, 0.6)",
                color: msg.role === "user" ? "#fff" : "rgba(255, 255, 255, 0.9)",
                border: msg.role === "user"
                  ? "1px solid rgba(188, 19, 254, 0.3)"
                  : "1px solid rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(20px)",
                whiteSpace: "pre-wrap",
                position: "relative",
                overflow: "hidden",
                boxShadow: msg.role === "user"
                  ? "0 8px 32px rgba(188, 19, 254, 0.15)"
                  : "0 4px 16px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none" />
              <span className="relative z-10">{msg.text}</span>
            </div>
            {msg.code && (
              <div
                className="code-reveal glass-panel-heavy"
                style={{
                  width: "100%",
                  maxWidth: "88%",
                  background: "rgba(10, 14, 26, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  overflow: "hidden",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--f-mono)",
                      color: "rgba(255, 255, 255, 0.4)",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Python
                  </span>
                  <ABtn
                    onClick={() => onInsertCode(msg.code)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(0, 255, 170, 0.08)",
                      color: "#00ffaa",
                      border: "1px solid rgba(0, 255, 170, 0.2)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 170, 0.15)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0, 255, 170, 0.08)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <ArrowDownToLine size={11} /> Insert
                  </ABtn>
                </div>
                <pre
                  style={{
                    padding: "14px 16px",
                    fontSize: 11.5,
                    fontFamily: "var(--f-mono)",
                    color: "rgba(255, 255, 255, 0.85)",
                    lineHeight: 1.7,
                    overflowX: "auto",
                    margin: 0,
                  }}
                  className="custom-scrollbar"
                >
                  {msg.code}
                </pre>
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "bubbleBot 200ms ease",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                background: "rgba(188, 19, 254, 0.1)",
                border: "1px solid rgba(188, 19, 254, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "breathe 1.5s ease-in-out infinite",
              }}
            >
              <Sparkles size={12} style={{ color: "#bc13fe" }} />
            </div>
            <div
              className="glass-panel-heavy"
              style={{
                display: "flex",
                gap: 5,
                padding: "10px 14px",
                background: "rgba(21, 27, 46, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "2px 12px 12px 12px",
                backdropFilter: "blur(20px)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="tdot"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.3)",
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={scrollRef} style={{ height: 1, flexShrink: 0 }} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px 16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          background: "rgba(10, 14, 26, 0.8)",
          backdropFilter: "blur(20px)",
          position: "relative",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "8px 12px 8px 14px",
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            transition: "all 0.2s ease",
            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "rgba(188, 19, 254, 0.4)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(188, 19, 254, 0.08), inset 0 2px 8px rgba(0, 0, 0, 0.3)";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.boxShadow = "inset 0 2px 8px rgba(0, 0, 0, 0.3)";
          }}
        >
          <input
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12.5,
              color: "#fff",
              fontFamily: "var(--f-ui)",
              fontWeight: 500,
            }}
            placeholder="Ask Copilot to generate a tool…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <ABtn
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              background: input.trim()
                ? "linear-gradient(135deg, rgba(188, 19, 254, 0.2), rgba(188, 19, 254, 0.1))"
                : "rgba(255, 255, 255, 0.03)",
              color: input.trim() ? "#bc13fe" : "rgba(255, 255, 255, 0.2)",
              border: input.trim()
                ? "1px solid rgba(188, 19, 254, 0.3)"
                : "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: 8,
              cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Send
          </ABtn>
        </div>
      </div>
    </div>
  );
};

// ─── LLM TEST WORKBENCH ──────────────────────────────────────────────────────
export const LLMTestWorkbench = ({ isOpen, onClose, tools, onRunLog }) => {
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: "MCP server connected. I have access to your local tools.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((p) => [...p, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const matched = tools.find((t) =>
        input.toLowerCase().includes(t.name.toLowerCase()),
      );
      if (matched) {
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content: `I'll use \`${matched.name}\` for that.`,
            toolCall: { name: matched.name, args: { param: "mock_value" } },
          },
        ]);
        onRunLog(`[LLM] Tool call: ${matched.name}`);
        setTimeout(() => {
          setMessages((p) => [
            ...p,
            {
              role: "tool",
              name: matched.name,
              content: `Result from ${matched.name}: OK`,
            },
          ]);
          setTimeout(() => {
            setMessages((p) => [
              ...p,
              {
                role: "assistant",
                content: `Done — ${matched.name} completed successfully.`,
              },
            ]);
            setIsTyping(false);
          }, 700);
        }, 900);
      } else {
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content:
              tools.length > 0
                ? `No matching tool. Defined: ${tools.map((t) => t.name).join(", ")}.`
                : "No tools found. Add a @mcp.tool to get started.",
          },
        ]);
        setIsTyping(false);
      }
    }, 1100);
  };

  if (!isOpen) return null;
  return (
    <div className="overlay">
      <div className="modal" style={{ width: 740, height: 560 }}>
        <div className="modal-hdr">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--r-md)",
                background: "var(--green-dim)",
                border: "1px solid var(--green-bdr)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "breathe 2.5s ease-in-out infinite",
              }}
            >
              <Bot size={15} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}
              >
                LLM Test Workbench
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--t3)",
                  marginTop: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span className="dot dot-running" />
                Simulating Claude 3.5 Sonnet · {tools.length} tool
                {tools.length !== 1 ? "s" : ""} active
              </div>
            </div>
          </div>
          <button className="ibtn focusable" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div
          className="scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "var(--bg)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 9,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
              }}
            >
              {m.role !== "user" && (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "var(--r-sm)",
                    flexShrink: 0,
                    background:
                      m.role === "tool" ? "var(--amber-dim)" : "var(--a-dim)",
                    border: `1px solid ${m.role === "tool" ? "var(--amber-bdr)" : "var(--a-bdr)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.role === "tool" ? "var(--amber)" : "var(--a)",
                  }}
                >
                  {m.role === "tool" ? <Hammer size={12} /> : <Bot size={13} />}
                </div>
              )}
              <div
                style={{
                  maxWidth: "72%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  className={
                    m.role === "user"
                      ? "bubble-user"
                      : m.role === "tool"
                        ? "bubble-tool"
                        : "bubble-bot"
                  }
                  style={{
                    padding: "8px 12px",
                    lineHeight: 1.55,
                    background:
                      m.role === "user"
                        ? "var(--a)"
                        : m.role === "tool"
                          ? "var(--s2)"
                          : "var(--s1)",
                    color: m.role === "user" ? "#fff" : "var(--t1)",
                    border: m.role !== "user" ? "1px solid var(--b1)" : "none",
                    fontFamily:
                      m.role === "tool" ? "var(--f-mono)" : "var(--f-ui)",
                    fontSize: m.role === "tool" ? 11.5 : 12.5,
                  }}
                >
                  {m.content}
                </div>
                {m.toolCall && (
                  <div
                    style={{
                      padding: "7px 10px",
                      background: "var(--s1)",
                      border: "1px solid var(--b1)",
                      borderRadius: "var(--r-sm)",
                      fontFamily: "var(--f-mono)",
                      fontSize: 11,
                      animation: "codeReveal 200ms ease",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--c-tool)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 3,
                      }}
                    >
                      <Terminal size={10} /> calling {m.toolCall.name}()
                    </div>
                    <div style={{ color: "var(--t3)" }}>
                      {JSON.stringify(m.toolCall.args)}
                    </div>
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "var(--r-sm)",
                    flexShrink: 0,
                    background: "var(--s3)",
                    border: "1px solid var(--b1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--t2)",
                  }}
                >
                  <User size={13} />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div
              style={{
                display: "flex",
                gap: 9,
                animation: "bubbleBot 200ms ease",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "var(--r-sm)",
                  background: "var(--a-dim)",
                  border: "1px solid var(--a-bdr)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--a)",
                }}
              >
                <Bot size={13} />
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--s1)",
                  border: "1px solid var(--b1)",
                  borderRadius: "2px 8px 8px 8px",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="tdot"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--t3)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div
          style={{
            padding: "12px 16px",
            background: "var(--s1)",
            borderTop: "1px solid var(--b1)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input focusable"
              style={{ flex: 1, padding: "8px 11px" }}
              placeholder={`Ask about your ${tools.length} tool${tools.length !== 1 ? "s" : ""}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              autoFocus
            />
            <ABtn
              className="btn-primary"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
            >
              <Send size={13} />
            </ABtn>
          </div>
          <div
            style={{
              marginTop: 7,
              fontSize: 10.5,
              color: "var(--t3)",
              display: "flex",
              gap: 14,
            }}
          >
            <span>tools: {tools.length}</span>
            <span>model: claude-3-5-sonnet (sim)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── AI EXPLANATION MODAL ────────────────────────────────────────────────────
export const AIExplanationModal = ({ isOpen, onClose, type }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const EXPLANATIONS = {
    tool: "This block defines an MCP Tool — an executable function that allows an AI to perform actions such as fetching data, computing values, or calling external services.\n\nThe @mcp.tool() decorator registers this function in the MCP capabilities list, exposing its typed parameters directly to the LLM for structured invocation.",
    resource:
      "This block defines an MCP Resource — a read-only data source similar to a file or database record.\n\nThe URI template allows clients to request specific data slices. Unlike tools, resources are passive and designed for context retrieval.",
    prompt:
      "This block defines an MCP Prompt — a reusable template that helps users or the AI begin interactions with the right context.\n\nPrompts accept arguments to dynamically construct the initial context window for a conversation.",
  };
  const TYPE_CFG = {
    tool: { label: "Tool", c: "var(--c-tool)" },
    resource: { label: "Resource", c: "var(--c-resource)" },
    prompt: { label: "Prompt", c: "var(--c-prompt)" },
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setContent("");
    const text = EXPLANATIONS[type] || "Analyzing…";
    let i = 0;
    const t = setTimeout(() => {
      setLoading(false);
      const iv = setInterval(() => {
        setContent(text.slice(0, i));
        i++;
        if (i > text.length) clearInterval(iv);
      }, 11);
    }, 550);
    return () => clearTimeout(t);
  }, [isOpen, type]);

  if (!isOpen) return null;
  const cfg = TYPE_CFG[type] || { label: "Block", c: "var(--a)" };
  return (
    <div className="overlay">
      <div className="modal" style={{ width: 460 }}>
        <div className="modal-hdr">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Sparkles
              size={14}
              style={{
                color: cfg.c,
                animation: "breathe 2s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
              AI Explanation
            </span>
            <span
              className="badge"
              style={{
                color: cfg.c,
                background: `${cfg.c}18`,
                borderColor: `${cfg.c}35`,
              }}
            >
              {cfg.label}
            </span>
          </div>
          <button className="ibtn focusable" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div
          style={{
            padding: "18px 20px",
            minHeight: 130,
            background: "var(--bg)",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 110,
                gap: 10,
              }}
            >
              <div style={{ position: "relative", width: 32, height: 32 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    border: "1.5px solid var(--b2)",
                    borderRadius: "50%",
                    borderTopColor: "var(--a)",
                    animation: "spin 600ms linear infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 6,
                    border: "1px solid var(--b1)",
                    borderRadius: "50%",
                    borderTopColor: cfg.c,
                    animation: "spin 400ms linear infinite reverse",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--t3)",
                  fontFamily: "var(--f-mono)",
                  animation: "pulse 1.2s ease infinite",
                }}
              >
                Analyzing…
              </span>
            </div>
          ) : (
            <p
              style={{
                fontSize: 12.5,
                color: "var(--t2)",
                lineHeight: 1.68,
                whiteSpace: "pre-wrap",
                animation: "fadeUp 200ms ease",
              }}
            >
              {content}
              <span
                style={{
                  display: "inline-block",
                  width: 1.5,
                  height: 13,
                  background: "var(--a)",
                  marginLeft: 2,
                  animation: "blink 1s step-end infinite",
                  verticalAlign: "middle",
                }}
              />
            </p>
          )}
        </div>
        <div className="modal-ftr" style={{ justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: 10.5,
              color: "var(--t3)",
              fontFamily: "var(--f-mono)",
            }}
          >
            GPT-4o-mini
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className="ibtn focusable"
              title="Regenerate"
              style={{ width: 26, height: 26 }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="ibtn focusable"
              title="Copy"
              style={{ width: 26, height: 26 }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── SECRETS MANAGER ─────────────────────────────────────────────────────────
export const SecretsManagerModal = ({
  isOpen,
  onClose,
  onSave,
  existingContent,
}) => {
  const [secrets, setSecrets] = useState([]);
  useEffect(() => {
    if (!isOpen) return;
    if (existingContent) {
      const p = existingContent
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((l) => {
          const [k, ...v] = l.split("=");
          return { key: k.trim(), value: v.join("=").trim(), visible: false };
        });
      setSecrets(p.length ? p : [{ key: "", value: "", visible: false }]);
    } else setSecrets([{ key: "", value: "", visible: false }]);
  }, [isOpen, existingContent]);

  if (!isOpen) return null;
  const upd = (i, f, v) => {
    const n = [...secrets];
    n[i][f] = v;
    setSecrets(n);
  };
  const save = () => {
    onSave(
      secrets
        .filter((s) => s.key)
        .map((s) => `${s.key}=${s.value}`)
        .join("\n"),
    );
    onClose();
  };

  return (
    <div className="overlay">
      <div className="modal" style={{ width: 540, maxHeight: "78vh" }}>
        <div className="modal-hdr">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Key size={14} style={{ color: "var(--amber)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
              Secrets Manager
            </span>
            <span style={{ fontSize: 11, color: "var(--t3)" }}>.env</span>
          </div>
          <button className="ibtn focusable" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div
          className="scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            background: "var(--bg)",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr 28px",
              gap: 8,
              padding: "0 0 6px",
              borderBottom: "1px solid var(--b0)",
            }}
          >
            {["Key", "Value", ""].map((h, i) => (
              <span key={i} className="sec-label">
                {h}
              </span>
            ))}
          </div>
          {secrets.map((s, i) => (
            <div
              key={i}
              className="si"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.5fr 28px",
                gap: 8,
                alignItems: "center",
                animationDelay: `${i * 50}ms`,
              }}
            >
              <input
                className="input focusable"
                style={{
                  padding: "6px 10px",
                  fontFamily: "var(--f-mono)",
                  fontSize: 11.5,
                  color: "var(--green)",
                }}
                placeholder="KEY_NAME"
                value={s.key}
                onChange={(e) => upd(i, "key", e.target.value.toUpperCase())}
              />
              <div style={{ position: "relative" }}>
                <input
                  className="input focusable"
                  type={s.visible ? "text" : "password"}
                  style={{
                    width: "100%",
                    padding: "6px 30px 6px 10px",
                    fontFamily: "var(--f-mono)",
                    fontSize: 11.5,
                  }}
                  placeholder="value"
                  value={s.value}
                  onChange={(e) => upd(i, "value", e.target.value)}
                />
                <button
                  onClick={() => {
                    const n = [...secrets];
                    n[i].visible = !n[i].visible;
                    setSecrets(n);
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--t3)",
                    display: "flex",
                    padding: 0,
                    transition: "color 100ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--t1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--t3)")
                  }
                >
                  {s.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <button
                className="ibtn focusable"
                onClick={() => setSecrets(secrets.filter((_, j) => j !== i))}
                style={{ color: "var(--red)", width: 26, height: 26 }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            className="focusable"
            onClick={() =>
              setSecrets([...secrets, { key: "", value: "", visible: false }])
            }
            style={{
              marginTop: 4,
              padding: "7px 0",
              border: "1px dashed var(--b2)",
              borderRadius: "var(--r-sm)",
              background: "none",
              color: "var(--t3)",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "color 120ms, border-color 120ms, background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--t1)";
              e.currentTarget.style.background = "var(--s1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--t3)";
              e.currentTarget.style.background = "";
            }}
          >
            <Plus size={12} /> Add variable
          </button>
        </div>
        <div className="modal-ftr">
          <ABtn className="btn-ghost" onClick={onClose}>
            Cancel
          </ABtn>
          <ABtn className="btn-primary" onClick={save}>
            <Save size={13} /> Save .env
          </ABtn>
        </div>
      </div>
    </div>
  );
};

// ─── COMMAND PALETTE ─────────────────────────────────────────────────────────
export const CommandPalette = ({
  isOpen,
  onClose,
  commands,
  files,
  onFileSelect,
}) => {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  const fileItems = files.map((f) => ({
    label: f.name,
    hint: f.path,
    icon: <FileCode size={13} />,
    type: "file",
    action: () => onFileSelect(f),
  }));
  const all = [
    ...commands.map((c) => ({ ...c, type: "command" })),
    ...fileItems,
  ].filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((p) => (p + 1) % all.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((p) => (p - 1 + all.length) % all.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (all[sel]) {
          all[sel].action();
          onClose();
        }
      } else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, all, sel, onClose]);

  if (!isOpen) return null;
  const cmds = all.filter((i) => i.type === "command");
  const fls = all.filter((i) => i.type === "file");

  const Item = ({ item }) => {
    const realIdx = all.indexOf(item);
    const active = realIdx === sel;
    return (
      <div
        onClick={() => {
          item.action();
          onClose();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 10px",
          borderRadius: "var(--r-sm)",
          cursor: "pointer",
          marginBottom: 1,
          background: active ? "var(--a-dim)" : "transparent",
          transition: "background 80ms",
          animation: `fadeUp 140ms ease ${realIdx * 18}ms both`,
        }}
        onMouseEnter={() => setSel(realIdx)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              color: active ? "var(--a)" : "var(--t3)",
              display: "flex",
              transition: "color 80ms",
            }}
          >
            {item.icon}
          </span>
          <div>
            <div
              style={{
                fontSize: 12.5,
                color: active ? "var(--t1)" : "var(--t2)",
                transition: "color 80ms",
              }}
            >
              {item.label}
            </div>
            {item.hint && (
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--t3)",
                  fontFamily: "var(--f-mono)",
                }}
              >
                {item.hint}
              </div>
            )}
          </div>
        </div>
        {item.shortcut && (
          <kbd
            style={{
              fontSize: 10,
              padding: "1px 5px",
              background: "var(--s3)",
              border: "1px solid var(--b1)",
              borderRadius: "var(--r-sm)",
              fontFamily: "var(--f-mono)",
              color: active ? "var(--t2)" : "var(--t3)",
            }}
          >
            {item.shortcut}
          </kbd>
        )}
      </div>
    );
  };

  return (
    <div
      className="overlay"
      style={{ alignItems: "flex-start", paddingTop: "13vh" }}
    >
      <div className="modal" style={{ width: 560 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 14px",
            borderBottom: "1px solid var(--b1)",
          }}
        >
          <Search size={14} style={{ color: "var(--t3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 13.5,
              color: "var(--t1)",
              fontFamily: "var(--f-ui)",
            }}
            placeholder="Search commands and files…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSel(0);
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: "2px 6px",
              background: "var(--s3)",
              border: "1px solid var(--b1)",
              borderRadius: "var(--r-sm)",
              color: "var(--t3)",
            }}
          >
            esc
          </kbd>
        </div>
        <div
          className="scroll"
          style={{ maxHeight: 340, overflowY: "auto", padding: "6px 8px" }}
        >
          {cmds.length > 0 && (
            <>
              <div
                style={{
                  padding: "4px 8px 5px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--t3)",
                }}
              >
                Commands
              </div>
              {cmds.map((item, i) => (
                <Item key={i} item={item} />
              ))}
            </>
          )}
          {fls.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 8px 5px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--t3)",
                  borderTop: cmds.length > 0 ? "1px solid var(--b0)" : "none",
                  marginTop: cmds.length > 0 ? 6 : 0,
                }}
              >
                Files
              </div>
              {fls.map((item, i) => (
                <Item key={i} item={item} />
              ))}
            </>
          )}
          {all.length === 0 && (
            <div
              style={{
                padding: "28px 0",
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--t3)",
              }}
            >
              No results for "{search}"
            </div>
          )}
        </div>
        <div
          style={{
            padding: "5px 14px",
            borderTop: "1px solid var(--b0)",
            display: "flex",
            gap: 14,
          }}
        >
          {[
            ["↑↓", "Navigate"],
            ["↵", "Select"],
            ["esc", "Close"],
          ].map(([k, l]) => (
            <span
              key={k}
              style={{
                fontSize: 10.5,
                color: "var(--t3)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <kbd
                style={{
                  fontSize: 9.5,
                  padding: "1px 4px",
                  background: "var(--s3)",
                  border: "1px solid var(--b1)",
                  borderRadius: 3,
                  fontFamily: "var(--f-mono)",
                }}
              >
                {k}
              </kbd>
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── FILE TREE ITEM ───────────────────────────────────────────────────────────
export const FileTreeItem = ({ item, level = 0, activePath, onFileClick }) => {
  const [open, setOpen] = useState(false);
  const isPy = item.name.endsWith(".py"),
    isEnv = item.name === ".env",
    isDir = item.kind === "directory";
  return (
    <div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          isDir ? setOpen(!open) : onFileClick(item);
        }}
        className={`tree-item si ${activePath === item.path ? "active" : ""}`}
        style={{ paddingLeft: level * 12 + 12 }}
      >
        {isDir ? (
          <>
            <ChevronRight
              size={11}
              className={`chevron ${open ? "open" : ""}`}
              style={{ color: "var(--t3)", flexShrink: 0 }}
            />
            <Folder
              size={12}
              style={{
                color: "var(--t3)",
                flexShrink: 0,
                transition: "color 100ms",
              }}
            />
          </>
        ) : (
          <>
            <div style={{ width: 11, flexShrink: 0 }} />
            {isPy ? (
              <FileCode size={12} style={{ color: "#4D8FCC", flexShrink: 0 }} />
            ) : isEnv ? (
              <Lock
                size={12}
                style={{ color: "var(--amber)", flexShrink: 0 }}
              />
            ) : (
              <FileType
                size={12}
                style={{ color: "var(--t3)", flexShrink: 0 }}
              />
            )}
          </>
        )}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12,
          }}
        >
          {item.name}
        </span>
      </div>
      {isDir &&
        open &&
        item.children?.map((c) => (
          <FileTreeItem
            key={c.path}
            item={c}
            level={level + 1}
            activePath={activePath}
            onFileClick={onFileClick}
          />
        ))}
    </div>
  );
};

// ─── MAGIC TOOLS SIDEBAR ─────────────────────────────────────────────────────
export const MagicToolsSidebar = ({ onAction, onClose }) => {
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState({
    "Server Boilerplates": true,
    Capabilities: true,
    Utilities: true,
  });

  const filtered = MAGIC_TOOLS_DATA.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) =>
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        i.desc.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="sidebar-r-in"
      style={{
        width: 280,
        background: "var(--s0)",
        borderLeft: "1px solid var(--b1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--b1)",
          background: "var(--s1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--t1)",
          }}
        >
          <Wand2
            size={13}
            style={{
              color: "var(--a)",
              animation: "breathe 3s ease-in-out infinite",
            }}
          />{" "}
          Magic Tools
        </div>
        <button
          className="ibtn focusable"
          onClick={onClose}
          style={{ width: 24, height: 24 }}
        >
          <X size={13} />
        </button>
      </div>
      <div style={{ padding: 9, borderBottom: "1px solid var(--b0)" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 9,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--t3)",
              pointerEvents: "none",
            }}
          />
          <input
            className="input focusable"
            style={{ width: "100%", padding: "5px 9px 5px 26px", fontSize: 12 }}
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 28,
              textAlign: "center",
              fontSize: 12,
              color: "var(--t3)",
              fontStyle: "italic",
            }}
          >
            No templates found
          </div>
        )}
        {filtered.map((group, gi) => (
          <div
            key={group.category}
            style={{ borderBottom: "1px solid var(--b0)" }}
          >
            <div
              className="sec-hdr"
              onClick={() =>
                setOpenCats((p) => ({
                  ...p,
                  [group.category]: !p[group.category],
                }))
              }
            >
              <span className="sec-label">{group.category}</span>
              <ChevronRight
                size={11}
                className={`chevron ${openCats[group.category] ? "open" : ""}`}
                style={{ color: "var(--t3)" }}
              />
            </div>
            {openCats[group.category] && (
              <div
                style={{
                  padding: "4px 7px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {group.items.map((tool, ti) => {
                  const b = BADGE_MAP[tool.tag];
                  return (
                    <div
                      key={tool.id}
                      onClick={() => onAction(tool)}
                      className="focusable"
                      style={{
                        padding: "7px 9px",
                        borderRadius: "var(--r-sm)",
                        cursor: "pointer",
                        border: "1px solid transparent",
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        transition:
                          "background 100ms, border-color 100ms, transform 120ms",
                        animation: `sidebarItem 200ms ease ${(gi * 3 + ti) * 30}ms both`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--s2)";
                        e.currentTarget.style.borderColor = "var(--b1)";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.transform = "";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            color: "var(--t2)",
                            flexShrink: 0,
                          }}
                        >
                          {tool.icon}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--t1)",
                          }}
                        >
                          {tool.label}
                        </span>
                        {b && (
                          <span
                            className="badge"
                            style={{
                              color: b.c,
                              background: b.bg,
                              borderColor: b.bdr,
                            }}
                          >
                            {tool.tag}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--t3)",
                          margin: 0,
                          paddingLeft: 20,
                          lineHeight: 1.45,
                        }}
                      >
                        {tool.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
