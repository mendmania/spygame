import type { WerewolfRole } from '@vbz/shared-types';

/**
 * Get role counts from an array of selected roles
 */
export function getRoleCounts(selectedRoles: WerewolfRole[]): Record<WerewolfRole, number> {
  const counts: Record<string, number> = {};
  for (const role of selectedRoles) {
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts as Record<WerewolfRole, number>;
}
