import { SetMetadata } from '@nestjs/common';
import { Permission } from '@site-haus/validation/core/perms';

export const REQ_PERMS = 'req_perms';
export const RequirePerms = (...perms: Permission[]) =>
  SetMetadata(REQ_PERMS, perms);
