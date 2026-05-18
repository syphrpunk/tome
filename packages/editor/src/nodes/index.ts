/**
 * Tome custom Tiptap node extensions for MDX components.
 * Import `tomeNodes` and spread into your Tiptap extensions array.
 */

export { AccordionNode } from "./AccordionNode.js";
export { CalloutNode } from "./CalloutNode.js";
export { CardGroupNode, CardNode } from "./CardNode.js";
export { CodeBlockNode } from "./CodeBlockNode.js";
export { FileTreeItemNode, FileTreeNode } from "./FileTreeNode.js";
export { LinkCardNode } from "./LinkCardNode.js";
export { PackageManagerNode } from "./PackageManagerNode.js";
export { SnippetNode } from "./SnippetNode.js";
export { StepNode, StepsNode } from "./StepsNode.js";
export { TabNode, TabsNode } from "./TabsNode.js";
export { TypeTableNode } from "./TypeTableNode.js";

import { AccordionNode } from "./AccordionNode.js";
import { CalloutNode } from "./CalloutNode.js";
import { CardGroupNode, CardNode } from "./CardNode.js";
import { CodeBlockNode } from "./CodeBlockNode.js";
import { FileTreeItemNode, FileTreeNode } from "./FileTreeNode.js";
import { LinkCardNode } from "./LinkCardNode.js";
import { PackageManagerNode } from "./PackageManagerNode.js";
import { SnippetNode } from "./SnippetNode.js";
import { StepNode, StepsNode } from "./StepsNode.js";
import { TabNode, TabsNode } from "./TabsNode.js";
import { TypeTableNode } from "./TypeTableNode.js";

/** All Tome custom nodes as an array — spread into Tiptap extensions. */
export const tomeNodes = [
  CalloutNode,
  TabsNode,
  TabNode,
  CardNode,
  CardGroupNode,
  StepsNode,
  StepNode,
  AccordionNode,
  CodeBlockNode,
  FileTreeNode,
  FileTreeItemNode,
  PackageManagerNode,
  TypeTableNode,
  LinkCardNode,
  SnippetNode,
];
