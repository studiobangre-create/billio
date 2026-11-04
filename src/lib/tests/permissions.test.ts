import { describe, expect, it } from 'vitest';
import { canDelete, canManageOrg, canPost, canWrite, toUserRole } from '@/lib/permissions';

describe('toUserRole', () => {
  it('shows the owner as admin', () => expect(toUserRole('owner')).toBe('admin'));
  it('keeps known roles', () => {
    for (const r of ['admin', 'accountant', 'member', 'observer'] as const) expect(toUserRole(r)).toBe(r);
  });
  it('gives unknown or missing roles read-only access', () => {
    expect(toUserRole('superuser')).toBe('observer');
    expect(toUserRole(undefined)).toBe('observer');
    expect(toUserRole(null)).toBe('observer');
  });
});

describe('role permissions (match supabase/migrations/20261103_role_permissions.sql)', () => {
  const matrix = {
    admin:      { write: true,  del: true,  post: true,  org: true  },
    accountant: { write: true,  del: false, post: true,  org: false },
    member:     { write: true,  del: false, post: false, org: false },
    observer:   { write: false, del: false, post: false, org: false },
  } as const;
  for (const [role, want] of Object.entries(matrix)) {
    it(role, () => {
      const r = role as keyof typeof matrix;
      expect({ write: canWrite(r), del: canDelete(r), post: canPost(r), org: canManageOrg(r) }).toEqual(want);
    });
  }
});
