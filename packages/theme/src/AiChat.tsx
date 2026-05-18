import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── TYPES ────────────────────────────────────────────────
export interface AiChatProps {
  apiKey?: string;
  context?: string; // serialized doc context for RAG
  model?: string;
  provider: "openai" | "anthropic" | "custom";
}

interface Message {
  content: string;
  role: "user" | "assistant";
}

// ── ICONS ────────────────────────────────────────────────
const ChatIcon = () => (
  <svg
    fill="none"
    height={22}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width={22}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    fill="none"
    height={18}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width={18}
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg
    fill="none"
    height={16}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={16}
  >
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
  </svg>
);

// ── API HELPERS (shared with AI search) ─────────────────
import {
  type AiMessage,
  buildSystemPrompt,
  callAnthropic,
  callOpenAI,
  getDefaultModel,
} from "./ai-api.js";

// ── COMPONENT ───────────────────────────────────────────
export function AiChat({ provider, model, apiKey, context }: AiChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedKey =
    apiKey ||
    (typeof window === "undefined"
      ? undefined
      : (window as any).__TOME_AI_API_KEY__);
  const resolvedModel = model || getDefaultModel(provider);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }
    if (!resolvedKey) {
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      let response: string;
      const sysPrompt = buildSystemPrompt(context);
      if (provider === "openai") {
        response = await callOpenAI(
          updatedMessages as AiMessage[],
          resolvedKey,
          resolvedModel,
          sysPrompt
        );
      } else {
        response = await callAnthropic(
          updatedMessages as AiMessage[],
          resolvedKey,
          resolvedModel,
          sysPrompt
        );
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider, resolvedKey, resolvedModel, context]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Floating button (closed state) ─────────────────────
  if (!open) {
    return (
      <button
        aria-label="Open AI chat"
        data-testid="ai-chat-button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 900,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--ac)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          transition: "transform 0.15s",
        }}
      >
        <ChatIcon />
      </button>
    );
  }

  // ── Chat panel (open state) ────────────────────────────
  return (
    <div
      data-testid="ai-chat-panel"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 900,
        width: 380,
        maxWidth: "calc(100vw - 48px)",
        height: 520,
        maxHeight: "calc(100vh - 48px)",
        background: "var(--sf)",
        border: "1px solid var(--bd)",
        borderRadius: 12,
        boxShadow: "0 16px 64px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--bd)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--tx)",
          }}
        >
          Ask AI
        </span>
        <button
          aria-label="Close AI chat"
          data-testid="ai-chat-close"
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "var(--txM)",
            cursor: "pointer",
            display: "flex",
            padding: 4,
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 16px",
        }}
      >
        {!resolvedKey && (
          <div
            data-testid="ai-chat-no-key"
            style={{
              textAlign: "center",
              color: "var(--txM)",
              fontSize: 13,
              padding: "24px 8px",
              lineHeight: 1.6,
            }}
          >
            <p style={{ marginBottom: 8, fontWeight: 500, color: "var(--tx)" }}>
              AI not configured
            </p>
            <p style={{ marginBottom: 8 }}>
              To enable AI chat, set the{" "}
              <code
                style={{
                  fontFamily: "var(--font-code)",
                  fontSize: "0.88em",
                  background: "var(--cdBg)",
                  padding: "0.15em 0.4em",
                  borderRadius: 4,
                }}
              >
                apiKeyEnv
              </code>{" "}
              in{" "}
              <code
                style={{
                  fontFamily: "var(--font-code)",
                  fontSize: "0.88em",
                  background: "var(--cdBg)",
                  padding: "0.15em 0.4em",
                  borderRadius: 4,
                }}
              >
                tome.config.js
              </code>{" "}
              and provide the environment variable at build time.
            </p>
            <p style={{ fontSize: 11.5, color: "var(--txM)" }}>
              Example:{" "}
              <code
                style={{
                  fontFamily: "var(--font-code)",
                  fontSize: "0.88em",
                  background: "var(--cdBg)",
                  padding: "0.15em 0.4em",
                  borderRadius: 4,
                }}
              >
                TOME_AI_KEY=sk-... tome build
              </code>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            data-testid={`ai-chat-message-${msg.role}`}
            key={i}
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: msg.role === "user" ? "var(--ac)" : "var(--cdBg)",
                color: msg.role === "user" ? "#fff" : "var(--tx)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div
            data-testid="ai-chat-loading"
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 13,
                background: "var(--cdBg)",
                color: "var(--txM)",
              }}
            >
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div
            data-testid="ai-chat-error"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              background: "rgba(220,50,50,0.1)",
              color: "#d44",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderTop: "1px solid var(--bd)",
          flexShrink: 0,
        }}
      >
        <input
          data-testid="ai-chat-input"
          disabled={!resolvedKey}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedKey ? "Ask a question..." : "API key required"}
          ref={inputRef}
          style={{
            flex: 1,
            background: "var(--cdBg)",
            border: "1px solid var(--bd)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--tx)",
            fontSize: 13,
            fontFamily: "var(--font-body)",
            outline: "none",
          }}
          value={input}
        />
        <button
          aria-label="Send message"
          data-testid="ai-chat-send"
          disabled={!(resolvedKey && input.trim()) || loading}
          onClick={sendMessage}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background:
              resolvedKey && input.trim() ? "var(--ac)" : "var(--cdBg)",
            color: resolvedKey && input.trim() ? "#fff" : "var(--txM)",
            border: "none",
            cursor: resolvedKey && input.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

export default AiChat;
