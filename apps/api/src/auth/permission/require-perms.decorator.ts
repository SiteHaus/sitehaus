import { SetMetadata } from '@nestjs/common';
import { Permission } from '@site-haus/validation/core/perms';

export const REQ_PERMS_ALL = 'reqPermsAll';
export const REQ_PERMS_ANY = 'reqPermsAny';

export const RequirePerms = (...perms: Permission[]) =>
  SetMetadata(REQ_PERMS_ALL, perms);

export const RequireAnyPerm = (...perms: Permission[]) =>
  SetMetadata(REQ_PERMS_ANY, perms);
