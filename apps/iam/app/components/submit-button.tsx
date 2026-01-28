"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { cn } from "@site-haus/ui/lib/utils";

interface SubmitButtonProps {
  isSubmitting: boolean;
  label: string;
  loadingLabel?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  icon?: React.ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}

export function SubmitButton({
  isSubmitting,
  label,
  loadingLabel,
  variant,
  className,
  icon,
  type = "submit",
  onClick,
  disabled,
}: SubmitButtonProps) {
  const displayLoadingLabel = loadingLabel ?? `${label}...`;

  return (
    <Button
      type={type}
      variant={variant}
      className={cn(className)}
      disabled={isSubmitting || disabled}
      onClick={onClick}
    >
      {isSubmitting ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          {displayLoadingLabel}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </>
      )}
    </Button>
  );
}
