"use client";

import { useStoreNav } from "@/lib/use-store-nav";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function LowStockAlerts() {
  const { push } = useStoreNav();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          Inventory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
          <p className="text-sm text-muted-foreground">
            View your full inventory to check stock levels and adjust quantities.
          </p>
          <Button variant="outline" size="sm" onClick={() => push("/inventory")}>
            Go to Inventory
            <ArrowRight className="size-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
