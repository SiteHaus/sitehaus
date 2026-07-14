"use client";

import { useState } from "react";
import { suggestionsFor } from "@/lib/value-suggestions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@site-haus/ui/components/base/command";
import { Popover, PopoverContent, PopoverTrigger } from "@site-haus/ui/components/base/popover";
import { Plus } from "lucide-react";

type Props = {
  dimensionName: string;
  /** Values already on this dimension — never offer or accept a duplicate. */
  existing: string[];
  onAdd: (value: string) => void;
};

/**
 * Creatable combobox for adding a value ("M", "Teal", "120 Capsules").
 *
 * Suggestions are a shortcut, never a constraint: anything you type can be added, and a
 * dimension we have no list for just behaves like a plain text field.
 */
export function ValueCombobox({ dimensionName, existing, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const singular = (dimensionName.trim() || "value").toLowerCase();
  const taken = new Set(existing.map((v) => v.toLowerCase()));
  const suggestions = suggestionsFor(dimensionName).filter((s) => !taken.has(s.toLowerCase()));

  const trimmed = query.trim();
  const isDuplicate = taken.has(trimmed.toLowerCase());
  const matchesSuggestion = suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !isDuplicate && !matchesSuggestion;

  function add(value: string) {
    onAdd(value);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3" />
          add a {singular}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Add a ${singular}…`} value={query} onValueChange={setQuery} />
          <CommandList>
            {suggestions.length > 0 && (
              <CommandGroup heading="Common">
                {suggestions.map((s) => (
                  <CommandItem key={s} value={s} onSelect={() => add(s)}>
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreate && (
              <CommandGroup>
                {/* cmdk filters items against the query, and this item's value IS the
                    query — so it always survives the filter. */}
                <CommandItem value={trimmed} onSelect={() => add(trimmed)}>
                  Add &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>
              {isDuplicate ? `${trimmed} is already added.` : `Type to add a ${singular}.`}
            </CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
