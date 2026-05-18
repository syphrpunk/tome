/**
 * Editor toolbar — formatting buttons for the Tiptap editor.
 * Styled to match Tome dashboard design tokens.
 */

import type { Editor } from "@tiptap/react";
import type React from "react";

interface ToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        background: active ? "var(--coralD, rgba(139,58,47,0.1))" : "none",
        border: "1px solid transparent",
        borderRadius: 4,
        padding: "4px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: active ? "var(--coral, #8b3a2f)" : "var(--txM, #696360)",
        fontSize: 13,
        fontFamily: "Inter, sans-serif",
        fontWeight: active ? 600 : 400,
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 4,
        minWidth: 28,
        justifyContent: "center",
      }}
      title={title}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: "var(--bd, #ddd9d0)",
        margin: "0 4px",
      }}
    />
  );
}

export function EditorToolbar({ editor }: ToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "8px 12px",
        borderBottom: "1px solid var(--bd, #ddd9d0)",
        background: "var(--sf, #ffffff)",
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Text formatting */}
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Cmd+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Cmd+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code (Cmd+E)"
      >
        <code style={{ fontSize: 11 }}>&lt;/&gt;</code>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      {([1, 2, 3, 4] as const).map((level) => (
        <ToolbarButton
          active={editor.isActive("heading", { level })}
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          title={`Heading ${level}`}
        >
          H{level}
        </ToolbarButton>
      ))}

      <Divider />

      {/* Lists */}
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        &bull;
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        1.
      </ToolbarButton>

      <Divider />

      {/* Blocks */}
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        &ldquo;
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        &#8212;
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={() => {
          const url = window.prompt("Link URL:");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        title="Add link"
      >
        &#128279;
      </ToolbarButton>

      <Divider />

      {/* Undo/Redo */}
      <ToolbarButton
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo (Cmd+Z)"
      >
        &#8617;
      </ToolbarButton>
      <ToolbarButton
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo (Cmd+Shift+Z)"
      >
        &#8618;
      </ToolbarButton>
    </div>
  );
}
