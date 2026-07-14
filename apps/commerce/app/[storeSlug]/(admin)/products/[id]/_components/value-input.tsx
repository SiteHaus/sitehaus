"use client";

import { useRef, useState } from "react";
import { suggestionsFor } from "@/lib/value-suggestions";
import { Input } from "@site-haus/ui/components/base/input";
import { cn } from "@site-haus/ui/lib/utils";

type Props = {
  dimensionName: string;
  /** Values already on this dimension — never offer or accept a duplicate. */
  existing: string[];
  onAdd: (value: string) => void;
  /** Backspace on an empty field removes the last badge. */
  onRemoveLast: () => void;
};

/**
 * Type a value, press Enter, get a badge. Repeat.
 *
 * Deliberately NOT a combobox in a popover: adding S/M/L/XL through one of those means
 * four open-close cycles, and for a dimension we have no suggestions for (Count, Grind)
 * the popover is a floating panel containing nothing but a text field. A token input
 * stays put, keeps focus after every add, and degrades to a plain text box when there's
 * nothing to suggest.
 */
export function ValueInput({ dimensionName, existing, onAdd, onRemoveLast }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const singular = (dimensionName.trim() || "value").toLowerCase();
  const taken = new Set(existing.map((v) => v.toLowerCase()));
  const trimmed = query.trim();
  const isDuplicate = taken.has(trimmed.toLowerCase());

  const matches = suggestionsFor(dimensionName)
    .filter((s) => !taken.has(s.toLowerCase()))
    .filter((s) => s.toLowerCase().includes(trimmed.toLowerCase()));
  const showSuggestions = focused && matches.length > 0;

  function commit(value: string) {
    const v = value.trim();
    if (!v || taken.has(v.toLowerCase())) return;
    onAdd(v);
    setQuery("");
    setActive(-1);
    inputRef.current?.focus(); // stay put — the next value is usually right behind this one
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(active >= 0 && matches[active] ? matches[active] : trimmed);
      return;
    }
    if (e.key === "ArrowDown" && matches.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
      return;
    }
    if (e.key === "ArrowUp" && matches.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
      return;
    }
    if (e.key === "Escape") {
      setQuery("");
      setActive(-1);
      return;
    }
    // Nothing typed yet -> backspace reaches back and takes the last badge.
    if (e.key === "Backspace" && query === "") onRemoveLast();
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        className="h-7 text-sm"
        value={query}
        placeholder={`Add a ${singular} — press Enter`}
        aria-label={`Add a ${singular}`}
        aria-invalid={isDuplicate}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onFocus={() => setFocused(true)}
        // Delayed so a click on a suggestion lands before the list unmounts.
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={onKeyDown}
      />

      {isDuplicate && (
        <p className="mt-1 text-xs font-medium text-destructive">{trimmed} is already added.</p>
      )}

      {showSuggestions && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {matches.map((s, i) => (
            <button
              key={s}
              type="button"
              // Keep focus in the input: blur would tear the list down mid-click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "block w-full px-2 py-1.5 text-left text-sm",
                i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
