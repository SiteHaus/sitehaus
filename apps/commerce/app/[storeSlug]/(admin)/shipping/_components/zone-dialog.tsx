"use client";

import {
  createShippingZone,
  deleteShippingZone,
  type ShippingZone,
  updateShippingZone,
} from "@/lib/commerce";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@site-haus/ui/components/base/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Popover, PopoverContent, PopoverTrigger } from "@site-haus/ui/components/base/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { COUNTRIES, countryName } from "./countries";

type Props = {
  open: boolean;
  onClose: () => void;
  zone?: ShippingZone;
};

export function ZoneDialog({ open, onClose, zone }: Props) {
  const qc = useQueryClient();
  const isEdit = !!zone;

  const [name, setName] = useState(zone?.name ?? "");
  const [countries, setCountries] = useState<string[]>(zone?.countries ?? []);
  const [countryOpen, setCountryOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function reset() {
    setName(zone?.name ?? "");
    setCountries(zone?.countries ?? []);
    setDeleteConfirm(false);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateShippingZone(zone.id, { name, countries })
        : createShippingZone({ name, countries }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast.success(isEdit ? "Zone updated" : "Zone created");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteShippingZone(zone!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast.success("Zone deleted");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleCountry(code: string) {
    setCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function removeCountry(code: string) {
    setCountries((prev) => prev.filter((c) => c !== code));
  }

  const canSave = name.trim().length > 0 && countries.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Zone" : "New Shipping Zone"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="zone-name">Zone name</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. United States, Europe"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Countries</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {countries.length === 0
                    ? "Select countries…"
                    : `${countries.length} countr${countries.length === 1 ? "y" : "ies"} selected`}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search countries…" />
                  <CommandList className="max-h-56">
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES.map((c) => (
                        <CommandItem
                          key={c.code}
                          value={`${c.name} ${c.code}`}
                          onSelect={() => toggleCountry(c.code)}
                        >
                          <Check
                            className={`mr-2 size-4 ${countries.includes(c.code) ? "opacity-100" : "opacity-0"}`}
                          />
                          {c.name} ({c.code})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {countries.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {countries.map((code) => (
                  <Badge key={code} variant="secondary" className="gap-1">
                    {countryName(code)} ({code})
                    <button
                      type="button"
                      onClick={() => removeCountry(code)}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {isEdit && zone.rates.length > 0 && !deleteConfirm && (
            <p className="text-xs text-muted-foreground">
              This zone has {zone.rates.length} rate{zone.rates.length !== 1 ? "s" : ""}. Deleting
              it will remove all rates too.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEdit && !deleteConfirm && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete zone
            </Button>
          )}
          {isEdit && deleteConfirm && (
            <div className="flex items-center gap-2 sm:mr-auto">
              <span className="text-sm text-destructive">Delete this zone?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                Yes, delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          )}
          {!deleteConfirm && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save" : "Create"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
