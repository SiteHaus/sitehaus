import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, schema, type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class ModulesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** List all modules with enabled status for a client */
  async listModules(clientId: string) {
    const modules = await this.db.query.permissionModulesTable.findMany({
      orderBy: (t, { asc }) => [asc(t.key)],
    });

    const clientModules = await this.db.query.clientModulesTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.clientId, clientId),
    });

    const enabledMap = new Map(
      clientModules.map((cm) => [cm.moduleId, cm.enabled]),
    );

    return modules.map((mod) => ({
      id: mod.id,
      key: mod.key,
      name: mod.name,
      description: mod.description,
      isCore: mod.isCore,
      enabled: mod.isCore || (enabledMap.get(mod.id) ?? false),
    }));
  }

  /** Get a module by ID */
  async getModuleById(moduleId: string) {
    const mod = await this.db.query.permissionModulesTable.findFirst({
      where: (t, { eq: _eq }) => _eq(t.id, moduleId),
    });

    if (!mod) throw new NotFoundException('Module not found');
    return mod;
  }

  /** Get permissions for a specific module */
  async getModulePermissions(moduleId: string) {
    const mod = await this.getModuleById(moduleId);

    const perms = await this.db.query.permissionsCatalogTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.moduleId, moduleId),
      orderBy: (t, { asc }) => [asc(t.perm)],
    });

    return {
      module: {
        id: mod.id,
        key: mod.key,
        name: mod.name,
      },
      permissions: perms.map((p) => ({
        perm: p.perm,
        description: p.description,
      })),
    };
  }

  /** Check if a module is enabled for a client */
  async isModuleEnabled(clientId: string, moduleId: string): Promise<boolean> {
    const mod = await this.getModuleById(moduleId);

    // Core modules are always enabled
    if (mod.isCore) return true;

    const cm = await this.db.query.clientModulesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.clientId, clientId), _eq(t.moduleId, moduleId)),
    });

    return cm?.enabled ?? false;
  }

  /** Get enabled module IDs for a client */
  async getEnabledModuleIds(clientId: string): Promise<Set<string>> {
    // Get all core modules (always enabled)
    const coreModules = await this.db.query.permissionModulesTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.isCore, true),
      columns: { id: true },
    });

    const coreIds = new Set(coreModules.map((m) => m.id));

    // Get explicitly enabled modules
    const clientModules = await this.db.query.clientModulesTable.findMany({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.clientId, clientId), _eq(t.enabled, true)),
      columns: { moduleId: true },
    });

    const enabledIds = new Set([
      ...coreIds,
      ...clientModules.map((cm) => cm.moduleId),
    ]);

    return enabledIds;
  }

  /** Enable a module for a client */
  async enableModule(clientId: string, moduleId: string, enabledBy?: string) {
    const mod = await this.getModuleById(moduleId);

    if (mod.isCore) {
      throw new BadRequestException('Core modules are always enabled');
    }

    const [cm] = await this.db
      .insert(schema.clientModulesTable)
      .values({
        clientId,
        moduleId,
        enabled: true,
        enabledBy,
        enabledAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          schema.clientModulesTable.clientId,
          schema.clientModulesTable.moduleId,
        ],
        set: {
          enabled: true,
          enabledBy,
          enabledAt: new Date(),
        },
      })
      .returning();

    return cm;
  }

  /** Disable a module for a client */
  async disableModule(clientId: string, moduleId: string) {
    const mod = await this.getModuleById(moduleId);

    if (mod.isCore) {
      throw new BadRequestException('Core modules cannot be disabled');
    }

    // Check if any roles have permissions from this module
    const permsInModule = await this.db.query.permissionsCatalogTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.moduleId, moduleId),
      columns: { perm: true },
    });

    if (permsInModule.length > 0) {
      const permStrings = permsInModule.map((p) => p.perm);

      // Get all roles for this client
      const roles = await this.db.query.rolesTable.findMany({
        where: (t, { eq: _eq }) => _eq(t.clientId, clientId),
        columns: { id: true, name: true },
      });

      if (roles.length > 0) {
        // Check if any of these roles have permissions from this module
        const rolePermsInUse = await this.db.query.rolePermissionsTable.findMany(
          {
            where: (t, { and: _and, inArray: _in }) =>
              _and(
                _in(
                  t.roleId,
                  roles.map((r) => r.id),
                ),
                _in(t.perm, permStrings),
              ),
            columns: { roleId: true, perm: true },
          },
        );

        if (rolePermsInUse.length > 0) {
          const affectedRoleIds = [...new Set(rolePermsInUse.map((rp) => rp.roleId))];
          const affectedRoles = roles.filter((r) =>
            affectedRoleIds.includes(r.id),
          );

          throw new BadRequestException(
            `Cannot disable module: permissions are in use by roles: ${affectedRoles.map((r) => r.name).join(', ')}. Remove these permissions first.`,
          );
        }
      }
    }

    await this.db
      .update(schema.clientModulesTable)
      .set({ enabled: false })
      .where(
        and(
          eq(schema.clientModulesTable.clientId, clientId),
          eq(schema.clientModulesTable.moduleId, moduleId),
        ),
      );

    return { ok: true as const };
  }

  /** Validate that all permissions belong to enabled modules for a client */
  async validatePermissionsForClient(
    clientId: string,
    perms: string[],
  ): Promise<{ valid: boolean; invalidPerms: string[] }> {
    if (!perms.length) return { valid: true, invalidPerms: [] };

    const enabledModuleIds = await this.getEnabledModuleIds(clientId);

    // Get module IDs for the requested permissions
    const permCatalog = await this.db.query.permissionsCatalogTable.findMany({
      where: (t, { inArray: _in }) => _in(t.perm, perms),
      columns: { perm: true, moduleId: true },
    });

    const invalidPerms: string[] = [];

    for (const p of perms) {
      const catalogEntry = permCatalog.find((c) => c.perm === p);
      if (!catalogEntry) {
        // Permission doesn't exist in catalog - will be caught by existing validation
        continue;
      }

      if (!enabledModuleIds.has(catalogEntry.moduleId)) {
        invalidPerms.push(p);
      }
    }

    return {
      valid: invalidPerms.length === 0,
      invalidPerms,
    };
  }
}
