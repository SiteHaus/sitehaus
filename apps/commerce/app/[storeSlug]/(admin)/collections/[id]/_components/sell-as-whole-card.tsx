"use client";

import { MoneyInput } from "@/components/ui/money-input";
import { SectionCard } from "@/components/ui/section-card";
import { Label } from "@site-haus/ui/components/base/label";
import { Switch } from "@site-haus/ui/components/base/switch";

type Props = {
  sellAsWhole: boolean;
  priceCents: number | null;
  onChange: (next: { sellAsWhole: boolean; priceCents: number | null }) => void;
};

/**
 * "Sell as whole": the collection is sold only as one bundle at its own price,
 * and the products in it can't be bought individually on any storefront.
 * The API enforces both; this card only edits the two fields.
 */
export function SellAsWholeCard({ sellAsWhole, priceCents, onChange }: Props) {
  const missingPrice = sellAsWhole && !priceCents;

  return (
    <SectionCard title="Selling">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="sell-as-whole">Sell as whole</Label>
            <p className="text-xs text-muted-foreground">
              Customers buy the entire collection at one price. Its products can&apos;t be bought on
              their own while this is on.
            </p>
          </div>
          <Switch
            id="sell-as-whole"
            checked={sellAsWhole}
            onCheckedChange={(checked) => onChange({ sellAsWhole: checked, priceCents })}
          />
        </div>

        {sellAsWhole && (
          <div className="space-y-1.5">
            <Label>Collection price</Label>
            <MoneyInput
              aria-label="Collection price"
              cents={priceCents}
              nullable
              placeholder="0.00"
              className="max-w-40"
              onChange={(cents) => onChange({ sellAsWhole, priceCents: cents })}
            />
            {missingPrice && (
              <p className="text-xs text-destructive">
                Set a price to sell this collection as a whole.
              </p>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
