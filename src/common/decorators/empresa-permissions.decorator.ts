import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '../constants/permissions.constant';

export const EMPRESA_PERMISSIONS_KEY = 'empresa_permissions';

export interface EmpresaPermissionMetadata {
  permissions: PermissionType[];
  empresaId?: number;
}

export const EmpresaPermissions = (metadata: EmpresaPermissionMetadata) =>
  SetMetadata(EMPRESA_PERMISSIONS_KEY, metadata);
