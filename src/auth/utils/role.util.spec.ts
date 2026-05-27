import { Role } from 'generated/prisma/client';
import { isAdminRole } from './role.util';

describe('isAdminRole', () => {
  it('returns true for ADMIN', () => {
    expect(isAdminRole(Role.ADMIN)).toBe(true);
  });

  it('returns true for SUPERADMIN', () => {
    expect(isAdminRole(Role.SUPERADMIN)).toBe(true);
  });

  it('returns false for USER', () => {
    expect(isAdminRole(Role.USER)).toBe(false);
  });
});
