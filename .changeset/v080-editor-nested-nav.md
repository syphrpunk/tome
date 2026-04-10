---
"@tomehq/core": minor
"@tomehq/cli": minor
"@tomehq/theme": minor
"@tomehq/components": minor
"@tomehq/editor": minor
---

v0.8.0 — WYSIWYG editor, nested sidebar navigation, security patches

Editor:
- New `@tomehq/editor` package — Tiptap-based WYSIWYG editor for MDX content
- MDX component nodes (Callout, Tabs, Steps, CodeBlock, FileTree, Cards, etc.)
- Slash commands and keyboard shortcuts for inserting components
- Markdown serializer for round-tripping between editor and source files
- Content sanitizer that strips dangerous patterns before SSR
- Dashboard integration with GitHub sync for committing edits directly

Core:
- Nested navigation groups — `navigation` config now supports arbitrarily deep `{ group, pages }` nesting within groups
- Recursive `resolvePages` in `buildNavigation()` walks nested config entries
- `flattenNavItems` helper for prev/next across nested boundaries
- Frontmatter YAML string escaping fix (backslash handling)

Theme:
- Recursive sidebar rendering for nested navigation groups
- Collapsible sub-sections with distinct styling (uppercase headers, code font)
- Breadcrumb and expanded-state support for nested pages

Security:
- 16 Dependabot vulnerability patches across 5 packages
- pnpm overrides for vite (>=6.0.0 <6.4.2) and @hono/node-server (<1.19.13)
