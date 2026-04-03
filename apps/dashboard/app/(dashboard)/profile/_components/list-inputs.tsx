import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Plus, Trash2, X } from "lucide-react";

// ── Color Picker ──────────────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value.map((color, i) => (
        <div key={i} className="group relative">
          <label
            className="block h-9 w-9 cursor-pointer rounded-full border-2 border-background shadow ring-2 ring-border transition-all hover:ring-primary"
            style={{ backgroundColor: color }}
            title={color}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-destructive group-hover:flex"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}

      {/* Add new color */}
      <label
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        title="Add color"
      >
        <Plus className="h-4 w-4" />
        <input
          type="color"
          defaultValue="#000000"
          className="sr-only"
          onChange={(e) => onChange([...value, e.target.value])}
        />
      </label>

      {/* Hex values below */}
      {value.length > 0 && (
        <div className="w-full flex flex-wrap gap-x-3 gap-y-1">
          {value.map((color, i) => (
            <span key={i} className="font-mono text-xs text-muted-foreground">
              {color}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── String List ───────────────────────────────────────────────────────────────

interface StringListProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}

function removeAt(arr: string[], i: number) {
  return arr.filter((_, j) => j !== i);
}

function setAt(arr: string[], i: number, val: string) {
  const next = [...arr];
  next[i] = val;
  return next;
}

export function StringList({ value, onChange, placeholder, addLabel }: StringListProps) {
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => onChange(setAt(value, i, e.target.value))}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(removeAt(value, i))}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
