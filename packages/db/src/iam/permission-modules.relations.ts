import { relations } from "drizzle-orm";
import { clientModulesTable } from "./client-modules.js";
import { permissionModulesTable } from "./permission-modules.js";
import { permissionsCatalogTable } from "./roles.js";

export const permissionModulesRelations = relations(permissionModulesTable, ({ many }) => ({
  clientModules: many(clientModulesTable),
  permissions: many(permissionsCatalogTable),
}));
