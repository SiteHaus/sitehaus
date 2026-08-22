"use client";

import { setOriginAddress, type OriginAddress } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  address?: OriginAddress | null;
};

export function OriginAddressDialog({ open, onClose, address }: Props) {
  const qc = useQueryClient();

  const [name, setName] = useState(address?.originName ?? "");
  const [line1, setLine1] = useState(address?.originLine1 ?? "");
  const [line2, setLine2] = useState(address?.originLine2 ?? "");
  const [city, setCity] = useState(address?.originCity ?? "");
  const [state, setState] = useState(address?.originState ?? "");
  const [zip, setZip] = useState(address?.originZip ?? "");
  const [country, setCountry] = useState(address?.originCountry ?? "US");

  function reset() {
    setName(address?.originName ?? "");
    setLine1(address?.originLine1 ?? "");
    setLine2(address?.originLine2 ?? "");
    setCity(address?.originCity ?? "");
    setState(address?.originState ?? "");
    setZip(address?.originZip ?? "");
    setCountry(address?.originCountry ?? "US");
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      setOriginAddress({
        originName: name,
        originLine1: line1,
        originLine2: line2 || null,
        originCity: city,
        originState: state,
        originZip: zip,
        originCountry: country.toUpperCase(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-origin"] });
      toast.success("Ship-from address saved");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSave =
    name.trim().length > 0 &&
    line1.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    zip.trim().length > 0 &&
    country.trim().length === 2;

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
          <DialogTitle>Ship-From Address</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="origin-name">Name / business name</Label>
            <Input
              id="origin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Co."
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="origin-line1">Address line 1</Label>
            <Input
              id="origin-line1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="123 Main St"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="origin-line2">Address line 2 (optional)</Label>
            <Input
              id="origin-line2"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              placeholder="Suite 100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="origin-city">City</Label>
              <Input id="origin-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origin-state">State</Label>
              <Input id="origin-state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="origin-zip">ZIP / postal code</Label>
              <Input id="origin-zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origin-country">Country</Label>
              <Input
                id="origin-country"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="US"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
