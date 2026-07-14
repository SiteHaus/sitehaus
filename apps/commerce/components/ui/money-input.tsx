"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@site-haus/ui/components/base/input-group";
import { cn } from "@site-haus/ui/lib/utils";

type Props = {
  cents: number | null;
  onChange: (cents: number | null) => void;
  /** Compare-at can legitimately be empty ("not on sale"); a price cannot. */
  nullable?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

/** Anything you could be part-way through typing: "", "3", "3.", ".5", "12.99". */
const PARTIAL = /^\d*\.?\d{0,2}$/;

/**
 * A money field you can actually type into.
 *
 * The naive version — `<Input type="number" value={formatCents(cents)}>` — re-formats to
 * two decimals on every keystroke, so the caret is yanked to the end and each digit lands
 * inside the *old* value ("30.00" + "5" = "30.005"). Select-all-and-retype was the only
 * way to enter a price. `type="number"` also brings a spinner that silently increments on
 * scroll and arrow keys.
 *
 * So: hold the raw string while the field is focused and only reformat on blur. The parsed
 * value still propagates on every keystroke, so nothing downstream needs to know.
 */
export function MoneyInput({
  cents,
  onChange,
  nullable = false,
  placeholder,
  className,
  ...rest
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  // draft === null means "not being edited" — show the canonical formatting.
  const display = draft ?? (cents === null ? "" : formatCents(cents));

  function handleChange(raw: string) {
    // Reject junk outright rather than parsing it: an ignored keystroke leaves the caret
    // where it was, which is far less hostile than snapping the value back.
    if (!PARTIAL.test(raw)) return;
    setDraft(raw);

    if (raw === "" || raw === ".") {
      onChange(nullable ? null : 0);
      return;
    }
    const parsed = Math.round(parseFloat(raw) * 100);
    onChange(Number.isFinite(parsed) ? parsed : nullable ? null : 0);
  }

  return (
    <InputGroup className={cn("h-8", className)}>
      {/* Default addon padding is sized for a h-9 group; zero it out so the $ isn't
          fighting for vertical room at h-8. */}
      <InputGroupAddon className="py-0">$</InputGroupAddon>
      <InputGroupInput
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setDraft(null)}
        {...rest}
      />
    </InputGroup>
  );
}
