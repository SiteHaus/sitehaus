"use client";

import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { Bold, Heading1, Heading2, Heading3, Italic, Quote, Underline } from "lucide-react";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useMemo } from "react";

import { BlockquoteElement } from "./blockquote-node";
import { Editor, EditorContainer } from "./editor";
import { H1Element, H2Element, H3Element } from "./heading-node";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { FixedToolbar, ToolbarButton, ToolbarSeparator } from "./toolbar";

const EMPTY_VALUE: Value = [{ type: "p", children: [{ text: "" }] }];

function parseContent(content: string | null): Value {
  if (!content) return EMPTY_VALUE;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return EMPTY_VALUE;
  } catch {
    return EMPTY_VALUE;
  }
}

export function PlateEditor({
  initialContent,
  onChange,
  readOnly = false,
}: {
  initialContent: string | null;
  onChange?: (serialized: string) => void;
  readOnly?: boolean;
}) {
  const value = useMemo(() => parseContent(initialContent), [initialContent]);

  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      H1Plugin.withComponent(H1Element),
      H2Plugin.withComponent(H2Element),
      H3Plugin.withComponent(H3Element),
      BlockquotePlugin.withComponent(BlockquoteElement),
    ],
    value,
  });

  const tf = editor.tf as Record<string, { toggle?: () => void }>;

  return (
    <Plate
      editor={editor}
      readOnly={readOnly}
      onChange={({ value }) => {
        if (onChange) {
          onChange(JSON.stringify(value));
        }
      }}
    >
      {!readOnly && (
        <FixedToolbar>
          <ToolbarButton onClick={() => tf.h1?.toggle?.()}>
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => tf.h2?.toggle?.()}>
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => tf.h3?.toggle?.()}>
            <Heading3 className="size-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          <MarkToolbarButton nodeType="bold">
            <Bold className="size-4" />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="italic">
            <Italic className="size-4" />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="underline">
            <Underline className="size-4" />
          </MarkToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton onClick={() => tf.blockquote?.toggle?.()}>
            <Quote className="size-4" />
          </ToolbarButton>
        </FixedToolbar>
      )}

      <EditorContainer>
        <Editor placeholder="Start writing your design document..." readOnly={readOnly} />
      </EditorContainer>
    </Plate>
  );
}
