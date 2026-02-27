"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@site-haus/ui/components/base/tabs";
import { Building2, Users } from "lucide-react";
import { CompanyTab } from "./company-tab";
import { TeamTab } from "./team-tab";

export function SettingsView() {
  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your workspace and team.
        </p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Company
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <CompanyTab />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
