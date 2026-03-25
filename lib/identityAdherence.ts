import type { HabitWeeklyStats } from './habits';
import type { IdentityStatement } from './types';

export interface IdentityGroup {
  identity: IdentityStatement | null;
  stats: HabitWeeklyStats[];
  completedTotal: number;
  targetTotal: number;
  adherencePercent: number;
}

const STATUS_ORDER: Record<string, number> = {
  behind: 0,
  missed: 1,
  on_track: 2,
  met: 3,
};

function sortByStatus(a: HabitWeeklyStats, b: HabitWeeklyStats): number {
  return (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2);
}

export function groupStatsByIdentity(
  stats: HabitWeeklyStats[],
  identities: IdentityStatement[],
): IdentityGroup[] {
  if (identities.length === 0) {
    return [];
  }

  const identityMap = new Map<string, IdentityStatement>();
  for (const identity of identities) {
    identityMap.set(identity.id, identity);
  }

  const grouped = new Map<string | null, HabitWeeklyStats[]>();

  for (const stat of stats) {
    const key = stat.habit.identity_statement_id ?? null;
    if (key && !identityMap.has(key)) {
      // Identity not found (deleted?), treat as ungrouped
      const arr = grouped.get(null) ?? [];
      arr.push(stat);
      grouped.set(null, arr);
    } else {
      const arr = grouped.get(key) ?? [];
      arr.push(stat);
      grouped.set(key, arr);
    }
  }

  const groups: IdentityGroup[] = [];

  // Identity groups in sort_order
  const sortedIdentities = [...identities].sort((a, b) => a.sort_order - b.sort_order);
  for (const identity of sortedIdentities) {
    const groupStats = grouped.get(identity.id) ?? [];
    groupStats.sort(sortByStatus);
    const completedTotal = groupStats.reduce((sum, s) => sum + s.completedDays, 0);
    const targetTotal = groupStats.reduce((sum, s) => sum + s.targetDays, 0);
    groups.push({
      identity,
      stats: groupStats,
      completedTotal,
      targetTotal,
      adherencePercent: targetTotal > 0 ? Math.min(100, Math.round((completedTotal / targetTotal) * 100)) : 0,
    });
  }

  // Ungrouped last
  const ungrouped = grouped.get(null);
  if (ungrouped && ungrouped.length > 0) {
    ungrouped.sort(sortByStatus);
    const completedTotal = ungrouped.reduce((sum, s) => sum + s.completedDays, 0);
    const targetTotal = ungrouped.reduce((sum, s) => sum + s.targetDays, 0);
    groups.push({
      identity: null,
      stats: ungrouped,
      completedTotal,
      targetTotal,
      adherencePercent: targetTotal > 0 ? Math.min(100, Math.round((completedTotal / targetTotal) * 100)) : 0,
    });
  }

  return groups;
}
