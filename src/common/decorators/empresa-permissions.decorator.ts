import { SetMetadata } from '@nestjs/common';

export const EMPRESA_PERMISSIONS_KEY = 'empresa_permissions';

export const EmpresaPermissions = (...permissions: string[]) =>
  SetMetadata(EMPRESA_PERMISSIONS_KEY, permissions);
