"use client";

import { useEditorRef, useEditorSelector } from "platejs/react";
import * as React from "react";
import { ToolbarButton } from "./toolbar";

export function MarkToolbarButton({
  nodeType,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ToolbarButton>, "active" | "onClick"> & {
  nodeType: string;
}) {
  const editor = useEditorRef();
  const active = useEditorSelector(
    (ed) => {
      const getMarks = (ed as unknown as { getMarks: () => Record<string, unknown> | null })
        .getMarks;
      const marks = getMarks?.();
      return marks ? !!marks[nodeType] : false;
    },
    [nodeType],
  );

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        const tf = editor.tf as Record<string, { toggle?: () => void }>;
        tf[nodeType]?.toggle?.();
        editor.tf.focus();
      }}
      {...props}
    >
      {children}
    </ToolbarButton>
  );
}
