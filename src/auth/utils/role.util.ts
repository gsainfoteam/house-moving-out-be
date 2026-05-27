import { Role } from 'generated/prisma/client';

export function isAdminRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPERADMIN;
}
