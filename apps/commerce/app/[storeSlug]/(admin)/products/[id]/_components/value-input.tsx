"use client";

import { useRef, useState } from "react";
import { suggestionsFor } from "@/lib/value-suggestions";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@site-haus/ui/components/base/input-group";
import { Kbd } from "@site-haus/ui/components/base/kbd";
import { Popover, PopoverAnchor, PopoverContent } from "@site-haus/ui/components/base/popover";
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
 * Deliberately NOT a combobox you open and close: adding S/M/L/XL that way is four
 * open-close cycles, and for a dimension we have no suggestions for (Count, Grind) the
 * popover is a floating panel containing nothing but a text field. This stays put, keeps
 * focus after every add, and degrades to a plain text box when there's nothing to suggest.
 *
 * The suggestion list IS rendered through a popover — but only for its portal. `Card` sets
 * `overflow-hidden`, so an absolutely-positioned list inside one gets guillotined at the
 * card's edge. Focus is explicitly kept in the input so the popover never behaves like a
 * dialog: you keep typing, arrow keys still reach our handler.
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
  const canCommit = trimmed.length > 0 && !isDuplicate;

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
    <div>
      <Popover open={showSuggestions}>
        <PopoverAnchor asChild>
          <InputGroup className="h-7">
            <InputGroupInput
              ref={inputRef}
              className="text-sm"
              value={query}
              placeholder={`Add a ${singular}…`}
              aria-label={`Add a ${singular}`}
              aria-invalid={isDuplicate}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={onKeyDown}
            />
            {canCommit && (
              <InputGroupAddon align="inline-end">
                <Kbd>Enter</Kbd>
              </InputGroupAddon>
            )}
          </InputGroup>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-1"
          // Keep the caret in the input: without this the popover grabs focus on open and
          // the whole thing turns into the dialog we were trying to get away from.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {matches.map((s, i) => (
            <button
              key={s}
              type="button"
              // Blur would tear the list down before the click landed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "block w-full rounded-sm px-2 py-1.5 text-left text-sm",
                i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              {s}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {isDuplicate && (
        <p className="mt-1 text-xs font-medium text-destructive">{trimmed} is already added.</p>
      )}
    </div>
  );
}
