"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { cn } from "@site-haus/ui/lib/utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyButtonProps {
  value: string;
  label: string;
  size?: "sm" | "default";
  className?: string;
}

export function CopyButton({
  value,
  label,
  size = "sm",
  className,
}: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        size === "sm" ? "h-6 w-6 p-0" : "h-8 w-8 p-0",
        className
      )}
      onClick={handleCopy}
    >
      <Copy className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
    </Button>
  );
}
