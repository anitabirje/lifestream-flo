/**
 * Access Control model
 * Defines permissions for family members
 */

export interface AccessControl {
  familyMemberId: string;
  canViewCalendar: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canManageSources: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
}

/**
 * Get default permissions based on user role
 */
export function getDefaultPermissions(role: 'admin' | 'member'): AccessControl {
  if (role === 'admin') {
    return {
      familyMemberId: '',
      canViewCalendar: true,
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: true,
      canManageSources: true,
      canManageUsers: true,
      canViewAnalytics: true,
    };
  }

  // Default member permissions
  return {
    familyMemberId: '',
    canViewCalendar: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: false,
    canManageSources: false,
    canManageUsers: false,
    canViewAnalytics: true,
  };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  accessControl: AccessControl,
  permission: keyof Omit<AccessControl, 'familyMemberId'>
): boolean {
  return accessControl[permission] === true;
}
